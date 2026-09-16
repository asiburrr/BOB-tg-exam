import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select, delete
from app.db.session import AsyncSessionLocal, init_db_and_tables
from app.models.admin import Admin
from app.models.permission import UserPermission
from app.models.audit_log import AuditLog
from app.core.client_detector import ClientMeta
from app.services.audit_service import AuditService, calculate_row_diff

async def run_tests():
    await init_db_and_tables()

    desktop_client = ClientMeta(
        ip_address="192.168.1.50",
        browser_name="Chrome",
        browser_version="128.0.6613.85",
        device_type="Desktop",
        os_name="Windows 11",
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    )

    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Admin).where(Admin.email == "admin@bobexam.com"))
        admin = res.scalar_one_or_none()
        assert admin is not None

        await db.execute(delete(UserPermission).where(UserPermission.admin_id == admin.id))
        
        perm1 = UserPermission(admin_id=admin.id, permission_key="dashboard:view")
        perm2 = UserPermission(admin_id=admin.id, permission_key="expense:view")
        db.add_all([perm1, perm2])

        diff = calculate_row_diff({"permissions": []}, {"permissions": ["dashboard:view", "expense:view"]})
        await AuditService.log_event(
            db=db,
            action="ADMIN.PERMISSIONS_UPDATE",
            entity_type="admin",
            entity_id=admin.id,
            client_meta=desktop_client,
            admin_id=admin.id,
            admin_email=admin.email,
            changes=diff,
        )
        await db.commit()

    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Admin).where(Admin.email == "admin@bobexam.com"))
        admin_refreshed = res.scalar_one()
        keys = [p.permission_key for p in admin_refreshed.permissions]
        assert "dashboard:view" in keys
        assert "expense:view" in keys

        res_audit = await db.execute(select(AuditLog).where(AuditLog.action == "ADMIN.PERMISSIONS_UPDATE"))
        audit_entry = res_audit.scalars().first()
        assert audit_entry is not None
        assert "dashboard:view" in audit_entry.changes["permissions"]["new"]

    print("bob_tg_exam test: ALL PERMISSION CHECKS PASSED")

if __name__ == "__main__":
    asyncio.run(run_tests())
