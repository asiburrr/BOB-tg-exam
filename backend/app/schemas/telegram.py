from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

class BotSettingResponse(BaseModel):
    id: int
    bot_token: Optional[str] = None
    bot_username: Optional[str] = None
    webhook_url: Optional[str] = None
    is_webhook_active: bool = False
    default_count_presets: str = "5,10,20,25,50"
    default_negative_marking: float = 0.00
    limit_enabled: bool = False
    limit_period: str = "daily"
    max_exams_per_period: int = 5
    max_questions_per_period: int = 100
    custom_interval_hours: int = 24
    cooldown_minutes: int = 0
    cooldown_message: Optional[str] = None
    limit_reached_message: Optional[str] = None
    onboarding_enabled: bool = False
    onboarding_config: Optional[str] = None
    force_join_enabled: bool = False
    force_join_channels: Optional[str] = None
    force_join_message: Optional[str] = None
    group_access_mode: str = "all_blocked"
    allowed_group_ids: Optional[str] = None
    group_commands_in_private: bool = False
    group_redirect_message: Optional[str] = None
    updated_at: datetime

    @field_validator("force_join_enabled", mode="before")
    @classmethod
    def validate_force_join_enabled(cls, v):
        if v is None:
            return False
        return bool(v)

    @field_validator("group_access_mode", mode="before")
    @classmethod
    def validate_group_access_mode(cls, v):
        if v is None:
            return "all_blocked"
        return str(v)

    @field_validator("group_commands_in_private", mode="before")
    @classmethod
    def validate_group_commands_in_private(cls, v):
        if v is None:
            return False
        return bool(v)

    class Config:
        from_attributes = True

class BotSettingUpdate(BaseModel):
    bot_token: Optional[str] = None
    default_count_presets: Optional[str] = None
    default_negative_marking: Optional[float] = None
    limit_enabled: Optional[bool] = None
    limit_period: Optional[str] = None
    max_exams_per_period: Optional[int] = None
    max_questions_per_period: Optional[int] = None
    custom_interval_hours: Optional[int] = None
    cooldown_minutes: Optional[int] = None
    cooldown_message: Optional[str] = None
    limit_reached_message: Optional[str] = None
    onboarding_enabled: Optional[bool] = None
    onboarding_config: Optional[str] = None
    force_join_enabled: Optional[bool] = None
    force_join_channels: Optional[str] = None
    force_join_message: Optional[str] = None
    group_access_mode: Optional[str] = None
    allowed_group_ids: Optional[str] = None
    group_commands_in_private: Optional[bool] = None
    group_redirect_message: Optional[str] = None

class BotFlowNodeCreate(BaseModel):
    parent_id: Optional[int] = None
    trigger_command: Optional[str] = None
    label: str = Field(..., min_length=1, max_length=100)
    action_type: str = Field("menu_nodes", max_length=30)
    content_text: Optional[str] = None
    category_id: Optional[str] = None
    picking_strategy: str = Field("ask_user", max_length=30)
    question_count_mode: str = Field("ask_user", max_length=20)
    fixed_count: int = 10
    difficulty_mode: str = Field("ask_user", max_length=20)
    fixed_difficulty: str = Field("mixed", max_length=20)
    scope_mode: str = Field("ask_user", max_length=30)
    timer_seconds: int = 0
    negative_marking_rate: float = 0.00
    url: Optional[str] = None
    row_index: int = 0
    sort_order: int = 0
    is_active: bool = True

class BotFlowBatchCreateItem(BaseModel):
    label: str = Field(..., min_length=1, max_length=100)
    action_type: str = Field("start_exam", max_length=30)
    category_id: Optional[str] = None
    picking_strategy: str = Field("direct_start", max_length=30)
    fixed_count: int = 10
    difficulty_mode: str = Field("fixed_difficulty", max_length=20)
    fixed_difficulty: str = Field("mixed", max_length=20)
    scope_mode: str = Field("include_subtopics", max_length=30)
    timer_seconds: int = 0
    negative_marking_rate: float = 0.00
    row_index: int = 0
    sort_order: int = 0
    is_active: bool = True

class BotFlowBatchCreate(BaseModel):
    parent_id: Optional[int] = None
    create_parent_node: bool = False
    parent_label: Optional[str] = None
    parent_content_text: Optional[str] = None
    parent_row_index: int = 0
    items: List[BotFlowBatchCreateItem] = []

