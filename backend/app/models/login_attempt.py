import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class LoginAttempt(Base):
    __tablename__ = "admins_login_attempts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    admin_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("admins.id", ondelete="SET NULL"), nullable=True, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False, index=True)
    browser_name: Mapped[str] = mapped_column(String(50), nullable=False)
    browser_version: Mapped[str] = mapped_column(String(50), nullable=False)
    device_type: Mapped[str] = mapped_column(String(50), nullable=False)
    os_name: Mapped[str] = mapped_column(String(50), default="Unknown", nullable=False)
    user_agent: Mapped[Text] = mapped_column(Text, nullable=False)
    success: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    failure_reason: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    admin: Mapped[Optional["Admin"]] = relationship("Admin", back_populates="login_attempts")

    __table_args__ = (
        Index("ix_admins_login_attempts_ip_time", "ip_address", "created_at"),
        Index("ix_admins_login_attempts_email_time", "email", "created_at"),
    )
