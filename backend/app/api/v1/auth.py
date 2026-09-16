from typing import List, Tuple
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import (
    get_db,
    get_client_meta,
    get_current_admin,
    get_current_admin_and_session,
)
from app.core.client_detector import ClientMeta
from app.core.security import verify_password, hash_password
from app.models.admin import Admin
from app.models.session import Session
from app.models.login_attempt import LoginAttempt
from app.models.audit_log import AuditLog
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    CurrentAdminResponse,
    ProfileUpdateRequest,
    ChangePasswordRequest,
)
from app.schemas.session import SessionResponse
from app.schemas.audit import AuditLogResponse, LoginAttemptResponse
from app.schemas.response import ApiResponse, PaginatedResponse, PaginatedMeta
from app.services.auth_service import AuthService
from app.services.audit_service import AuditService, calculate_row_diff

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=ApiResponse[LoginResponse])
async def login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
    client_meta: ClientMeta = Depends(get_client_meta),
):
    token, session_obj, admin_obj = await AuthService.login_admin(
        db=db,
        email=payload.email,
        password=payload.password,
        client_meta=client_meta,
    )

    session_data = SessionResponse.model_validate(session_obj)
    session_data.is_current = True

    response_data = LoginResponse(
        token=token,
        token_type="Bearer",
        expires_at=session_obj.expires_at,
        admin=admin_obj,
        session=session_data,
    )

    return ApiResponse(
        success=True,
        message="Login successful",
        data=response_data,
    )

@router.get("/me", response_model=ApiResponse[CurrentAdminResponse])
async def get_me(
    admin_and_session: Tuple[Admin, Session] = Depends(get_current_admin_and_session),
):
    admin, current_session = admin_and_session
    sess_res = SessionResponse.model_validate(current_session)
    sess_res.is_current = True
    
    return ApiResponse(
        success=True,
        message="Current admin profile retrieved",
        data=CurrentAdminResponse(
            admin=admin,
            current_session=sess_res,
        ),
    )

