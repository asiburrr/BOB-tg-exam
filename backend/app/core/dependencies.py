from typing import Tuple, Callable
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db_session
from app.core.client_detector import ClientMeta, parse_client_meta
from app.models.admin import Admin
from app.models.session import Session
from app.services.auth_service import AuthService

security_scheme = HTTPBearer(auto_error=True)

async def get_db() -> AsyncSession:
    async for session in get_db_session():
        yield session

async def get_client_meta(request: Request) -> ClientMeta:
    return parse_client_meta(request)

async def get_current_admin_and_session(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> Tuple[Admin, Session]:
    token = credentials.credentials
    admin, session = await AuthService.validate_session(db=db, raw_token=token)
    return admin, session

async def get_current_admin(
    admin_and_session: Tuple[Admin, Session] = Depends(get_current_admin_and_session),
) -> Admin:
    return admin_and_session[0]

async def get_current_session(
    admin_and_session: Tuple[Admin, Session] = Depends(get_current_admin_and_session),
) -> Session:
    return admin_and_session[1]

def require_roles(*allowed_roles: str) -> Callable:
    async def role_checker(admin: Admin = Depends(get_current_admin)) -> Admin:
        if admin.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action requires one of the following roles: {', '.join(allowed_roles)}",
            )
        return admin
    return role_checker

def require_permission(permission_key: str) -> Callable:
    async def permission_checker(admin: Admin = Depends(get_current_admin)) -> Admin:
        if admin.role == "Administration":
            return admin
        user_keys = {p.permission_key for p in admin.permissions}
        if permission_key not in user_keys:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: Missing required permission '{permission_key}'",
            )
        return admin
    return permission_checker
