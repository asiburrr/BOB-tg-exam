import uuid
from sqlalchemy import String, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

class UserPermission(Base):
    __tablename__ = "admins_permissions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    admin_id: Mapped[str] = mapped_column(String(36), ForeignKey("admins.id", ondelete="CASCADE"), nullable=False, index=True)
    permission_key: Mapped[str] = mapped_column(String(100), nullable=False, index=True)

    admin: Mapped["Admin"] = relationship("Admin", back_populates="permissions")

    __table_args__ = (
        Index("ix_admins_permissions_admin_key", "admin_id", "permission_key", unique=True),
    )