@router.put("/me", response_model=ApiResponse[CurrentAdminResponse])
async def update_me(
    payload: ProfileUpdateRequest,
    admin_and_session: Tuple[Admin, Session] = Depends(get_current_admin_and_session),
    db: AsyncSession = Depends(get_db),
    client_meta: ClientMeta = Depends(get_client_meta),
):
    admin, current_session = admin_and_session
    new_email = payload.email.lower().strip()
    
    if new_email != admin.email:
        existing = await db.execute(
            select(Admin).where(Admin.email == new_email, Admin.id != admin.id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An admin with this email address already exists",
            )

    old_state = {
        "name": admin.name,
        "email": admin.email,
    }
    new_state = {
        "name": payload.name.strip(),
        "email": new_email,
    }

    diff = calculate_row_diff(old_state, new_state)

    admin.name = payload.name.strip()
    admin.email = new_email

    if diff:
        await AuditService.log_event(
            db=db,
            action="ADMIN.PROFILE_UPDATE",
            entity_type="admin",
            entity_id=admin.id,
            client_meta=client_meta,
            admin_id=admin.id,
            admin_email=admin.email,
            changes=diff,
            metadata={"updated_self": True},
        )

    await db.commit()
    await db.refresh(admin)

    sess_res = SessionResponse.model_validate(current_session)
    sess_res.is_current = True

    return ApiResponse(
        success=True,
        message="Profile updated successfully",
        data=CurrentAdminResponse(
            admin=admin,
            current_session=sess_res,
        ),
    )

@router.post("/change-password", response_model=ApiResponse[dict])
async def change_password(
    payload: ChangePasswordRequest,
    admin_and_session: Tuple[Admin, Session] = Depends(get_current_admin_and_session),
    db: AsyncSession = Depends(get_db),
    client_meta: ClientMeta = Depends(get_client_meta),
):
    admin, current_session = admin_and_session

    if not verify_password(payload.current_password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    admin.password_hash = hash_password(payload.new_password)

    await AuditService.log_event(
        db=db,
        action="ADMIN.PASSWORD_CHANGE",
        entity_type="admin",
        entity_id=admin.id,
        client_meta=client_meta,
        admin_id=admin.id,
        admin_email=admin.email,
        metadata={"changed_by_self": True},
    )

    await db.commit()

    return ApiResponse(
        success=True,
        message="Password changed successfully",
        data={"updated": True},
    )

@router.post("/logout", response_model=ApiResponse[dict])
async def logout(
    admin_and_session: Tuple[Admin, Session] = Depends(get_current_admin_and_session),
    db: AsyncSession = Depends(get_db),
    client_meta: ClientMeta = Depends(get_client_meta),
):
    admin, current_session = admin_and_session
    await AuthService.revoke_session(
        db=db,
        session_id=current_session.id,
        current_admin_id=admin.id,
        client_meta=client_meta,
    )
    return ApiResponse(
        success=True,
        message="Logged out successfully",
        data={"session_id": current_session.id},
    )

@router.post("/logout-all", response_model=ApiResponse[dict])
async def logout_all(
    admin_and_session: Tuple[Admin, Session] = Depends(get_current_admin_and_session),
    db: AsyncSession = Depends(get_db),
    client_meta: ClientMeta = Depends(get_client_meta),
    keep_current: bool = Query(False),
):
    admin, current_session = admin_and_session
    except_id = current_session.id if keep_current else None

    count = await AuthService.revoke_all_sessions(
        db=db,
        admin_id=admin.id,
        client_meta=client_meta,
        except_session_id=except_id,
    )
    return ApiResponse(
        success=True,
        message=f"Revoked {count} active session(s)",
        data={"revoked_count": count},
    )

@router.get("/sessions", response_model=ApiResponse[List[SessionResponse]])
async def list_sessions(
    admin_and_session: Tuple[Admin, Session] = Depends(get_current_admin_and_session),
    db: AsyncSession = Depends(get_db),
):
    admin, current_session = admin_and_session
    query = (
        select(Session)
        .where(Session.admin_id == admin.id)
        .order_by(desc(Session.created_at))
        .limit(50)
    )
    result = await db.execute(query)
    sessions = result.scalars().all()

    session_list: List[SessionResponse] = []
    for s in sessions:
        item = SessionResponse.model_validate(s)
        item.is_current = (s.id == current_session.id)
        session_list.append(item)

    return ApiResponse(
        success=True,
        message="Sessions retrieved",
        data=session_list,
    )

@router.delete("/sessions/{session_id}", response_model=ApiResponse[dict])
async def revoke_specific_session(
    session_id: str,
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    client_meta: ClientMeta = Depends(get_client_meta),
):
    await AuthService.revoke_session(
        db=db,
        session_id=session_id,
        current_admin_id=admin.id,
        client_meta=client_meta,
    )
    return ApiResponse(
        success=True,
        message="Target session terminated successfully",
        data={"session_id": session_id},
    )

@router.get("/audit-logs", response_model=PaginatedResponse[AuditLogResponse])
async def get_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    action: str = Query(None),
    entity_type: str = Query(None),
    admin_id: str = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    query = select(AuditLog)
    if action:
        query = query.where(AuditLog.action == action)
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    if admin_id:
        query = query.where(AuditLog.admin_id == admin_id)

    count_res = await db.execute(query)
    all_items = count_res.scalars().all()
    total_count = len(all_items)

    offset = (page - 1) * page_size
    query = query.order_by(desc(AuditLog.created_at)).offset(offset).limit(page_size)
    paginated_res = await db.execute(query)
    logs = paginated_res.scalars().all()

    total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 1

    return PaginatedResponse(
        success=True,
        data=[AuditLogResponse.model_validate(log) for log in logs],
        meta=PaginatedMeta(
            page=page,
            page_size=page_size,
            total_count=total_count,
            total_pages=total_pages,
        ),
    )

@router.get("/login-attempts", response_model=PaginatedResponse[LoginAttemptResponse])
async def get_login_attempts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    query = select(LoginAttempt)
    count_res = await db.execute(query)
    total_count = len(count_res.scalars().all())

    offset = (page - 1) * page_size
    query = query.order_by(desc(LoginAttempt.created_at)).offset(offset).limit(page_size)
    paginated_res = await db.execute(query)
    attempts = paginated_res.scalars().all()

    total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 1

    return PaginatedResponse(
        success=True,
        data=[LoginAttemptResponse.model_validate(att) for att in attempts],
        meta=PaginatedMeta(
            page=page,
            page_size=page_size,
            total_count=total_count,
            total_pages=total_pages,
        ),
    )
