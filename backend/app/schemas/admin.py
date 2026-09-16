from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, field_validator

class AdminBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    role: str = Field(default="Admin", max_length=50)
    status: str = Field(default="active", max_length=20)

class AdminCreate(AdminBase):
    password: str = Field(..., min_length=8, max_length=100)
    permissions: List[str] = Field(default_factory=list)

class AdminUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    status: Optional[str] = None
    password: Optional[str] = Field(None, min_length=8, max_length=100)
    permissions: Optional[List[str]] = None

class AdminPermissionsUpdate(BaseModel):
    permissions: List[str]

class AdminResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    status: str
    permissions: List[str] = Field(default_factory=list)
    failed_login_attempts: int
    locked_until: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
    last_login_ip: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    @field_validator("permissions", mode="before")
    @classmethod
    def convert_permissions(cls, v):
        if not v:
            return []
        if isinstance(v, list) and v and hasattr(v[0], "permission_key"):
            return [item.permission_key for item in v]
        return v

    class Config:
        from_attributes = True
