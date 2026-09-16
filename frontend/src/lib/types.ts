export type ThemeMode = "light" | "dark" | "auto";

export interface QuestionCategory {
  id: string;
  parent_id?: string | null;
  name: string;
  description?: string | null;
  sort_order: number;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  question_count: number;
  direct_count?: number;
  children?: QuestionCategory[];
}

export interface QuestionOption {
  id?: string;
  question_id?: string;
  option_text: string;
  is_correct: boolean;
  explanation?: string | null;
  sort_order: number;
}

export interface QuestionItem {
  id: string;
  category_id: string;
  category_name?: string | null;
  category_path?: string | null;
  category_hierarchy?: string[];
  question: string;
  difficulty: "easy" | "medium" | "hard" | "expert";
  explanation?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  options: QuestionOption[];
}

export interface BotSetting {
  id: number;
  bot_token?: string | null;
  bot_username?: string | null;
  webhook_url?: string | null;
  webhook_secret?: string | null;
  is_webhook_active: boolean;
  default_count_presets: string;
  default_negative_marking: number;
  limit_enabled: boolean;
  limit_period: "hourly" | "daily" | "weekly" | "monthly" | "custom_interval";
  max_exams_per_period: number;
  max_questions_per_period: number;
  custom_interval_hours: number;
  cooldown_minutes: number;
  cooldown_message?: string | null;
  limit_reached_message?: string | null;
  onboarding_enabled?: boolean;
  onboarding_config?: string | null;
  force_join_enabled?: boolean;
  force_join_channels?: string | null;
  force_join_message?: string | null;
  group_access_mode?: "all_blocked" | "allowed_only";
  allowed_group_ids?: string | null;
  group_commands_in_private?: boolean;
  group_redirect_message?: string | null;
  created_by?: string | null;
  updated_at: string;
}

export interface ForceJoinChannelItem {
  title: string;
  chat_id: string;
  invite_link?: string;
}

export interface BotFlowNode {
  id: number;
  parent_id?: number | null;
  trigger_command?: string | null;
  label: string;
  action_type: "menu_nodes" | "text_message" | "category_browse" | "start_exam" | "url_link" | "limits_check";
  content_text?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  picking_strategy: "direct_start" | "subject_wise" | "random_overall" | "ask_user";
  question_count_mode: "ask_user" | "fixed_count";
  fixed_count: number;
  difficulty_mode: "ask_user" | "fixed_difficulty";
  fixed_difficulty: "easy" | "medium" | "hard" | "expert" | "mixed";
  scope_mode: "ask_user" | "include_subtopics" | "exact_category_only";
  timer_seconds: number;
  negative_marking_rate: number;
  url?: string | null;
  row_index: number;
  sort_order: number;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  children?: BotFlowNode[];
}

export interface TelegramPromotion {
  id: number;
  title: string;
  promo_type: "text" | "photo" | "banner";
  content_text: string;
  media_url?: string | null;
  button_text?: string | null;
  button_url?: string | null;
  trigger_event: "after_exam" | "on_start" | "on_limit_reached" | "category_specific";
  target_category_id?: string | null;
  target_category_name?: string | null;
  priority: number;
  is_active: boolean;
  impressions_count: number;
  clicks_count: number;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExamAnswer {
  id: number;
  session_id: number;
  question_id: string;
  selected_option_id?: string | null;
  selected_option_text?: string | null;
  correct_option_text?: string | null;
  is_correct: boolean;
  points_awarded: number;
  time_spent_seconds: number;
  answered_at: string;
  question_text?: string | null;
  selected_text?: string | null;
  correct_text?: string | null;
  explanation?: string | null;
}

export interface ExamSession {
  id: number;
  user_id: number;
  telegram_id?: number | null;
  user_name?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  flow_node_id?: number | null;
  strategy_used: string;
  difficulty: string;
  total_questions: number;
  current_index: number;
  question_ids: string;
  correct_count: number;
  wrong_count: number;
  skipped_count: number;
  score: number;
  max_score: number;
  accuracy_percentage: number;
  status: "in_progress" | "completed" | "timed_out" | "abandoned";
  started_at: string;
  completed_at?: string | null;
  answers?: ExamAnswer[];
}

export interface TelegramUser {
  id: number;
  telegram_id: number;
  username?: string | null;
  first_name: string;
  last_name?: string | null;
  phone_number?: string | null;
  is_blocked: boolean;
  is_vip: boolean;
  current_flow_node_id?: number | null;
  flow_state?: string | null;
  profile_data?: string | null;
  last_message_id?: number | null;
  last_active_session_id?: number | null;
  created_at: string;
  updated_at: string;
  total_exams?: number;
  period_exams_count?: number;
  period_questions_count?: number;
}

export interface WebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  last_error_date?: number | null;
  last_error_message?: string | null;
  max_connections?: number | null;
  ip_address?: string | null;
}

export interface BroadcastSendRequest {
  target_type: "all_users" | "vip_users" | "selected_users" | "allowed_groups" | "custom" | "onboarding_criteria";
  selected_user_ids?: number[];
  custom_targets?: string;
  content_text: string;
  media_url?: string;
  button_text?: string;
  button_url?: string;
}

export interface PermissionItem {
  key: string;
  name: string;
  description: string;
}

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  role: "Administration" | "Admin" | string;
  status: "active" | "suspended" | string;
  permissions: string[];
  failed_login_attempts: number;
  locked_until?: string | null;
  last_login_at?: string | null;
  last_login_ip?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminCreatePayload {
  name: string;
  email: string;
  role: string;
  status: string;
  password: string;
  permissions: string[];
}

export interface AdminUpdatePayload {
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  password?: string;
  permissions?: string[];
}
