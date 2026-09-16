from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel

class AuditLogResponse(BaseModel):
    id: str
    admin_id: Optional[str] = None
    admin_email: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    browser_name: str
    browser_version: str
    device_type: str
    os_name: str
    user_agent: str
    ip_address: str
    changes: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True

class LoginAttemptResponse(BaseModel):
    id: str
    admin_id: Optional[str] = None
    email: str
    ip_address: str
    browser_name: str
    browser_version: str
    device_type: str
    os_name: str
    user_agent: str
    success: bool
    failure_reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
