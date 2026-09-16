from typing import List, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, desc, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import (
    get_db,
    get_client_meta,
    get_current_admin,
    require_roles,
)
from app.core.security import hash_password
from app.core.client_detector import ClientMeta
from app.core.permissions import ALL_PERMISSIONS
from app.models.admin import Admin
from app.models.permission import UserPermission
from app.schemas.admin import AdminCreate, AdminUpdate, AdminResponse, AdminPermissionsUpdate
from app.schemas.response import ApiResponse, PaginatedResponse, PaginatedMeta
from app.services.audit_service import AuditService, calculate_row_diff

router = APIRouter(prefix="/admins", tags=["Admin Management"])

@router.get("/permissions/all", response_model=ApiResponse[List[Dict[str, str]]])
async def get_all_system_permissions(
    current_admin: Admin = Depends(get_current_admin),
):
    return ApiResponse(
        success=True,
        message="All system permissions retrieved",
        data=ALL_PERMISSIONS,
    )

@router.get("", response_model=PaginatedResponse[AdminResponse])
async def list_admins(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_roles("Administration", "Admin")),
):
    query = select(Admin)
    count_res = await db.execute(query)
    total_count = len(count_res.scalars().all())

    offset = (page - 1) * page_size
    paginated_res = await db.execute(
        query.order_by(desc(Admin.created_at)).offset(offset).limit(page_size)
    )
    admins = paginated_res.scalars().all()
    total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 1

    return PaginatedResponse(
        success=True,
        data=[AdminResponse.model_validate(adm) for adm in admins],
        meta=PaginatedMeta(
            page=page,
            page_size=page_size,
            total_count=total_count,
            total_pages=total_pages,
        ),
    )

@router.post("", response_model=ApiResponse[AdminResponse], status_code=status.HTTP_201_CREATED)
async def create_admin(
    payload: AdminCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_roles("Administration")),
    client_meta: ClientMeta = Depends(get_client_meta),
):
    existing = await db.execute(select(Admin).where(Admin.email == payload.email.lower().strip()))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An admin with this email address already exists",
        )

    new_admin = Admin(
        name=payload.name,
        email=payload.email.lower().strip(),
        role=payload.role,
        password_hash=hash_password(payload.password),
        status=payload.status,
    )
    db.add(new_admin)
    await db.flush()

    if payload.permissions:
        for perm_key in payload.permissions:
            perm = UserPermission(admin_id=new_admin.id, permission_key=perm_key)
            db.add(perm)

    await AuditService.log_event(
        db=db,
        action="ADMIN.CREATE",
        entity_type="admin",
        entity_id=new_admin.id,
        client_meta=client_meta,
        admin_id=current_admin.id,
        admin_email=current_admin.email,
        metadata={
            "created_admin_email": new_admin.email, 
            "role": new_admin.role,
            "permissions": payload.permissions,
        },
    )
    await db.commit()
    await db.refresh(new_admin)

    return ApiResponse(
        success=True,
        message="Admin created successfully",
        data=AdminResponse.model_validate(new_admin),
    )

@router.get("/{admin_id}", response_model=ApiResponse[AdminResponse])
async def get_admin_detail(
    admin_id: str,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_roles("Administration", "Admin")),
):
    result = await db.execute(select(Admin).where(Admin.id == admin_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")
    return ApiResponse(success=True, data=AdminResponse.model_validate(target))

@router.put("/{admin_id}", response_model=ApiResponse[AdminResponse])
async def update_admin(
    admin_id: str,
    payload: AdminUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_roles("Administration")),
    client_meta: ClientMeta = Depends(get_client_meta),
):
    result = await db.execute(select(Admin).where(Admin.id == admin_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")

    old_state = {
        "name": target.name,
        "email": target.email,
        "role": target.role,
        "status": target.status,
    }

    if current_admin.id == target.id:
        if "role" in update_dict and update_dict["role"] != target.role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot change your own role",
            )
        if "status" in update_dict and update_dict["status"] != target.status:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot change your own account status",
            )

    if "name" in update_dict:
        target.name = update_dict["name"]
    if "email" in update_dict and update_dict["email"]:
        target.email = update_dict["email"].lower().strip()
    if "role" in update_dict and update_dict["role"]:
        target.role = update_dict["role"]
    if "status" in update_dict and update_dict["status"]:
        target.status = update_dict["status"]
    if "password" in update_dict and update_dict["password"]:
        target.password_hash = hash_password(update_dict["password"])
        old_state["password"] = "[PROTECTED]"
        update_dict["password"] = "[PROTECTED]"

    if "permissions" in update_dict and update_dict["permissions"] is not None:
        current_perms = {p.permission_key for p in target.permissions}
        new_perms = set(update_dict["permissions"])
        old_state["permissions"] = sorted(list(current_perms))
        
        await db.execute(delete(UserPermission).where(UserPermission.admin_id == target.id))
        for p_key in new_perms:
            db.add(UserPermission(admin_id=target.id, permission_key=p_key))

    new_state = {
        "name": target.name,
        "email": target.email,
        "role": target.role,
        "status": target.status,
    }
    if "password" in update_dict:
        new_state["password"] = "[PROTECTED]"
    if "permissions" in update_dict and update_dict["permissions"] is not None:
        new_state["permissions"] = sorted(list(set(update_dict["permissions"])))

    diff = calculate_row_diff(old_state, new_state)

    if diff:
        await AuditService.log_event(
            db=db,
            action="ADMIN.UPDATE",
            entity_type="admin",
            entity_id=target.id,
            client_meta=client_meta,
            admin_id=current_admin.id,
            admin_email=current_admin.email,
            changes=diff,
            metadata={"updated_admin_email": target.email},
        )

    await db.commit()
    await db.refresh(target)

    return ApiResponse(
        success=True,
        message="Admin updated successfully with change audit recorded",
        data=AdminResponse.model_validate(target),
    )

@router.put("/{admin_id}/permissions", response_model=ApiResponse[AdminResponse])
async def update_admin_permissions(
    admin_id: str,
    payload: AdminPermissionsUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_roles("Administration")),
    client_meta: ClientMeta = Depends(get_client_meta),
):
    result = await db.execute(select(Admin).where(Admin.id == admin_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")

    current_keys = sorted([p.permission_key for p in target.permissions])
    new_keys = sorted(list(set(payload.permissions)))

    old_state = {"permissions": current_keys}
    new_state = {"permissions": new_keys}

    await db.execute(delete(UserPermission).where(UserPermission.admin_id == target.id))
    for p_key in new_keys:
        db.add(UserPermission(admin_id=target.id, permission_key=p_key))

    diff = calculate_row_diff(old_state, new_state)
    if diff:
        await AuditService.log_event(
            db=db,
            action="ADMIN.PERMISSIONS_UPDATE",
            entity_type="admin",
            entity_id=target.id,
            client_meta=client_meta,
            admin_id=current_admin.id,
            admin_email=current_admin.email,
            changes=diff,
            metadata={"updated_admin_email": target.email},
        )

    await db.commit()
    await db.refresh(target)

    return ApiResponse(
        success=True,
        message="Permissions updated successfully",
        data=AdminResponse.model_validate(target),
    )