class BotFlowNodeUpdate(BaseModel):
    parent_id: Optional[int] = None
    trigger_command: Optional[str] = None
    label: Optional[str] = Field(None, min_length=1, max_length=100)
    action_type: Optional[str] = None
    content_text: Optional[str] = None
    category_id: Optional[str] = None
    picking_strategy: Optional[str] = None
    question_count_mode: Optional[str] = None
    fixed_count: Optional[int] = None
    difficulty_mode: Optional[str] = None
    fixed_difficulty: Optional[str] = None
    scope_mode: Optional[str] = None
    timer_seconds: Optional[int] = None
    negative_marking_rate: Optional[float] = None
    url: Optional[str] = None
    row_index: Optional[int] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None

class BotFlowNodeResponse(BaseModel):
    id: int
    parent_id: Optional[int] = None
    trigger_command: Optional[str] = None
    label: str
    action_type: str
    content_text: Optional[str] = None
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    picking_strategy: str
    question_count_mode: str
    fixed_count: int
    difficulty_mode: str
    fixed_difficulty: str
    scope_mode: str
    timer_seconds: int
    negative_marking_rate: float
    url: Optional[str] = None
    row_index: int
    sort_order: int
    is_active: bool
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class BotFlowNodeTreeResponse(BotFlowNodeResponse):
    children: List["BotFlowNodeTreeResponse"] = []

class BotFlowReorderItem(BaseModel):
    id: int
    row_index: int
    sort_order: int
    parent_id: Optional[int] = None

class BotFlowReorderRequest(BaseModel):
    items: List[BotFlowReorderItem]

class TelegramPromotionCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    promo_type: str = Field("text", max_length=30)
    content_text: str = Field(..., min_length=1)
    media_url: Optional[str] = None
    button_text: Optional[str] = None
    button_url: Optional[str] = None
    trigger_event: str = Field("after_exam", max_length=50)
    target_category_id: Optional[str] = None
    priority: int = 0
    is_active: bool = True

class TelegramPromotionUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    promo_type: Optional[str] = None
    content_text: Optional[str] = None
    media_url: Optional[str] = None
    button_text: Optional[str] = None
    button_url: Optional[str] = None
    trigger_event: Optional[str] = None
    target_category_id: Optional[str] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None

class TelegramPromotionResponse(BaseModel):
    id: int
    title: str
    promo_type: str
    content_text: str
    media_url: Optional[str] = None
    button_text: Optional[str] = None
    button_url: Optional[str] = None
    trigger_event: str
    target_category_id: Optional[str] = None
    target_category_name: Optional[str] = None
    priority: int
    is_active: bool
    impressions_count: int
    clicks_count: int
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TelegramUserResponse(BaseModel):
    id: int
    telegram_id: int
    username: Optional[str] = None
    first_name: str
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    is_blocked: bool
    is_vip: bool
    current_flow_node_id: Optional[int] = None
    flow_state: Optional[str] = "idle"
    profile_data: Optional[str] = None
    last_message_id: Optional[int] = None
    last_active_session_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    total_exams: int = 0
    exams_count: int = 0
    questions_count: int = 0
    period_exams_count: int = 0
    period_questions_count: int = 0

    class Config:
        from_attributes = True

class ExamAnswerResponse(BaseModel):
    id: int
    question_id: str
    question_text: str
    selected_option_id: Optional[str] = None
    selected_option_text: Optional[str] = None
    correct_option_text: Optional[str] = None
    is_correct: bool
    points_awarded: float
    time_spent_seconds: int
    explanation: Optional[str] = None
    answered_at: datetime

    class Config:
        from_attributes = True

class ExamSessionResponse(BaseModel):
    id: int
    user_id: int
    telegram_id: Optional[int] = None
    user_name: Optional[str] = None
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    flow_node_id: Optional[int] = None
    strategy_used: str
    difficulty: str
    total_questions: int
    correct_count: int
    wrong_count: int
    skipped_count: int
    score: float
    max_score: float
    accuracy_percentage: float
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ExamSessionDetailResponse(ExamSessionResponse):
    answers: List[ExamAnswerResponse] = []

class WebhookSetRequest(BaseModel):
    webhook_url: Optional[str] = None

class WebhookInfoResponse(BaseModel):
    url: str = ""
    has_custom_certificate: bool = False
    pending_update_count: int = 0
    last_error_date: Optional[int] = None
    last_error_message: Optional[str] = None
    max_connections: Optional[int] = None
    ip_address: Optional[str] = None

class BroadcastSendRequest(BaseModel):
    target_type: str = Field("all_users", pattern="^(all_users|vip_users|selected_users|allowed_groups|custom)$")
    selected_user_ids: Optional[List[int]] = None
    custom_targets: Optional[str] = None
    content_text: str = Field(..., min_length=1)
    media_url: Optional[str] = None
    button_text: Optional[str] = None
    button_url: Optional[str] = None

class BroadcastSendResponse(BaseModel):
    success: bool = True
    targets_count: int = 0
    message: str = ""
