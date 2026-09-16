import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import String, Integer, Text, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class QuestionCategory(Base):
    __tablename__ = "questions_categories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    parent_id: Mapped[Optional[str]] = mapped_column(
        String(36), 
        ForeignKey("questions_categories.id", ondelete="CASCADE"), 
        nullable=True, 
        index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False, index=True)
    created_by: Mapped[Optional[str]] = mapped_column(
        String(36), 
        ForeignKey("admins.id", ondelete="SET NULL"), 
        nullable=True, 
        index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    parent: Mapped[Optional["QuestionCategory"]] = relationship(
        "QuestionCategory", 
        remote_side=[id], 
        back_populates="children"
    )
    children: Mapped[List["QuestionCategory"]] = relationship(
        "QuestionCategory", 
        back_populates="parent", 
        cascade="all, delete-orphan",
        order_by="QuestionCategory.sort_order"
    )
    questions: Mapped[List["Question"]] = relationship(
        "Question", 
        back_populates="category", 
        cascade="all, delete-orphan"
    )
    creator: Mapped[Optional["Admin"]] = relationship("Admin")

    __table_args__ = (
        Index("ix_questions_categories_parent_sort", "parent_id", "sort_order"),
    )

class Question(Base):
    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    category_id: Mapped[str] = mapped_column(
        String(36), 
        ForeignKey("questions_categories.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    question: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty: Mapped[str] = mapped_column(String(20), default="medium", nullable=False, index=True)
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(
        String(36), 
        ForeignKey("admins.id", ondelete="SET NULL"), 
        nullable=True, 
        index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    category: Mapped["QuestionCategory"] = relationship("QuestionCategory", back_populates="questions")
    options: Mapped[List["QuestionOption"]] = relationship(
        "QuestionOption", 
        back_populates="question", 
        cascade="all, delete-orphan", 
        order_by="QuestionOption.sort_order", 
        lazy="selectin"
    )
    creator: Mapped[Optional["Admin"]] = relationship("Admin")

    __table_args__ = (
        Index("ix_questions_category_difficulty", "category_id", "difficulty"),
        Index("ix_questions_created_at", "created_at"),
    )

class QuestionOption(Base):
    __tablename__ = "questions_options"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    question_id: Mapped[str] = mapped_column(
        String(36), 
        ForeignKey("questions.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    option_text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False, index=True)

    question: Mapped["Question"] = relationship("Question", back_populates="options")

    __table_args__ = (
        Index("ix_questions_options_question_sort", "question_id", "sort_order"),
        Index("ix_questions_options_question_correct", "question_id", "is_correct"),
    )
