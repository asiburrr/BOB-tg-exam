from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from app.schemas.admin import AdminResponse
from app.schemas.session import SessionResponse

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)

class LoginResponse(BaseModel):
    token: str
    token_type: str = "Bearer"
    expires_at: datetime
    admin: AdminResponse
    session: SessionResponse

class CurrentAdminResponse(BaseModel):
    admin: AdminResponse
    current_session: SessionResponse

class ProfileUpdateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6, max_length=128)
