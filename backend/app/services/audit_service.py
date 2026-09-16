from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit_log import AuditLog
from app.core.client_detector import ClientMeta

SENSITIVE_FIELDS = {"password", "password_hash", "token", "token_hash", "secret"}

def calculate_row_diff(
    old_data: Dict[str, Any], 
    new_data: Dict[str, Any]
) -> Dict[str, Dict[str, Any]]:
    diff: Dict[str, Dict[str, Any]] = {}
    
    for key, new_val in new_data.items():
        if key in old_data:
            old_val = old_data[key]
            
            if isinstance(old_val, datetime):
                old_val = old_val.isoformat()
            if isinstance(new_val, datetime):
                new_val = new_val.isoformat()

            if old_val != new_val:
                if key.lower() in SENSITIVE_FIELDS:
                    diff[key] = {"old": "[PROTECTED]", "new": "[PROTECTED]"}
                else:
                    diff[key] = {"old": old_val, "new": new_val}
                    
    return diff

class AuditService:
    @staticmethod
    async def log_event(
        db: AsyncSession,
        action: str,
        entity_type: str,
        entity_id: Optional[str],
        client_meta: ClientMeta,
        admin_id: Optional[str] = None,
        admin_email: Optional[str] = None,
        changes: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        audit_entry = AuditLog(
            admin_id=admin_id,
            admin_email=admin_email,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id else None,
            browser_name=client_meta.browser_name,
            browser_version=client_meta.browser_version,
            device_type=client_meta.device_type,
            os_name=client_meta.os_name,
            user_agent=client_meta.user_agent,
            ip_address=client_meta.ip_address,
            changes=changes,
            metadata_=metadata,
            created_at=datetime.now(timezone.utc),
        )
        db.add(audit_entry)
        await db.flush()
        return audit_entry
