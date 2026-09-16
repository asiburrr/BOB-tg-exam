from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.security import verify_password, generate_session_token, hash_token
from app.core.client_detector import ClientMeta
from app.models.admin import Admin
from app.models.session import Session
from app.models.login_attempt import LoginAttempt
from app.services.audit_service import AuditService

def ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt

class AuthService:
    @staticmethod
    async def record_login_attempt(
        db: AsyncSession,
        email: str,
        client_meta: ClientMeta,
        success: bool,
        admin_id: Optional[str] = None,
        failure_reason: Optional[str] = None,
    ) -> LoginAttempt:
        attempt = LoginAttempt(
            admin_id=admin_id,
            email=email.lower().strip(),
            ip_address=client_meta.ip_address,
            browser_name=client_meta.browser_name,
            browser_version=client_meta.browser_version,
            device_type=client_meta.device_type,
            os_name=client_meta.os_name,
            user_agent=client_meta.user_agent,
            success=success,
            failure_reason=failure_reason,
            created_at=datetime.now(timezone.utc),
        )
        db.add(attempt)
        await db.flush()
        return attempt

    @staticmethod
    async def login_admin(
        db: AsyncSession,
        email: str,
        password: str,
        client_meta: ClientMeta,
    ) -> Tuple[str, Session, Admin]:
        now = datetime.now(timezone.utc)
        normalized_email = email.lower().strip()

        result = await db.execute(select(Admin).where(Admin.email == normalized_email))
        admin = result.scalar_one_or_none()

        if not admin:
            await AuthService.record_login_attempt(
                db=db,
                email=normalized_email,
                client_meta=client_meta,
                success=False,
                failure_reason="ACCOUNT_NOT_FOUND",
            )
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        locked_until_utc = ensure_utc(admin.locked_until)
        if locked_until_utc and locked_until_utc > now:
            remaining_mins = int((locked_until_utc - now).total_seconds() // 60) + 1
            await AuthService.record_login_attempt(
                db=db,
                email=normalized_email,
                admin_id=admin.id,
                client_meta=client_meta,
                success=False,
                failure_reason="ACCOUNT_LOCKED",
            )
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account is temporarily locked due to repeated failed logins. Please try again in {remaining_mins} minute(s).",
            )

        if admin.status != "active":
            await AuthService.record_login_attempt(
                db=db,
                email=normalized_email,
                admin_id=admin.id,
                client_meta=client_meta,
                success=False,
                failure_reason=f"ACCOUNT_STATUS_{admin.status.upper()}",
            )
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account is {admin.status}. Please contact system support.",
            )

        is_password_valid = verify_password(password, admin.password_hash)
        if not is_password_valid:
            admin.failed_login_attempts += 1
            reason = "INVALID_PASSWORD"
            
            if admin.failed_login_attempts >= settings.MAX_LOGIN_ATTEMPTS:
                admin.locked_until = now + timedelta(minutes=settings.ACCOUNT_LOCKOUT_MINUTES)
                reason = "LOCKOUT_TRIGGERED"

            await AuthService.record_login_attempt(
                db=db,
                email=normalized_email,
                admin_id=admin.id,
                client_meta=client_meta,
                success=False,
                failure_reason=reason,
            )
            await db.commit()
            
            if reason == "LOCKOUT_TRIGGERED":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Too many failed login attempts. Account is locked for {settings.ACCOUNT_LOCKOUT_MINUTES} minutes.",
                )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        admin.failed_login_attempts = 0
        admin.locked_until = None
        admin.last_login_at = now
        admin.last_login_ip = client_meta.ip_address

        await AuthService.record_login_attempt(
            db=db,
            email=normalized_email,
            admin_id=admin.id,
            client_meta=client_meta,
            success=True,
        )

        raw_token = generate_session_token()
        token_hash_val = hash_token(raw_token)
        session_expires = now + timedelta(days=settings.SESSION_EXPIRE_DAYS)

        new_session = Session(
            admin_id=admin.id,
            token_hash=token_hash_val,
            ip_address=client_meta.ip_address,
            browser_name=client_meta.browser_name,
            browser_version=client_meta.browser_version,
            device_type=client_meta.device_type,
            os_name=client_meta.os_name,
            user_agent=client_meta.user_agent,
            expires_at=session_expires,
            last_activity_at=now,
            created_at=now,
        )
        db.add(new_session)
        await db.flush()

        await AuditService.log_event(
            db=db,
            action="AUTH.LOGIN_SUCCESS",
            entity_type="session",
            entity_id=new_session.id,
            client_meta=client_meta,
            admin_id=admin.id,
            admin_email=admin.email,
            metadata={
                "session_id": new_session.id,
                "login_method": "password",
            },
        )

        await db.commit()
        await db.refresh(admin)
        await db.refresh(new_session)

        return raw_token, new_session, admin

    @staticmethod
    async def validate_session(
        db: AsyncSession,
        raw_token: str,
    ) -> Tuple[Admin, Session]:
        token_hash_val = hash_token(raw_token)
        now = datetime.now(timezone.utc)

        result = await db.execute(
            select(Session, Admin)
            .join(Admin, Session.admin_id == Admin.id)
            .where(Session.token_hash == token_hash_val)
        )
        row = result.first()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired session",
            )

        session_obj, admin_obj = row

        if session_obj.revoked_at is not None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has been revoked",
            )

        expires_at_utc = ensure_utc(session_obj.expires_at)
        if expires_at_utc and expires_at_utc <= now:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has expired",
            )

        if admin_obj.status != "active":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin account is inactive",
            )

        session_obj.last_activity_at = now
        await db.commit()

        return admin_obj, session_obj

    @staticmethod
    async def revoke_session(
        db: AsyncSession,
        session_id: str,
        current_admin_id: str,
        client_meta: ClientMeta,
    ) -> bool:
        now = datetime.now(timezone.utc)
        result = await db.execute(
            select(Session).where(
                Session.id == session_id,
                Session.admin_id == current_admin_id,
            )
        )
        session_obj = result.scalar_one_or_none()
        if not session_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found",
            )

        if session_obj.revoked_at is None:
            session_obj.revoked_at = now
            await AuditService.log_event(
                db=db,
                action="AUTH.SESSION_REVOKED",
                entity_type="session",
                entity_id=session_id,
                client_meta=client_meta,
                admin_id=current_admin_id,
                metadata={"revoked_session_id": session_id},
            )
            await db.commit()

        return True

    @staticmethod
    async def revoke_all_sessions(
        db: AsyncSession,
        admin_id: str,
        client_meta: ClientMeta,
        except_session_id: Optional[str] = None,
    ) -> int:
        now = datetime.now(timezone.utc)
        query = (
            update(Session)
            .where(
                Session.admin_id == admin_id,
                Session.revoked_at.is_(None),
            )
        )
        if except_session_id:
            query = query.where(Session.id != except_session_id)

        query = query.values(revoked_at=now)
        result = await db.execute(query)
        revoked_count = result.rowcount

        await AuditService.log_event(
            db=db,
            action="AUTH.REVOKE_ALL_SESSIONS",
            entity_type="admin",
            entity_id=admin_id,
            client_meta=client_meta,
            admin_id=admin_id,
            metadata={"revoked_count": revoked_count},
        )
        await db.commit()
        return revoked_count
