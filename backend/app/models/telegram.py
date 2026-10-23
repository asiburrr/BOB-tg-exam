from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import String, Integer, BigInteger, Text, Boolean, DateTime, ForeignKey, Index, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class TelegramUser(Base):
    __tablename__ = "telegram_users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    telegram_id: Mapped[int] = mapped_column(BigInteger, unique=True, nullable=False, index=True)
    username: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    last_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone_number: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_vip: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    current_flow_node_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("telegram_flow_nodes.id", ondelete="SET NULL"), nullable=True)
    flow_state: Mapped[str] = mapped_column(String(50), default="idle", nullable=False)
    profile_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    last_message_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    last_active_session_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    last_exam_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    quota_window_start: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    exams_in_quota_window: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    sessions: Mapped[List["ExamSession"]] = relationship("ExamSession", back_populates="user", cascade="all, delete-orphan")

class BotFlowNode(Base):
    __tablename__ = "telegram_flow_nodes"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    parent_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, 
        ForeignKey("telegram_flow_nodes.id", ondelete="CASCADE"), 
        nullable=True, 
        index=True
    )
    trigger_command: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    label: Mapped[str] = mapped_column(String(100), nullable=False)
    action_type: Mapped[str] = mapped_column(String(30), nullable=False, default="menu_nodes")
    content_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category_id: Mapped[Optional[str]] = mapped_column(
        String(36), 
        ForeignKey("questions_categories.id", ondelete="SET NULL"), 
        nullable=True, 
        index=True
    )
    picking_strategy: Mapped[str] = mapped_column(String(30), default="ask_user", nullable=False)
    question_count_mode: Mapped[str] = mapped_column(String(20), default="ask_user", nullable=False)
    fixed_count: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    difficulty_mode: Mapped[str] = mapped_column(String(20), default="ask_user", nullable=False)
    fixed_difficulty: Mapped[str] = mapped_column(String(20), default="mixed", nullable=False)
    scope_mode: Mapped[str] = mapped_column(String(30), default="ask_user", nullable=False)
    timer_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    negative_marking_rate: Mapped[float] = mapped_column(Numeric(4, 2), default=0.00, nullable=False)
    url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    row_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by: Mapped[Optional[str]] = mapped_column(
        String(36), 
        ForeignKey("admins.id", ondelete="SET NULL"), 
        nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    parent: Mapped[Optional["BotFlowNode"]] = relationship("BotFlowNode", remote_side=[id], back_populates="children")
    children: Mapped[List["BotFlowNode"]] = relationship(
        "BotFlowNode", 
        back_populates="parent", 
        cascade="all, delete-orphan", 
        order_by="BotFlowNode.sort_order"
    )

    __table_args__ = (
        Index("ix_telegram_flow_nodes_parent_sort", "parent_id", "row_index", "sort_order"),
    )

class BotSetting(Base):
    __tablename__ = "telegram_bot_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    bot_token: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    bot_username: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    webhook_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    webhook_secret: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_webhook_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    default_count_presets: Mapped[str] = mapped_column(Text, default="5,10,20,25,50", nullable=False)
    default_negative_marking: Mapped[float] = mapped_column(Numeric(4, 2), default=0.00, nullable=False)
    limit_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    limit_period: Mapped[str] = mapped_column(String(30), default="daily", nullable=False)
    max_exams_per_period: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    max_questions_per_period: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    custom_interval_hours: Mapped[int] = mapped_column(Integer, default=24, nullable=False)
    cooldown_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    cooldown_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    limit_reached_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    onboarding_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    onboarding_config: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    force_join_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    force_join_channels: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    force_join_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    group_access_mode: Mapped[str] = mapped_column(String(30), default="all_blocked", nullable=False)
    allowed_group_ids: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    group_commands_in_private: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    group_redirect_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(
        String(36), 
        ForeignKey("admins.id", ondelete="SET NULL"), 
        nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

class TelegramPromotion(Base):
    __tablename__ = "telegram_promotions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    promo_type: Mapped[str] = mapped_column(String(30), default="text", nullable=False)
    content_text: Mapped[str] = mapped_column(Text, nullable=False)
    media_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    button_text: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    button_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    trigger_event: Mapped[str] = mapped_column(String(50), default="after_exam", nullable=False, index=True)
    target_category_id: Mapped[Optional[str]] = mapped_column(
        String(36), 
        ForeignKey("questions_categories.id", ondelete="SET NULL"), 
        nullable=True, 
        index=True
    )
    priority: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    impressions_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    clicks_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_by: Mapped[Optional[str]] = mapped_column(
        String(36), 
        ForeignKey("admins.id", ondelete="SET NULL"), 
        nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    __table_args__ = (
        Index("ix_telegram_promotions_trigger", "trigger_event", "is_active", "priority"),
    )

class ExamSession(Base):
    __tablename__ = "telegram_exam_sessions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("telegram_users.id", ondelete="CASCADE"), nullable=False, index=True)
    chat_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    category_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("questions_categories.id", ondelete="SET NULL"), nullable=True, index=True)
    flow_node_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("telegram_flow_nodes.id", ondelete="SET NULL"), nullable=True)
    current_poll_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    current_poll_message_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    strategy_used: Mapped[str] = mapped_column(String(30), default="random_overall", nullable=False)
    difficulty: Mapped[str] = mapped_column(String(20), default="mixed", nullable=False)
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False)
    current_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    question_ids: Mapped[str] = mapped_column(Text, nullable=False)
    correct_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    wrong_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    skipped_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    score: Mapped[float] = mapped_column(Numeric(6, 2), default=0.00, nullable=False)
    max_score: Mapped[float] = mapped_column(Numeric(6, 2), default=0.00, nullable=False)
    accuracy_percentage: Mapped[float] = mapped_column(Numeric(5, 2), default=0.00, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="in_progress", nullable=False, index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["TelegramUser"] = relationship("TelegramUser", back_populates="sessions")
    answers: Mapped[List["ExamAnswer"]] = relationship("ExamAnswer", back_populates="session", cascade="all, delete-orphan")

class ExamAnswer(Base):
    __tablename__ = "telegram_exam_answers"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("telegram_exam_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id: Mapped[str] = mapped_column(String(36), ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)
    selected_option_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("questions_options.id", ondelete="SET NULL"), nullable=True)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    points_awarded: Mapped[float] = mapped_column(Numeric(4, 2), default=0.00, nullable=False)
    time_spent_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    answered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    session: Mapped["ExamSession"] = relationship("ExamSession", back_populates="answers")

class TelegramQuizTarget(Base):
    __tablename__ = "telegram_quiz_targets"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    chat_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    chat_type: Mapped[str] = mapped_column(String(30), default="channel", nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("admins.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    assignments: Mapped[List["TelegramQuizAssignment"]] = relationship("TelegramQuizAssignment", back_populates="target", cascade="all, delete-orphan")

class TelegramQuiz(Base):
    __tablename__ = "telegram_quizzes"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("questions_categories.id", ondelete="SET NULL"), nullable=True, index=True)
    time_limit_per_question: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    total_time_minutes: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    negative_marking_rate: Mapped[float] = mapped_column(Numeric(4, 2), default=0.00, nullable=False)
    question_ids: Mapped[str] = mapped_column(Text, nullable=False)
    total_questions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("admins.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    assignments: Mapped[List["TelegramQuizAssignment"]] = relationship("TelegramQuizAssignment", back_populates="quiz", cascade="all, delete-orphan")

class TelegramQuizAssignment(Base):
    __tablename__ = "telegram_quiz_assignments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    quiz_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("telegram_quizzes.id", ondelete="CASCADE"), nullable=False, index=True)
    target_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("telegram_quiz_targets.id", ondelete="CASCADE"), nullable=False, index=True)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), default="scheduled", nullable=False, index=True)
    announcement_message_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    leaderboard_message_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    leaderboard_published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    total_participants: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    poll_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("admins.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    quiz: Mapped["TelegramQuiz"] = relationship("TelegramQuiz", back_populates="assignments")
    target: Mapped["TelegramQuizTarget"] = relationship("TelegramQuizTarget", back_populates="assignments")
    participants: Mapped[List["TelegramQuizParticipant"]] = relationship("TelegramQuizParticipant", back_populates="assignment", cascade="all, delete-orphan")

class TelegramQuizParticipant(Base):
    __tablename__ = "telegram_quiz_participants"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    assignment_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("telegram_quiz_assignments.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("telegram_users.id", ondelete="CASCADE"), nullable=False, index=True)
    exam_session_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("telegram_exam_sessions.id", ondelete="SET NULL"), nullable=True, index=True)
    score: Mapped[float] = mapped_column(Numeric(6, 2), default=0.00, nullable=False)
    correct_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    wrong_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    skipped_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_time_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="in_progress", nullable=False, index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    answers_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    assignment: Mapped["TelegramQuizAssignment"] = relationship("TelegramQuizAssignment", back_populates="participants")
    user: Mapped["TelegramUser"] = relationship("TelegramUser")
    session: Mapped[Optional["ExamSession"]] = relationship("ExamSession")
