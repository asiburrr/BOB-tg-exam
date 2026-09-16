from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class SessionResponse(BaseModel):
    id: str
    admin_id: str
    ip_address: str
    browser_name: str
    browser_version: str
    device_type: str
    os_name: str
    user_agent: str
    expires_at: datetime
    last_activity_at: datetime
    revoked_at: Optional[datetime] = None
    created_at: datetime
    is_active: bool
    is_current: bool = False

    class Config:
        from_attributes = True
