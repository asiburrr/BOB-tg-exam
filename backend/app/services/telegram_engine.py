import json
import random
import asyncio
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.telegram import (
    TelegramUser,
    BotFlowNode,
    BotSetting,
    TelegramPromotion,
    ExamSession,
    ExamAnswer,
)
from app.models.question import QuestionCategory, Question, QuestionOption

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class TelegramApiClient:
    def __init__(self, token: Optional[str] = None):
        self.token = token
        self.base_url = f"https://api.telegram.org/bot{token}" if token else ""

    def _sync_post(self, method: str, data: Dict[str, Any]) -> Dict[str, Any]:
        if not self.token:
            return {"ok": False, "description": "Bot token not configured"}
        url = f"{self.base_url}/{method}"
        body = json.dumps(data).encode("utf-8")
        req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            try:
                return json.loads(e.read().decode("utf-8"))
            except Exception:
                return {"ok": False, "description": str(e)}
        except Exception as e:
            return {"ok": False, "description": str(e)}

    def _sync_get(self, method: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if not self.token:
            return {"ok": False, "description": "Bot token not configured"}
        url = f"{self.base_url}/{method}"
        if params:
            qs = urllib.parse.urlencode(params)
            url = f"{url}?{qs}"
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            try:
                return json.loads(e.read().decode("utf-8"))
            except Exception:
                return {"ok": False, "description": str(e)}
        except Exception as e:
            return {"ok": False, "description": str(e)}

    async def _post(self, method: str, data: Dict[str, Any]) -> Dict[str, Any]:
        return self._sync_post(method, data)

    async def _get(self, method: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        return self._sync_get(method, params)

    def _clean_keyboard_urls(self, reply_markup: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not reply_markup or not reply_markup.get("inline_keyboard"):
            return None
        cleaned_kb = []
        for row in reply_markup["inline_keyboard"]:
            cleaned_row = []
            for btn in row:
                if "url" in btn:
                    url_val = (btn.get("url") or "").strip()
                    if url_val.lower().startswith("http://localhost") or url_val.lower().startswith("http://127.0.0.1") or not (url_val.startswith("https://") or url_val.startswith("http://") or url_val.startswith("tg://")):
                        continue
                cleaned_row.append(btn)
            if cleaned_row:
                cleaned_kb.append(cleaned_row)
        return {"inline_keyboard": cleaned_kb} if cleaned_kb else None

    async def send_message(
        self,
        chat_id: Any,
        text: str,
        reply_markup: Optional[Dict[str, Any]] = None,
        parse_mode: Optional[str] = None,
        reply_to_message_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        valid_markup = self._clean_keyboard_urls(reply_markup)
        payload: Dict[str, Any] = {
            "chat_id": chat_id,
            "text": text,
        }
        if parse_mode:
            payload["parse_mode"] = parse_mode
        if valid_markup:
            payload["reply_markup"] = valid_markup
        if reply_to_message_id:
            payload["reply_to_message_id"] = reply_to_message_id
        res = await self._post("sendMessage", payload)
        if not res.get("ok"):
            err_desc = str(res.get("description", "")).lower()
            if "wrong http url" in err_desc or "button_url_invalid" in err_desc:
                payload.pop("reply_markup", None)
                res = await self._post("sendMessage", payload)
            elif "can't parse entities" in err_desc and parse_mode:
                payload.pop("parse_mode", None)
                res = await self._post("sendMessage", payload)
        return res

    async def send_photo(
        self,
        chat_id: Any,
        photo: str,
        caption: Optional[str] = None,
        reply_markup: Optional[Dict[str, Any]] = None,
        parse_mode: Optional[str] = None,
        reply_to_message_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        valid_markup = self._clean_keyboard_urls(reply_markup)
        payload: Dict[str, Any] = {
            "chat_id": chat_id,
            "photo": photo,
        }
        if caption:
            payload["caption"] = caption
        if parse_mode:
            payload["parse_mode"] = parse_mode
        if valid_markup:
            payload["reply_markup"] = valid_markup
        if reply_to_message_id:
            payload["reply_to_message_id"] = reply_to_message_id
        res = await self._post("sendPhoto", payload)
        if not res.get("ok"):
            err_desc = str(res.get("description", "")).lower()
            if "wrong http url" in err_desc or "button_url_invalid" in err_desc:
                payload.pop("reply_markup", None)
                res = await self._post("sendPhoto", payload)
            elif "can't parse entities" in err_desc and parse_mode:
                payload.pop("parse_mode", None)
                res = await self._post("sendPhoto", payload)
        return res

    async def edit_message_text(
        self,
        chat_id: int,
        message_id: int,
        text: str,
        reply_markup: Optional[Dict[str, Any]] = None,
        parse_mode: Optional[str] = None,
    ) -> Dict[str, Any]:
        valid_markup = self._clean_keyboard_urls(reply_markup)
        payload: Dict[str, Any] = {
            "chat_id": chat_id,
            "message_id": message_id,
            "text": text,
        }
        if parse_mode:
            payload["parse_mode"] = parse_mode
        if valid_markup:
            payload["reply_markup"] = valid_markup
        res = await self._post("editMessageText", payload)
        if not res.get("ok"):
            err_desc = str(res.get("description", "")).lower()
            if "wrong http url" in err_desc or "button_url_invalid" in err_desc:
                payload.pop("reply_markup", None)
                res = await self._post("editMessageText", payload)
            elif "can't parse entities" in err_desc and parse_mode:
                payload.pop("parse_mode", None)
                res = await self._post("editMessageText", payload)
        return res


    async def edit_message_reply_markup(
        self,
        chat_id: int,
        message_id: int,
        reply_markup: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "chat_id": chat_id,
            "message_id": message_id,
        }
        if reply_markup:
            valid_markup = self._clean_keyboard_urls(reply_markup)
            if valid_markup:
                payload["reply_markup"] = valid_markup
            else:
                payload["reply_markup"] = {"inline_keyboard": []}
        else:
            payload["reply_markup"] = {"inline_keyboard": []}
        return await self._post("editMessageReplyMarkup", payload)

    async def remove_message_buttons(
        self,
        chat_id: int,
        message_id: int,
    ) -> Dict[str, Any]:
        return await self.edit_message_reply_markup(chat_id, message_id, None)

    async def delete_message(
        self,
        chat_id: int,
        message_id: int,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "chat_id": chat_id,
            "message_id": message_id,
        }
        res = await self._post("deleteMessage", payload)
        if not res.get("ok"):
            await self.remove_message_buttons(chat_id, message_id)
        return res

    async def send_poll(
        self,
        chat_id: int,
        question: str,
        options: List[str],
        correct_option_id: int,
        explanation: Optional[str] = None,
        is_anonymous: bool = False,
        poll_type: str = "quiz",
        reply_markup: Optional[Dict[str, Any]] = None,
        open_period: Optional[int] = None,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "chat_id": chat_id,
            "question": question[:300],
            "options": options,
            "is_anonymous": is_anonymous,
            "type": poll_type,
            "correct_option_id": max(0, min(correct_option_id, len(options) - 1)),
        }
        if explanation:
            clean_exp = explanation.strip()[:200]
            if clean_exp:
                payload["explanation"] = clean_exp
        if reply_markup:
            payload["reply_markup"] = reply_markup
        if open_period and 5 <= open_period <= 600:
            payload["open_period"] = open_period
        return await self._post("sendPoll", payload)

    async def answer_callback_query(
        self,
        callback_query_id: str,
        text: Optional[str] = None,
        show_alert: bool = False,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "callback_query_id": callback_query_id,
            "show_alert": show_alert,
        }
        if text:
            payload["text"] = text
        return await self._post("answerCallbackQuery", payload)

    async def leave_chat(self, chat_id: Any) -> Dict[str, Any]:
        return await self._post("leaveChat", {"chat_id": chat_id})

    async def get_chat_member(self, chat_id: Any, user_id: int) -> Dict[str, Any]:
        return await self._post("getChatMember", {"chat_id": chat_id, "user_id": user_id})

    async def set_webhook(self, url: str, secret_token: Optional[str] = None) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "url": url,
            "allowed_updates": ["message", "callback_query", "poll_answer", "my_chat_member"],
            "drop_pending_updates": True,
        }
        if secret_token:
            payload["secret_token"] = secret_token
        return await self._post("setWebhook", payload)

    async def delete_webhook(self) -> Dict[str, Any]:
        return await self._post("deleteWebhook", {"drop_pending_updates": False})

    async def get_webhook_info(self) -> Dict[str, Any]:
        return await self._get("getWebhookInfo")

    async def get_me(self) -> Dict[str, Any]:
        return await self._get("getMe")

class TelegramEngine:
    @staticmethod
    async def get_or_create_user(
        db: AsyncSession,
        from_data: Dict[str, Any],
    ) -> TelegramUser:
        tg_id = from_data.get("id")
        res = await db.execute(select(TelegramUser).where(TelegramUser.telegram_id == tg_id))
        user = res.scalar_one_or_none()
        first_name = from_data.get("first_name", "Student")
        last_name = from_data.get("last_name")
        username = from_data.get("username")

        if not user:
            user = TelegramUser(
                telegram_id=tg_id,
                first_name=first_name,
                last_name=last_name,
                username=username,
            )
            db.add(user)
            await db.flush()
        else:
            user.first_name = first_name
            user.last_name = last_name
            user.username = username
            user.updated_at = utc_now()
            await db.flush()

        if user.last_exam_at is None:
            latest_res = await db.execute(
                select(ExamSession.completed_at, ExamSession.started_at)
                .where(ExamSession.user_id == user.id)
                .order_by(desc(ExamSession.id))
                .limit(1)
            )
            latest_row = latest_res.first()
            if latest_row:
                user.last_exam_at = latest_row[0] or latest_row[1]
                await db.flush()

        return user

    @staticmethod
    async def get_settings(db: AsyncSession) -> BotSetting:
        res = await db.execute(select(BotSetting).limit(1))
        setting = res.scalar_one_or_none()
        if not setting:
            setting = BotSetting()
            db.add(setting)
            await db.flush()
        return setting

    @staticmethod
    def format_time_remaining(seconds: float) -> str:
        total_sec = max(1, int(seconds))
        hours = total_sec // 3600
        minutes = (total_sec % 3600) // 60
        secs = total_sec % 60
        if hours > 0:
            return f"{hours}h {minutes}m" if minutes > 0 else f"{hours} hour{'s' if hours > 1 else ''}"
        elif minutes > 0:
            return f"{minutes}m {secs}s" if secs > 0 else f"{minutes} minute{'s' if minutes > 1 else ''}"
        else:
            return f"{secs} second{'s' if secs != 1 else ''}"

    @staticmethod
    def calculate_quota_window(
        setting: BotSetting,
        now: datetime,
        last_exam_at: Optional[datetime],
    ) -> Tuple[datetime, datetime, str]:
        period = (setting.limit_period or "daily").lower()
        if period == "hourly":
            window_start = now.replace(minute=0, second=0, microsecond=0)
            reset_time = window_start + timedelta(hours=1)
            period_label = "hour"
        elif period == "weekly":
            window_start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
            reset_time = window_start + timedelta(days=7)
            period_label = "week"
        elif period == "monthly":
            window_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
            if now.month == 12:
                reset_time = datetime(now.year + 1, 1, 1, tzinfo=timezone.utc)
            else:
                reset_time = datetime(now.year, now.month + 1, 1, tzinfo=timezone.utc)
            period_label = "month"
        elif period == "custom_interval":
            hours = max(1, setting.custom_interval_hours)
            period_label = f"{hours} hours"
            if last_exam_at:
                window_start = last_exam_at
                reset_time = last_exam_at + timedelta(hours=hours)
            else:
                window_start = now
                reset_time = now + timedelta(hours=hours)
        else:
            window_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
            reset_time = window_start + timedelta(days=1)
            period_label = "today"

        return window_start, reset_time, period_label

    @staticmethod
    async def get_user_quota_stats(
        db: AsyncSession,
        user: TelegramUser,
        setting: BotSetting,
    ) -> Dict[str, Any]:
        if not setting.limit_enabled or user.is_vip:
            return {
                "max_exams": "Unlimited",
                "remaining_exams": "Unlimited",
                "exams_remaining": "Unlimited",
                "remaining_attempts": "Unlimited",
                "exams_taken": "0",
                "cooldown_remaining": "0s",
                "cooldown_time": "0s",
                "quota_reset_in": "Immediate",
                "quota_time_remaining": "Immediate",
                "time_remaining": "Immediate",
            }

        now = utc_now()
        window_start, reset_time, period_label = TelegramEngine.calculate_quota_window(setting, now, user.last_exam_at)

        if user.quota_window_start is None or user.quota_window_start < window_start:
            user.quota_window_start = window_start
            q_res = await db.execute(
                select(func.count(ExamSession.id)).where(
                    and_(
                        ExamSession.user_id == user.id,
                        ExamSession.started_at >= window_start,
                    )
                )
            )
            user.exams_in_quota_window = q_res.scalar() or 0
            await db.flush()

        exams_taken = user.exams_in_quota_window or 0
        max_exams = setting.max_exams_per_period
        remaining = max(0, max_exams - exams_taken) if max_exams > 0 else 0

        rem_period_sec = max(0.0, (reset_time - now).total_seconds())
        period_time_str = TelegramEngine.format_time_remaining(rem_period_sec) if rem_period_sec > 0 else "Immediate"

        cooldown_rem_sec = 0.0
        if setting.cooldown_minutes > 0 and user.last_exam_at:
            required_sec = float(setting.cooldown_minutes * 60)
            elapsed_sec = (now - user.last_exam_at).total_seconds()
            if elapsed_sec < required_sec:
                cooldown_rem_sec = required_sec - elapsed_sec
        cooldown_str = TelegramEngine.format_time_remaining(cooldown_rem_sec) if cooldown_rem_sec > 0 else "0s"

        return {
            "max_exams": str(max_exams) if max_exams > 0 else "Unlimited",
            "remaining_exams": str(remaining) if max_exams > 0 else "Unlimited",
            "exams_remaining": str(remaining) if max_exams > 0 else "Unlimited",
            "remaining_attempts": str(remaining) if max_exams > 0 else "Unlimited",
            "exams_taken": str(exams_taken),
            "cooldown_remaining": cooldown_str,
            "cooldown_time": cooldown_str,
            "quota_reset_in": period_time_str,
            "quota_time_remaining": period_time_str,
            "time_remaining": period_time_str if remaining == 0 else cooldown_str,
        }

    @staticmethod
    async def check_user_quota(
        db: AsyncSession,
        user: TelegramUser,
        setting: BotSetting,
    ) -> Tuple[bool, Optional[str]]:
        if user.is_vip or not setting.limit_enabled:
            return True, None

        now = utc_now()
        window_start, reset_time, period_label = TelegramEngine.calculate_quota_window(setting, now, user.last_exam_at)

        if user.quota_window_start is None or user.quota_window_start < window_start:
            user.quota_window_start = window_start
            q_res = await db.execute(
                select(func.count(ExamSession.id)).where(
                    and_(
                        ExamSession.user_id == user.id,
                        ExamSession.started_at >= window_start,
                    )
                )
            )
            user.exams_in_quota_window = q_res.scalar() or 0
            await db.flush()

        exams_taken = user.exams_in_quota_window or 0
        max_exams = setting.max_exams_per_period
        max_exams_str = str(max_exams) if max_exams > 0 else "Unlimited"
        remaining_exams = max(0, max_exams - exams_taken) if max_exams > 0 else 0
        remaining_exams_str = str(remaining_exams) if max_exams > 0 else "Unlimited"

        rem_period_sec = max(0.0, (reset_time - now).total_seconds())
        period_time_str = TelegramEngine.format_time_remaining(rem_period_sec) if rem_period_sec > 0 else "Immediate"

        cooldown_str = "0s"
        cooldown_active = False
        if setting.cooldown_minutes > 0 and user.last_exam_at:
            required_sec = float(setting.cooldown_minutes * 60)
            elapsed_sec = (now - user.last_exam_at).total_seconds()
            if elapsed_sec < required_sec:
                cooldown_active = True
                cooldown_rem_sec = required_sec - elapsed_sec
                cooldown_str = TelegramEngine.format_time_remaining(cooldown_rem_sec)

        if cooldown_active:
            if setting.cooldown_message:
                msg = (
                    setting.cooldown_message
                    .replace("{cooldown_remaining}", cooldown_str)
                    .replace("{cooldown_time}", cooldown_str)
                    .replace("{cooldown_minutes}", str(setting.cooldown_minutes))
                    .replace("{quota_reset_in}", period_time_str)
                    .replace("{quota_time_remaining}", period_time_str)
                    .replace("{max_exams}", max_exams_str)
                    .replace("{remaining_exams}", remaining_exams_str)
                    .replace("{exams_remaining}", remaining_exams_str)
                    .replace("{remaining_attempts}", remaining_exams_str)
                    .replace("{exams_taken}", str(exams_taken))
                    .replace("{time_remaining}", cooldown_str)
                )
            else:
                msg = (
                    f"Mandatory Cooldown Active\n\n"
                    f"Candidates must rest {setting.cooldown_minutes} minute(s) after finishing an exam.\n"
                    f"Cooldown remaining: {cooldown_str}\n"
                    f"Remaining exams: {remaining_exams_str} of {max_exams_str}\n\n"
                    f"Please wait until your cooldown expires before starting another exam."
                )
            return False, msg

        if max_exams > 0 and exams_taken >= max_exams:
            if setting.limit_reached_message:
                msg = (
                    setting.limit_reached_message
                    .replace("{quota_reset_in}", period_time_str)
                    .replace("{quota_time_remaining}", period_time_str)
                    .replace("{max_exams}", max_exams_str)
                    .replace("{remaining_exams}", "0")
                    .replace("{exams_remaining}", "0")
                    .replace("{remaining_attempts}", "0")
                    .replace("{exams_taken}", str(exams_taken))
                    .replace("{cooldown_remaining}", cooldown_str)
                    .replace("{cooldown_time}", cooldown_str)
                    .replace("{cooldown_minutes}", str(setting.cooldown_minutes))
                    .replace("{time_remaining}", period_time_str)
                )
            else:
                msg = (
                    f"Exam Limit Reached ({max_exams} exams)\n\n"
                    f"You have completed your allowance of {max_exams} exams for this {period_label}.\n"
                    f"Remaining exams: 0 of {max_exams_str}\n"
                    f"Your quota resets in {period_time_str}."
                )
            return False, msg

        if setting.max_questions_per_period > 0:
            q_res = await db.execute(
                select(func.coalesce(func.sum(ExamSession.total_questions), 0)).where(
                    and_(
                        ExamSession.user_id == user.id,
                        ExamSession.started_at >= window_start,
                    )
                )
            )
            questions_taken = q_res.scalar() or 0
            if questions_taken >= setting.max_questions_per_period:
                if setting.limit_reached_message:
                    msg = (
                        setting.limit_reached_message
                        .replace("{quota_reset_in}", period_time_str)
                        .replace("{quota_time_remaining}", period_time_str)
                        .replace("{max_exams}", max_exams_str)
                        .replace("{remaining_exams}", "0")
                        .replace("{exams_remaining}", "0")
                        .replace("{remaining_attempts}", "0")
                        .replace("{exams_taken}", str(exams_taken))
                        .replace("{cooldown_remaining}", cooldown_str)
                        .replace("{cooldown_time}", cooldown_str)
                        .replace("{cooldown_minutes}", str(setting.cooldown_minutes))
                        .replace("{time_remaining}", period_time_str)
                    )
                else:
                    msg = (
                        f"Question Limit Reached ({setting.max_questions_per_period} questions)\n\n"
                        f"You have answered {questions_taken} / {setting.max_questions_per_period} questions for this {period_label}.\n"
                        f"Your quota resets in {period_time_str}."
                    )
                return False, msg

        return True, None

    @staticmethod
    async def get_active_promotion(
        db: AsyncSession,
        trigger_event: str = "after_exam",
        category_id: Optional[str] = None,
    ) -> Optional[TelegramPromotion]:
        if category_id:
            curr_cat_id: Optional[str] = category_id
            while curr_cat_id:
                res_cat = await db.execute(
                    select(TelegramPromotion)
                    .where(
                        and_(
                            TelegramPromotion.is_active.is_(True),
                            or_(
                                TelegramPromotion.trigger_event == trigger_event,
                                TelegramPromotion.trigger_event == "category_specific",
                            ),
                            TelegramPromotion.target_category_id == curr_cat_id,
                        )
                    )
                    .order_by(desc(TelegramPromotion.priority), desc(TelegramPromotion.id))
                    .limit(1)
                )
                cat_promo = res_cat.scalar_one_or_none()
                if cat_promo:
                    cat_promo.impressions_count += 1
                    await db.flush()
                    return cat_promo

                cat_rec = await db.execute(select(QuestionCategory.parent_id).where(QuestionCategory.id == curr_cat_id))
                p_row = cat_rec.first()
                curr_cat_id = p_row[0] if p_row and p_row[0] else None

        res_general = await db.execute(
            select(TelegramPromotion)
            .where(
                and_(
                    TelegramPromotion.is_active.is_(True),
                    or_(
                        TelegramPromotion.trigger_event == trigger_event,
                        TelegramPromotion.trigger_event == "category_specific",
                    ) if trigger_event == "category_specific" else (TelegramPromotion.trigger_event == trigger_event),
                    TelegramPromotion.target_category_id.is_(None),
                )
            )
            .order_by(desc(TelegramPromotion.priority), desc(TelegramPromotion.id))
            .limit(1)
        )
        promo = res_general.scalar_one_or_none()
        if promo:
            promo.impressions_count += 1
            await db.flush()
        return promo

    @staticmethod
    async def get_promotion_button_url(
        db: AsyncSession,
        promo: TelegramPromotion,
        setting: Optional[BotSetting] = None,
    ) -> Optional[str]:
        if not promo.button_url:
            return None
        
        if setting and setting.webhook_url:
            base = setting.webhook_url.split("/api/v1/telegram")[0]
            if base and not base.startswith("http://localhost") and not base.startswith("http://127.0.0.1"):
                return f"{base}/api/v1/telegram/c/{promo.id}"

        raw_url = promo.button_url.strip()
        if not (raw_url.startswith("https://") or raw_url.startswith("http://") or raw_url.startswith("tg://")):
            raw_url = f"https://{raw_url}"
        if raw_url.lower().startswith("http://localhost") or raw_url.lower().startswith("http://127.0.0.1"):
            return None
        return raw_url

    @staticmethod
    async def check_force_join_membership(
        client: TelegramApiClient,
        user_tg_id: int,
        setting: BotSetting,
    ) -> Tuple[bool, List[Dict[str, str]]]:
        if not setting.force_join_enabled or not setting.force_join_channels:
            return True, []

        try:
            channels_list = json.loads(setting.force_join_channels)
            if not isinstance(channels_list, list) or not channels_list:
                return True, []
        except Exception:
            return True, []

        unjoined: List[Dict[str, str]] = []
        for ch in channels_list:
            chat_id = ch.get("chat_id")
            if not chat_id:
                continue
            res = await client.get_chat_member(chat_id, user_tg_id)
            if res.get("ok"):
                status = res.get("result", {}).get("status")
                if status not in ["creator", "administrator", "member", "restricted"]:
                    unjoined.append(ch)
            else:
                unjoined.append(ch)

        return len(unjoined) == 0, unjoined

    @staticmethod
    def build_force_join_card(
        setting: BotSetting,
        unjoined_channels: List[Dict[str, str]],
    ) -> Tuple[str, Dict[str, Any]]:
        custom_msg = setting.force_join_message or (
            "Access Required\n\n"
            "To access this examination portal, you must first join our official community channels and groups below."
        )

        buttons: List[List[Dict[str, Any]]] = []
        for ch in unjoined_channels:
            title = ch.get("title") or ch.get("chat_id") or "Join Community"
            invite_url = (ch.get("invite_link") or "").strip()
            if not invite_url and ch.get("chat_id", "").startswith("@"):
                invite_url = f"https://t.me/{ch['chat_id'].lstrip('@')}"
            if invite_url:
                buttons.append([{"text": title, "url": invite_url}])

        buttons.append([{"text": "I Have Joined / Verify Access", "callback_data": "verify_membership"}])
        return custom_msg, {"inline_keyboard": buttons}

    @staticmethod
    def render_text_template(template: str, user: TelegramUser, extras: Optional[Dict[str, Any]] = None) -> str:
        text = template.replace("{candidate_name}", user.first_name)
        text = text.replace("{username}", f"@{user.username}" if user.username else user.first_name)
        text = text.replace("{date}", utc_now().strftime("%Y-%m-%d"))
        if extras:
            for k, v in extras.items():
                text = text.replace(f"{{{k}}}", str(v))
        return text

    @staticmethod
    async def build_limit_reached_response(
        db: AsyncSession,
        user: TelegramUser,
        setting: BotSetting,
        quota_msg: str,
        category_id: Optional[str] = None,
    ) -> Tuple[str, Dict[str, Any]]:
        limit_promo = await TelegramEngine.get_active_promotion(db, trigger_event="on_limit_reached", category_id=category_id)
        msg_text = quota_msg
        kb_limit: List[List[Dict[str, Any]]] = []

        if limit_promo:
            p_body = ""
            quota_stats = await TelegramEngine.get_user_quota_stats(db, user, setting)
            p_text = TelegramEngine.render_text_template(limit_promo.content_text or "", user, quota_stats).strip()
            title = (limit_promo.title or "").strip()
            if title and p_text:
                p_body = f"\n\n--------------------\n{title}\n{p_text}"
            elif title:
                p_body = f"\n\n--------------------\n{title}"
            elif p_text:
                p_body = f"\n\n--------------------\n{p_text}"
            msg_text += p_body

            if limit_promo.button_text and limit_promo.button_url:
                p_url = await TelegramEngine.get_promotion_button_url(db, limit_promo, setting)
                if p_url:
                    kb_limit.append([{"text": limit_promo.button_text, "url": p_url}])

        kb_limit.append([{"text": "Main Menu", "callback_data": "start_nav"}])
        return msg_text, {"inline_keyboard": kb_limit}

    @staticmethod
    async def build_start_menu(
        db: AsyncSession,
        user: TelegramUser,
        setting: BotSetting,
    ) -> Tuple[str, Dict[str, Any]]:
        node_start_res = await db.execute(
            select(BotFlowNode)
            .where(and_(BotFlowNode.trigger_command == "/start", BotFlowNode.is_active.is_(True)))
            .limit(1)
        )
        start_node = node_start_res.scalar_one_or_none()

        menu_buttons: List[BotFlowNode] = []
        welcome_text: str = ""

        if start_node:
            child_res = await db.execute(
                select(BotFlowNode)
                .where(and_(BotFlowNode.parent_id == start_node.id, BotFlowNode.is_active.is_(True)))
                .order_by(BotFlowNode.row_index, BotFlowNode.sort_order)
            )
            children = child_res.scalars().all()
            welcome_text = start_node.content_text or f"Welcome {user.first_name}!"
            menu_buttons = list(children)
        else:
            root_res = await db.execute(
                select(BotFlowNode)
                .where(and_(BotFlowNode.parent_id.is_(None), BotFlowNode.is_active.is_(True)))
                .order_by(BotFlowNode.row_index, BotFlowNode.sort_order)
            )
            menu_buttons = list(root_res.scalars().all())
            if menu_buttons:
                welcome_text = f"Welcome {user.first_name}! Please choose an option below:"
            else:
                welcome_text = f"Welcome {user.first_name}!\n\nNo conversational flow has been configured yet. Please check back later."

        quota_stats = await TelegramEngine.get_user_quota_stats(db, user, setting)
        body = TelegramEngine.render_text_template(welcome_text, user, quota_stats)

        rows: Dict[int, List[Dict[str, Any]]] = {}
        for btn in menu_buttons:
            item: Dict[str, Any] = {"text": btn.label}
            if btn.action_type == "url_link" and btn.url:
                item["url"] = btn.url
            else:
                item["callback_data"] = f"fn:{btn.id}"
            rows.setdefault(btn.row_index, []).append(item)

        keyboard = [rows[r] for r in sorted(rows.keys())]

        promo = await TelegramEngine.get_active_promotion(db, trigger_event="on_start")
        if promo:
            if promo.content_text:
                p_text = TelegramEngine.render_text_template(promo.content_text, user, quota_stats)
                body += f"\n\nAnnouncement:\n{promo.title}\n{p_text}"
            if promo.button_text and promo.button_url:
                p_url = await TelegramEngine.get_promotion_button_url(db, promo, setting)
                if p_url:
                    keyboard.append([{"text": promo.button_text, "url": p_url}])

        return body, {"inline_keyboard": keyboard}

    @staticmethod
    async def build_flow_node_keyboard(
        db: AsyncSession,
        node: BotFlowNode,
    ) -> Dict[str, Any]:
        child_res = await db.execute(
            select(BotFlowNode)
            .where(and_(BotFlowNode.parent_id == node.id, BotFlowNode.is_active.is_(True)))
            .order_by(BotFlowNode.row_index, BotFlowNode.sort_order)
        )
        children = child_res.scalars().all()

        rows: Dict[int, List[Dict[str, Any]]] = {}
        for c in children:
            btn: Dict[str, Any] = {"text": c.label}
            if c.action_type == "url_link" and c.url:
                btn["url"] = c.url
            else:
                btn["callback_data"] = f"fn:{c.id}"
            rows.setdefault(c.row_index, []).append(btn)

        keyboard = [rows[r] for r in sorted(rows.keys())]

        if node.parent_id:
            keyboard.append([{"text": "Back", "callback_data": f"fn:{node.parent_id}"}])
        else:
            keyboard.append([{"text": "Main Menu", "callback_data": "start_nav"}])

        return {"inline_keyboard": keyboard}

    @staticmethod
    async def build_category_hierarchy_keyboard(
        db: AsyncSession,
        parent_category_id: Optional[str],
        node_id: int,
    ) -> Tuple[str, Dict[str, Any]]:
        query = select(QuestionCategory).order_by(QuestionCategory.sort_order, QuestionCategory.name)
        if parent_category_id:
            query = query.where(QuestionCategory.parent_id == parent_category_id)
        else:
            query = query.where(QuestionCategory.parent_id.is_(None))

        cats_res = await db.execute(query)
        categories = cats_res.scalars().all()

        parent_name = "Standards & Subjects"
        if parent_category_id:
            p_res = await db.execute(select(QuestionCategory).where(QuestionCategory.id == parent_category_id))
            p_cat = p_res.scalar_one_or_none()
            if p_cat:
                parent_name = p_cat.name

        keyboard: List[List[Dict[str, Any]]] = []

        for cat in categories:
            keyboard.append([
                {"text": cat.name, "callback_data": f"cat:{cat.id}:{node_id}"}
            ])

        promo = None
        if parent_category_id:
            promo = await TelegramEngine.get_active_promotion(db, trigger_event="category_specific", category_id=parent_category_id)
            keyboard.append([
                {"text": f"Start Exam in {parent_name}", "callback_data": f"ex_init:{parent_category_id}:{node_id}"}
            ])
            p_res = await db.execute(select(QuestionCategory).where(QuestionCategory.id == parent_category_id))
            curr = p_res.scalar_one_or_none()
            back_data = f"cat:{curr.parent_id}:{node_id}" if curr and curr.parent_id else f"cat_root:{node_id}"
            keyboard.append([{"text": "Back", "callback_data": back_data}])
        else:
            promo = await TelegramEngine.get_active_promotion(db, trigger_event="category_specific")
            keyboard.append([{"text": "Main Menu", "callback_data": "start_nav"}])

        if promo and promo.button_text and promo.button_url:
            p_url = await TelegramEngine.get_promotion_button_url(db, promo)
            if p_url:
                keyboard.insert(-1, [{"text": promo.button_text, "url": p_url}])

        text = f"Select Category\n\nCurrent Level: {parent_name}\nChoose a topic or standard below to continue."
        if promo and promo.content_text:
            text += f"\n\nAnnouncement:\n{promo.title}\n{promo.content_text}"
        return text, {"inline_keyboard": keyboard}

    @staticmethod
    async def get_category_descendant_ids(db: AsyncSession, root_id: str) -> List[str]:
        res = await db.execute(select(QuestionCategory.id, QuestionCategory.parent_id))
        all_rows = res.all()
        children_map: Dict[str, List[str]] = {}
        for cid, pid in all_rows:
            if pid:
                children_map.setdefault(pid, []).append(cid)

        collected = set()
        queue = [root_id]
        while queue:
            curr = queue.pop(0)
            if curr not in collected:
                collected.add(curr)
                for ch in children_map.get(curr, []):
                    queue.append(ch)
        return list(collected)

    @staticmethod
    async def source_questions(
        db: AsyncSession,
        category_id: str,
        strategy: str,
        difficulty: str,
        total_count: int,
        scope_mode: str = "include_subtopics",
    ) -> List[Question]:
        if scope_mode in ("exact_only", "exact_category_only"):
            target_ids = [category_id]
        else:
            target_ids = await TelegramEngine.get_category_descendant_ids(db, category_id)

        if strategy == "subject_wise":
            children_res = await db.execute(
                select(QuestionCategory.id).where(QuestionCategory.parent_id == category_id)
            )
            child_ids = [r[0] for r in children_res.all()]
            if child_ids:
                per_child = max(1, total_count // len(child_ids))
                selected_questions: List[Question] = []
                for ch_id in child_ids:
                    ch_family = await TelegramEngine.get_category_descendant_ids(db, ch_id)
                    q_query = select(Question).options(selectinload(Question.options)).where(Question.category_id.in_(ch_family))
                    if difficulty != "mixed":
                        q_query = q_query.where(Question.difficulty == difficulty.lower())
                    q_res = await db.execute(q_query)
                    pool = q_res.scalars().all()
                    if pool:
                        sample_count = min(len(pool), per_child)
                        selected_questions.extend(random.sample(pool, sample_count))

                if len(selected_questions) < total_count:
                    existing_ids = {q.id for q in selected_questions}
                    backup_query = select(Question).options(selectinload(Question.options)).where(
                        and_(Question.category_id.in_(target_ids), Question.id.notin_(existing_ids))
                    )
                    if difficulty != "mixed":
                        backup_query = backup_query.where(Question.difficulty == difficulty.lower())
                    b_res = await db.execute(backup_query)
                    rem_pool = b_res.scalars().all()
                    needed = total_count - len(selected_questions)
                    if rem_pool:
                        selected_questions.extend(random.sample(rem_pool, min(len(rem_pool), needed)))

                random.shuffle(selected_questions)
                return selected_questions[:total_count]

        base_query = select(Question).options(selectinload(Question.options)).where(Question.category_id.in_(target_ids))
        if difficulty != "mixed":
            base_query = base_query.where(Question.difficulty == difficulty.lower())
        res = await db.execute(base_query)
        pool = res.scalars().all()
        if not pool:
            fallback_res = await db.execute(
                select(Question).options(selectinload(Question.options)).where(Question.category_id.in_(target_ids))
            )
            pool = fallback_res.scalars().all()

        if not pool:
            return []

        sample_size = min(len(pool), total_count)
        return random.sample(pool, sample_size)

    @staticmethod
    async def create_and_start_exam(
        db: AsyncSession,
        user: TelegramUser,
        category_id: str,
        node: Optional[BotFlowNode],
        chat_id: Optional[int] = None,
        total_questions: int = 10,
        difficulty: str = "mixed",
        strategy: str = "random_overall",
    ) -> Optional[ExamSession]:
        scope_mode = node.scope_mode if node else "include_subtopics"
        questions = await TelegramEngine.source_questions(
            db=db,
            category_id=category_id,
            strategy=strategy,
            difficulty=difficulty,
            total_count=total_questions,
            scope_mode=scope_mode,
        )
        if not questions:
            return None

        q_ids = [q.id for q in questions]
        session = ExamSession(
            user_id=user.id,
            chat_id=chat_id,
            category_id=category_id,
            flow_node_id=node.id if node else None,
            strategy_used=strategy,
            difficulty=difficulty,
            total_questions=len(q_ids),
            current_index=0,
            question_ids=",".join(q_ids),
            max_score=float(len(q_ids)),
            status="in_progress",
        )
        db.add(session)
        now = utc_now()
        user.last_exam_at = now
        user.exams_in_quota_window = (user.exams_in_quota_window or 0) + 1
        await db.flush()
        return session

    @staticmethod
    async def send_exam_question_poll(
        db: AsyncSession,
        client: TelegramApiClient,
        chat_id: int,
        session: ExamSession,
    ) -> bool:
        if session.current_poll_message_id:
            await client.remove_message_buttons(chat_id, session.current_poll_message_id)

        q_ids = [x.strip() for x in session.question_ids.split(",") if x.strip()]
        if session.current_index >= len(q_ids):
            node_res = await db.execute(select(BotFlowNode).where(BotFlowNode.id == session.flow_node_id))
            node = node_res.scalar_one_or_none()
            user_res = await db.execute(select(TelegramUser).where(TelegramUser.id == session.user_id))
            user = user_res.scalar_one_or_none()
            card_text, card_kb = await TelegramEngine.complete_exam(db, session, user, node, client)
            await client.send_message(chat_id, card_text, reply_markup=card_kb)
            return False

        q_id = q_ids[session.current_index]
        q_res = await db.execute(
            select(Question)
            .options(selectinload(Question.options), selectinload(Question.category))
            .where(Question.id == q_id)
        )
        question = q_res.scalar_one_or_none()
        if not question or not question.options:
            session.current_index += 1
            await db.flush()
            return await TelegramEngine.send_exam_question_poll(db, client, chat_id, session)

        cat_name = question.category.name if question.category else "Exam"
        total = session.total_questions
        q_num = session.current_index + 1

        options_list: List[str] = []
        correct_idx = 0
        correct_opt_obj = None
        for i, opt in enumerate(question.options[:10]):
            opt_text = (opt.option_text or "").strip()[:100]
            if not opt_text:
                opt_text = f"Option {i + 1}"
            options_list.append(opt_text)
            if opt.is_correct:
                correct_idx = i
                correct_opt_obj = opt

        while len(options_list) < 2:
            options_list.append(f"Option {len(options_list) + 1}")

        explanation = ""
        if question.explanation and question.explanation.strip():
            explanation = question.explanation.strip()
        elif correct_opt_obj and correct_opt_obj.explanation and correct_opt_obj.explanation.strip():
            explanation = correct_opt_obj.explanation.strip()
        else:
            opt_exps = []
            for i, opt in enumerate(question.options[:10]):
                if opt.explanation and opt.explanation.strip():
                    opt_letter = chr(65 + i)
                    opt_exps.append(f"{opt_letter}: {opt.explanation.strip()}")
            if opt_exps:
                explanation = " | ".join(opt_exps)

        if explanation:
            explanation = explanation[:200]
        prompt = question.question.strip()

        poll_question = f"[{q_num}/{total}] {prompt}"
        if len(poll_question) > 300:
            header_msg = f"Question {q_num} of {total} • {cat_name}\nDifficulty: {question.difficulty.upper()}\n\n{prompt}"
            await client.send_message(chat_id, header_msg)
            poll_question = f"Select the correct answer for Question {q_num}:"

        reply_markup = {
            "inline_keyboard": [
                [
                    {"text": "Skip Question", "callback_data": f"skp:{session.id}:{session.current_index}"},
                    {"text": "End Exam", "callback_data": f"end:{session.id}"},
                ]
            ]
        }

        timer_sec = None
        if session.flow_node_id:
            node_res = await db.execute(select(BotFlowNode).where(BotFlowNode.id == session.flow_node_id))
            node = node_res.scalar_one_or_none()
            if node and node.timer_seconds and 5 <= node.timer_seconds <= 600:
                timer_sec = node.timer_seconds

        poll_resp = await client.send_poll(
            chat_id=chat_id,
            question=poll_question,
            options=options_list,
            correct_option_id=correct_idx,
            explanation=explanation if explanation else None,
            is_anonymous=False,
            poll_type="quiz",
            reply_markup=reply_markup,
            open_period=timer_sec,
        )

        if poll_resp.get("ok"):
            res_obj = poll_resp.get("result", {})
            poll_data = res_obj.get("poll", {})
            session.current_poll_id = str(poll_data.get("id"))
            session.current_poll_message_id = res_obj.get("message_id")
            session.chat_id = chat_id
            await db.flush()

            u_res = await db.execute(select(TelegramUser).where(TelegramUser.id == session.user_id))
            user = u_res.scalar_one_or_none()
            if user:
                return True
        else:
            q_text, q_kb = await TelegramEngine.build_question_display(db, session)
            await client.send_message(chat_id, q_text, reply_markup=q_kb)
            return True

    @staticmethod
    async def build_question_display(
        db: AsyncSession,
        session: ExamSession,
    ) -> Tuple[str, Dict[str, Any]]:
        q_ids = session.question_ids.split(",")
        idx = session.current_index
        if idx >= len(q_ids):
            return "Exam completed", {"inline_keyboard": []}

        q_id = q_ids[idx]
        q_res = await db.execute(
            select(Question).options(selectinload(Question.options), selectinload(Question.category)).where(Question.id == q_id)
        )
        question = q_res.scalar_one_or_none()
        if not question:
            return "Question not found", {"inline_keyboard": []}

        cat_name = question.category.name if question.category else "Exam"
        progress_bar = f"Question {idx + 1} of {session.total_questions}"

        text = (
            f"{progress_bar} • {cat_name}\n"
            f"Difficulty: {question.difficulty.upper()}\n\n"
            f"{question.question}"
        )

        letters = ["A", "B", "C", "D", "E", "F"]
        keyboard: List[List[Dict[str, Any]]] = []

        for opt_idx, opt in enumerate(question.options):
            label = f"{letters[opt_idx] if opt_idx < len(letters) else '•'} {opt.option_text}"
            cb = f"ans:{session.id}:{idx}:{opt.id}"
            keyboard.append([{"text": label, "callback_data": cb}])

        keyboard.append([
            {"text": "Skip Question", "callback_data": f"skp:{session.id}:{idx}"},
            {"text": "End Exam", "callback_data": f"end:{session.id}"}
        ])

        return text, {"inline_keyboard": keyboard}

    @staticmethod
    async def complete_exam(
        db: AsyncSession,
        session: ExamSession,
        user: Optional[TelegramUser],
        node: Optional[BotFlowNode] = None,
        client: Optional[TelegramApiClient] = None,
    ) -> Tuple[str, Dict[str, Any]]:
        now = utc_now()
        session.status = "completed"
        session.completed_at = now
        if client and session.current_poll_message_id and session.chat_id:
            await client.remove_message_buttons(session.chat_id, session.current_poll_message_id)

        setting_obj = await TelegramEngine.get_settings(db)
        if node and node.negative_marking_rate is not None and float(node.negative_marking_rate) > 0:
            neg_rate = float(node.negative_marking_rate)
        elif setting_obj and setting_obj.default_negative_marking is not None and float(setting_obj.default_negative_marking) > 0:
            neg_rate = float(setting_obj.default_negative_marking)
        else:
            neg_rate = 0.00

        calculated_score = max(0.00, float(session.correct_count) - (float(session.wrong_count) * neg_rate))
        session.score = calculated_score
        total = max(1, session.total_questions)
        session.accuracy_percentage = round((session.correct_count / total) * 100, 2)
        if user:
            user.last_exam_at = now
            user.flow_state = "idle"
            user.current_flow_node_id = None
            user.last_active_session_id = None
            await db.flush()

        cat_name = "General Assessment"
        if session.category_id:
            c_res = await db.execute(select(QuestionCategory.name).where(QuestionCategory.id == session.category_id))
            row = c_res.first()
            if row:
                cat_name = row[0]

        card = (
            f"Exam Completed\n\n"
            f"Subject / Category: {cat_name}\n"
            f"Final Score: {session.score:.2f} / {session.max_score:.2f}\n"
            f"Accuracy: {session.accuracy_percentage:.1f}%\n\n"
            f"Correct: {session.correct_count}\n"
            f"Incorrect: {session.wrong_count}"
        )
        if neg_rate > 0:
            card += f" (-{neg_rate:.2f} per wrong)"
        card += f"\nSkipped: {session.skipped_count}\n"

        promo = await TelegramEngine.get_active_promotion(db, trigger_event="after_exam", category_id=session.category_id)
        if promo:
            p_text = promo.content_text or ""
            if user:
                quota_stats = await TelegramEngine.get_user_quota_stats(db, user, setting_obj)
                p_text = TelegramEngine.render_text_template(p_text, user, quota_stats)
            card += f"\n--------------------\n{promo.title}\n{p_text}\n"

        keyboard: List[List[Dict[str, Any]]] = [
            [{"text": "View Explanations & Review", "callback_data": f"rev:{session.id}"}],
        ]

        if promo and promo.button_text and promo.button_url:
            p_url = await TelegramEngine.get_promotion_button_url(db, promo, setting_obj)
            if p_url:
                keyboard.append([{"text": promo.button_text, "url": p_url}])

        keyboard.append([
            {"text": "Take Another Exam", "callback_data": "start_nav"},
            {"text": "Main Menu", "callback_data": "start_nav"}
        ])

        return card, {"inline_keyboard": keyboard}

    @staticmethod
    async def build_explanation_messages(
        db: AsyncSession,
        session_id: int,
    ) -> List[Tuple[str, Optional[Dict[str, Any]]]]:
        s_res = await db.execute(
            select(ExamSession)
            .options(selectinload(ExamSession.answers))
            .where(ExamSession.id == session_id)
        )
        session = s_res.scalar_one_or_none()
        if not session:
            return [("Session not found", None)]

        ans_res = await db.execute(
            select(ExamAnswer).where(ExamAnswer.session_id == session_id).order_by(ExamAnswer.id)
        )
        answers = ans_res.scalars().all()
        if not answers:
            return [("No recorded answers found for this session.", None)]

        cat_name = "Exam"
        if session.category_id:
            c_res = await db.execute(select(QuestionCategory.name).where(QuestionCategory.id == session.category_id))
            row = c_res.first()
            if row:
                cat_name = row[0]

        messages: List[str] = []
        current_chunk = (
            f"Detailed Exam Explanations\n"
            f"Subject: {cat_name}\n"
            f"Final Score: {session.score:.2f} / {session.max_score:.2f} ({session.accuracy_percentage:.1f}%)\n"
            f"Total Questions: {len(answers)}\n\n"
        )

        for idx, ans in enumerate(answers, start=1):
            q_res = await db.execute(
                select(Question).options(selectinload(Question.options)).where(Question.id == ans.question_id)
            )
            q = q_res.scalar_one_or_none()
            if not q:
                continue

            correct_opt = next((o for o in q.options if o.is_correct), None)
            sel_opt = next((o for o in q.options if o.id == ans.selected_option_id), None)

            if ans.is_correct:
                status_icon = "Correct (+1.0)"
            elif not ans.selected_option_id:
                status_icon = "Skipped (0.0)"
            else:
                status_icon = f"Incorrect ({ans.points_awarded:.2f})"

            block = (
                f"Q{idx}. {q.question}\n"
                f"Status: {status_icon}\n"
                f"Your Answer: {sel_opt.option_text if sel_opt else 'Skipped'}\n"
                f"Correct Answer: {correct_opt.option_text if correct_opt else 'N/A'}\n"
            )
            has_opt_exps = any(bool(o.explanation and o.explanation.strip()) for o in q.options)
            if has_opt_exps:
                block += "Options & Explanations:\n"
                for o_i, opt in enumerate(q.options):
                    letter = chr(65 + o_i)
                    mark = " (Correct)" if opt.is_correct else ""
                    user_picked = " [Your Choice]" if opt.id == ans.selected_option_id else ""
                    block += f"  {letter}. {opt.option_text}{mark}{user_picked}\n"
                    if opt.explanation and opt.explanation.strip():
                        block += f"     Explanation: {opt.explanation.strip()}\n"
            if q.explanation and q.explanation.strip():
                block += f"General Explanation: {q.explanation.strip()}\n"
            elif not has_opt_exps and correct_opt and correct_opt.explanation and correct_opt.explanation.strip():
                block += f"Explanation: {correct_opt.explanation.strip()}\n"
            block += "--------------------\n"

            if len(current_chunk) + len(block) > 3400:
                messages.append(current_chunk)
                current_chunk = f"Explanations (Continued - Part {len(messages) + 1})\n\n" + block
            else:
                current_chunk += block

        if current_chunk.strip():
            messages.append(current_chunk)

        result: List[Tuple[str, Optional[Dict[str, Any]]]] = []
        for i, msg_text in enumerate(messages):
            is_last = (i == len(messages) - 1)
            kb = None
            if is_last:
                kb = {
                    "inline_keyboard": [
                        [{"text": "Main Menu", "callback_data": "start_nav"}]
                    ]
                }
            result.append((msg_text, kb))

        return result

    @staticmethod
    async def execute_node_action(
        db: AsyncSession,
        client: TelegramApiClient,
        user: TelegramUser,
        setting: BotSetting,
        node: BotFlowNode,
        chat_id: int,
        message_id: Optional[int] = None,
    ) -> None:
        if node.action_type == "category_browse":
            user.flow_state = "in_flow"
            user.current_flow_node_id = node.id
            await db.flush()
            body, kb = await TelegramEngine.build_category_hierarchy_keyboard(db, node.category_id, node.id)
            if message_id:
                await client.edit_message_text(chat_id, message_id, body, reply_markup=kb)
            else:
                await client.send_message(chat_id, body, reply_markup=kb)

        elif node.action_type == "start_exam":
            can_take, quota_msg = await TelegramEngine.check_user_quota(db, user, setting)
            if not can_take and quota_msg:
                limit_text, limit_kb = await TelegramEngine.build_limit_reached_response(
                    db, user, setting, quota_msg, node.category_id
                )
                if message_id:
                    await client.edit_message_text(chat_id, message_id, limit_text, reply_markup=limit_kb)
                else:
                    await client.send_message(chat_id, limit_text, reply_markup=limit_kb)
                return

            if not node.category_id:
                msg_err = f"No question category configured for exam '{node.label}'. Please select a category in the flow node settings."
                kb_err = [[{"text": "Back", "callback_data": f"fn:{node.parent_id}" if node.parent_id else "start_nav"}]]
                if message_id:
                    await client.edit_message_text(chat_id, message_id, msg_err, reply_markup={"inline_keyboard": kb_err})
                else:
                    await client.send_message(chat_id, msg_err, reply_markup={"inline_keyboard": kb_err})
                return

            if node.question_count_mode == "ask_user":
                c_res = await db.execute(select(QuestionCategory).where(QuestionCategory.id == node.category_id))
                cat = c_res.scalar_one_or_none()
                cat_name = cat.name if cat else node.label
                presets = [int(x.strip()) for x in setting.default_count_presets.split(",") if x.strip().isdigit()]
                if not presets:
                    presets = [5, 10, 20, 25]
                count_keyboard: List[List[Dict[str, Any]]] = []
                temp_row: List[Dict[str, Any]] = []
                for c in presets:
                    temp_row.append({"text": f"{c} Questions", "callback_data": f"ex_cnt:{node.category_id}:{node.id}:{c}"})
                    if len(temp_row) == 2:
                        count_keyboard.append(temp_row)
                        temp_row = []
                if temp_row:
                    count_keyboard.append(temp_row)
                back_cb = f"fn:{node.parent_id}" if node.parent_id else "start_nav"
                count_keyboard.append([{"text": "Back", "callback_data": back_cb}])
                text_config = (
                    f"Exam Setup • Step 1 of 2\n\n"
                    f"Subject: {cat_name}\n\n"
                    f"Select question quantity:"
                )
                promo_node = None
                if node.category_id:
                    promo_node = await TelegramEngine.get_active_promotion(db, trigger_event="category_specific", category_id=node.category_id)
                if promo_node:
                    if promo_node.content_text:
                        text_config += f"\n\nAnnouncement:\n{promo_node.title}\n{promo_node.content_text}"
                    if promo_node.button_text and promo_node.button_url:
                        p_url = await TelegramEngine.get_promotion_button_url(db, promo_node, setting)
                        if p_url:
                            count_keyboard.insert(-1, [{"text": promo_node.button_text, "url": p_url}])
                if message_id:
                    await client.edit_message_text(chat_id, message_id, text_config, reply_markup={"inline_keyboard": count_keyboard})
                else:
                    res = await client.send_message(chat_id, text_config, reply_markup={"inline_keyboard": count_keyboard})
                    if res.get("ok"):
                        user.last_message_id = res.get("result", {}).get("message_id")
                        await db.flush()
                return

            if node.difficulty_mode == "ask_user":
                c_res = await db.execute(select(QuestionCategory).where(QuestionCategory.id == node.category_id))
                cat = c_res.scalar_one_or_none()
                cat_name = cat.name if cat else node.label
                count_val = node.fixed_count if node.fixed_count > 0 else 10
                diff_keyboard = [
                    [{"text": "Mixed (All Difficulty Levels)", "callback_data": f"ex_diff:{node.category_id}:{node.id}:{count_val}:mixed"}],
                    [
                        {"text": "Easy", "callback_data": f"ex_diff:{node.category_id}:{node.id}:{count_val}:easy"},
                        {"text": "Medium", "callback_data": f"ex_diff:{node.category_id}:{node.id}:{count_val}:medium"},
                    ],
                    [
                        {"text": "Hard", "callback_data": f"ex_diff:{node.category_id}:{node.id}:{count_val}:hard"},
                        {"text": "Expert", "callback_data": f"ex_diff:{node.category_id}:{node.id}:{count_val}:expert"},
                    ],
                    [{"text": "Back", "callback_data": f"fn:{node.parent_id}" if node.parent_id else "start_nav"}]
                ]
                text_diff = (
                    f"Exam Setup: {cat_name}\n\n"
                    f"Selected Quantity: {count_val} Questions\n\n"
                    f"Select question difficulty level:"
                )
                if message_id:
                    await client.edit_message_text(chat_id, message_id, text_diff, reply_markup={"inline_keyboard": diff_keyboard})
                else:
                    res = await client.send_message(chat_id, text_diff, reply_markup={"inline_keyboard": diff_keyboard})
                    if res.get("ok"):
                        user.last_message_id = res.get("result", {}).get("message_id")
                        await db.flush()
                return

            if message_id:
                await client.remove_message_buttons(chat_id, message_id)

            session = await TelegramEngine.create_and_start_exam(
                db=db,
                user=user,
                category_id=node.category_id,
                node=node,
                chat_id=chat_id,
                total_questions=node.fixed_count if node.fixed_count > 0 else 10,
                difficulty=node.fixed_difficulty or "mixed",
                strategy=node.picking_strategy or "random_overall",
            )
            if session:
                user.flow_state = "in_exam"
                user.current_flow_node_id = node.id
                await db.flush()
                await TelegramEngine.send_exam_question_poll(db, client, chat_id, session)
            else:
                msg_err = "No questions found matching this exam configuration.\nPlease assign questions to this category first."
                if message_id:
                    await client.edit_message_text(chat_id, message_id, msg_err, reply_markup={"inline_keyboard": [[{"text": "Main Menu", "callback_data": "start_nav"}]]})
                else:
                    await client.send_message(chat_id, msg_err, reply_markup={"inline_keyboard": [[{"text": "Main Menu", "callback_data": "start_nav"}]]})

        elif node.action_type == "limits_check":
            user.flow_state = "in_flow"
            user.current_flow_node_id = node.id
            user.last_message_id = message_id
            await db.flush()
            quota_stats = await TelegramEngine.get_user_quota_stats(db, user, setting)
            if node.content_text and node.content_text.strip():
                body = TelegramEngine.render_text_template(node.content_text.strip(), user, quota_stats)
            else:
                vip_status = "Active (Unlimited Access)" if user.is_vip else "Standard"
                cooldown_display = quota_stats.get("cooldown_remaining", "0s")
                if cooldown_display == "0s":
                    cooldown_display = "Ready (No Cooldown)"
                body = (
                    f"Account Limits & Quota Status\n\n"
                    f"Candidate: {user.first_name}\n"
                    f"Account Tier: {vip_status}\n\n"
                    f"Remaining Exams: {quota_stats.get('remaining_exams')} of {quota_stats.get('max_exams')}\n"
                    f"Attempt Cooldown: {cooldown_display}\n"
                    f"Quota Reset In: {quota_stats.get('quota_reset_in')}"
                )

            promo = await TelegramEngine.get_active_promotion(
                db,
                trigger_event="on_limit_reached" if quota_stats.get("remaining_exams") == "0" else "on_start"
            )
            keyboard_dict = await TelegramEngine.build_flow_node_keyboard(db, node)
            kb_list = keyboard_dict.get("inline_keyboard", [])

            if promo:
                p_text = TelegramEngine.render_text_template(promo.content_text or "", user, quota_stats).strip()
                title = (promo.title or "").strip()
                if title and p_text:
                    body += f"\n\n--------------------\n{title}\n{p_text}"
                elif title:
                    body += f"\n\n--------------------\n{title}"
                elif p_text:
                    body += f"\n\n--------------------\n{p_text}"

                if promo.button_text and promo.button_url:
                    p_url = await TelegramEngine.get_promotion_button_url(db, promo, setting)
                    if p_url:
                        kb_list.insert(0, [{"text": promo.button_text, "url": p_url}])

            if message_id:
                await client.edit_message_text(chat_id, message_id, body, reply_markup={"inline_keyboard": kb_list})
            else:
                res = await client.send_message(chat_id, body, reply_markup={"inline_keyboard": kb_list})
                if res.get("ok"):
                    user.last_message_id = res.get("result", {}).get("message_id")
                    await db.flush()

        else:
            user.flow_state = "in_flow"
            user.current_flow_node_id = node.id
            user.last_message_id = message_id
            await db.flush()
            content = node.content_text or f"{node.label}"
            body = TelegramEngine.render_text_template(content, user)
            kb = await TelegramEngine.build_flow_node_keyboard(db, node)
            if message_id:
                await client.edit_message_text(chat_id, message_id, body, reply_markup=kb)
            else:
                await client.send_message(chat_id, body, reply_markup=kb)

    @staticmethod
    async def check_and_handle_onboarding(
        db: AsyncSession,
        client: TelegramApiClient,
        user: TelegramUser,
        setting: BotSetting,
        chat_id: int,
        message_id: Optional[int] = None,
        cb_id: Optional[str] = None,
        callback_data: Optional[str] = None,
        is_message: bool = False
    ) -> bool:
        if not setting.onboarding_enabled or not setting.onboarding_config:
            return False

        try:
            config = json.loads(setting.onboarding_config)
            steps = config.get("steps", [])
            if not steps:
                return False
        except Exception:
            return False

        profile_data = {}
        if user.profile_data:
            try:
                profile_data = json.loads(user.profile_data)
            except Exception:
                pass

        if callback_data and callback_data.startswith("onb:"):
            parts = callback_data.split(":", 2)
            if len(parts) == 3:
                step_id = parts[1]
                value = parts[2]
                profile_data[step_id] = value
                user.profile_data = json.dumps(profile_data)
                await db.flush()
                if cb_id:
                    await client.answer_callback_query(cb_id)

        def get_next_step(current_step: Dict[str, Any], current_profile: Dict[str, Any]) -> Optional[Dict[str, Any]]:
            if current_step.get("id") not in current_profile:
                return current_step
            selected_val = current_profile.get(current_step["id"])
            for opt in current_step.get("options", []):
                if opt.get("value") == selected_val:
                    if opt.get("next_step"):
                        return get_next_step(opt["next_step"], current_profile)
                    else:
                        return None
            return current_step

        next_step = None
        if steps:
            for root_step in steps:
                candidate = get_next_step(root_step, profile_data)
                if candidate:
                    active_opts = [o for o in candidate.get("options", []) if o.get("is_active", True) is not False]
                    if active_opts:
                        next_step = candidate
                        break

        if not next_step:
            if callback_data and callback_data.startswith("onb:"):
                user.flow_state = "idle"
                user.current_flow_node_id = None
                await db.flush()
                body, kb = await TelegramEngine.build_start_menu(db, user, setting)
                if message_id:
                    await client.edit_message_text(chat_id, message_id, body, reply_markup=kb)
                else:
                    res = await client.send_message(chat_id, body, reply_markup=kb)
                    if res.get("ok"):
                        user.last_message_id = res.get("result", {}).get("message_id")
                        await db.flush()
                return True
            return False

        text = next_step.get("label", "Please complete your profile:")
        kb = []
        for opt in next_step.get("options", []):
            if opt.get("is_active", True) is False:
                continue
            kb.append([{"text": opt.get("label", ""), "callback_data": f"onb:{next_step.get('id')}:{opt.get('value')}"[:64]}])
        
        reply_markup = {"inline_keyboard": kb}
        
        if is_message and message_id:
            await client.delete_message(chat_id, message_id)
            res = await client.send_message(chat_id, text, reply_markup=reply_markup)
            if res.get("ok"):
                user.last_message_id = res.get("result", {}).get("message_id")
                await db.flush()
        else:
            if message_id:
                await client.edit_message_text(chat_id, message_id, text, reply_markup=reply_markup)
            else:
                res = await client.send_message(chat_id, text, reply_markup=reply_markup)
                if res.get("ok"):
                    user.last_message_id = res.get("result", {}).get("message_id")
                    await db.flush()
        return True

    @staticmethod
    async def handle_update(
        db: AsyncSession,
        update: Dict[str, Any],
        setting: BotSetting,
    ) -> None:
        client = TelegramApiClient(token=setting.bot_token)

        chat = None
        if "message" in update:
            chat = update["message"].get("chat")
        elif "callback_query" in update:
            chat = update["callback_query"].get("message", {}).get("chat")
        elif "channel_post" in update:
            chat = update["channel_post"].get("chat")
        elif "edited_message" in update:
            chat = update["edited_message"].get("chat")
        elif "edited_channel_post" in update:
            chat = update["edited_channel_post"].get("chat")
        elif "my_chat_member" in update:
            chat = update["my_chat_member"].get("chat")
        elif "chat_member" in update:
            chat = update["chat_member"].get("chat")

        if chat and chat.get("type") in ["group", "supergroup", "channel"]:
            is_allowed = False
            if setting.group_access_mode == "allowed_only" and setting.allowed_group_ids:
                chat_id_str = str(chat.get("id", ""))
                chat_username = str(chat.get("username", "")).lower().lstrip("@")
                allowed_items = [x.strip().lower() for x in setting.allowed_group_ids.replace("\n", ",").split(",") if x.strip()]
                for item in allowed_items:
                    clean_item = item.lstrip("@")
                    if item == chat_id_str or clean_item == chat_username:
                        is_allowed = True
                        break

            if not is_allowed:
                chat_id = chat.get("id")
                if chat_id:
                    await client.leave_chat(chat_id)
                if "callback_query" in update:
                    cb_id = update["callback_query"].get("id")
                    if cb_id:
                        await client.answer_callback_query(
                            cb_id,
                            text="This bot is only available in direct private chat or authorized groups.",
                            show_alert=True,
                        )
                return

            if setting.group_commands_in_private:
                if "message" in update:
                    msg = update["message"]
                    text_val = (msg.get("text") or "").strip()
                    if text_val.startswith("/"):
                        from_user = msg.get("from", {})
                        fname = from_user.get("first_name", "there")
                        tpl = setting.group_redirect_message or "👋 Hello {name}! To protect candidate privacy and prevent group clutter, exams and bot commands are conducted in direct private chat."
                        reply_text = tpl.replace("{name}", fname)
                        bot_uname = (setting.bot_username or "").lstrip("@")
                        kb = {"inline_keyboard": [[{"text": "Open in Private Chat", "url": f"https://t.me/{bot_uname}?start=from_group"}]]} if bot_uname else None
                        await client.send_message(
                            chat.get("id"),
                            reply_text,
                            reply_markup=kb,
                            reply_to_message_id=msg.get("message_id")
                        )
                        return
                elif "callback_query" in update:
                    cb_id = update["callback_query"].get("id")
                    if cb_id:
                        await client.answer_callback_query(
                            cb_id,
                            text="Please open the bot in direct private chat to interact.",
                            show_alert=True,
                        )
                    return

        if "poll_answer" in update:
            pa = update["poll_answer"]
            poll_id = str(pa.get("poll_id"))
            tg_user_info = pa.get("user", {})
            chosen_options = pa.get("option_ids", [])
            selected_opt_idx = chosen_options[0] if chosen_options else None

            res = await db.execute(
                select(ExamSession)
                .where(and_(ExamSession.current_poll_id == poll_id, ExamSession.status == "in_progress"))
            )
            session = res.scalar_one_or_none()

            if not session and tg_user_info.get("id"):
                user_res = await db.execute(select(TelegramUser).where(TelegramUser.telegram_id == tg_user_info["id"]))
                t_user = user_res.scalar_one_or_none()
                if t_user:
                    s_res = await db.execute(
                        select(ExamSession)
                        .where(and_(ExamSession.user_id == t_user.id, ExamSession.status == "in_progress"))
                        .order_by(desc(ExamSession.id))
                        .limit(1)
                    )
                    session = s_res.scalar_one_or_none()

            if not session:
                return

            chat_id = session.chat_id or tg_user_info.get("id")

            if session.current_poll_message_id and chat_id:
                await client.remove_message_buttons(chat_id, session.current_poll_message_id)

            u_res = await db.execute(select(TelegramUser).where(TelegramUser.id == session.user_id))
            user = u_res.scalar_one_or_none()
            if user and user.is_blocked:
                return

            q_ids = [x.strip() for x in session.question_ids.split(",") if x.strip()]

            if session.current_index < len(q_ids):
                curr_q_id = q_ids[session.current_index]
                q_res = await db.execute(
                    select(Question).options(selectinload(Question.options)).where(Question.id == curr_q_id)
                )
                question = q_res.scalar_one_or_none()
                if question:
                    opt_id = None
                    is_correct = False
                    pts = 0.00
                    if selected_opt_idx is not None and selected_opt_idx < len(question.options):
                        chosen_opt = question.options[selected_opt_idx]
                        opt_id = chosen_opt.id
                        if chosen_opt.is_correct:
                            is_correct = True
                            pts = 1.00
                            session.correct_count += 1
                        else:
                            session.wrong_count += 1
                            node_res = await db.execute(select(BotFlowNode).where(BotFlowNode.id == session.flow_node_id))
                            node_obj = node_res.scalar_one_or_none()
                            setting_obj = await TelegramEngine.get_settings(db)
                            neg_rate = float(node_obj.negative_marking_rate) if (node_obj and node_obj.negative_marking_rate is not None and float(node_obj.negative_marking_rate) > 0) else (float(setting_obj.default_negative_marking) if setting_obj and setting_obj.default_negative_marking is not None else 0.00)
                            pts = -neg_rate
                    else:
                        session.skipped_count += 1

                    answer = ExamAnswer(
                        session_id=session.id,
                        question_id=curr_q_id,
                        selected_option_id=opt_id,
                        is_correct=is_correct,
                        points_awarded=pts,
                    )
                    db.add(answer)

                    session.current_index += 1
                    await db.flush()

            await TelegramEngine.send_exam_question_poll(db, client, chat_id, session)

        elif "message" in update:
            msg = update["message"]
            chat_id = msg["chat"]["id"]
            user = await TelegramEngine.get_or_create_user(db, msg.get("from", {}))
            if user.is_blocked:
                await client.send_message(
                    chat_id,
                    "Your account has been suspended by administration. Access to this bot is restricted."
                )
                return

            if msg.get("chat", {}).get("type") == "private" and setting.force_join_enabled:
                is_joined, unjoined = await TelegramEngine.check_force_join_membership(client, user.telegram_id, setting)
                if not is_joined:
                    card_text, card_kb = TelegramEngine.build_force_join_card(setting, unjoined)
                    res = await client.send_message(chat_id, card_text, reply_markup=card_kb)
                    if res.get("ok"):
                        user.last_message_id = res.get("result", {}).get("message_id")
                        await db.flush()
                    return

            if await TelegramEngine.check_and_handle_onboarding(
                db, client, user, setting, chat_id, message_id=msg.get("message_id"), is_message=True
            ):
                return

            text = (msg.get("text") or "").strip()

            if text.startswith("/"):
                cmd = text.split()[0].lower()
                if cmd == "/start":
                    if user.last_message_id and chat_id:
                        await client.delete_message(chat_id, user.last_message_id)

                    active_sess_res = await db.execute(
                        select(ExamSession)
                        .where(and_(ExamSession.user_id == user.id, ExamSession.status == "in_progress"))
                        .order_by(desc(ExamSession.id))
                        .limit(1)
                    )
                    active_sess = active_sess_res.scalar_one_or_none()
                    if active_sess:
                        active_sess.chat_id = chat_id
                        await db.flush()
                        resume_kb = [
                            [{"text": f"Resume Active Exam ({active_sess.current_index + 1}/{active_sess.total_questions})", "callback_data": f"res_exam:{active_sess.id}"}],
                            [{"text": "Abandon & Start New", "callback_data": f"end:{active_sess.id}"}],
                        ]
                        res = await client.send_message(chat_id, "You have an exam session currently in progress.\nWould you like to resume?", reply_markup={"inline_keyboard": resume_kb})
                        if res.get("ok"):
                            user.last_message_id = res.get("result", {}).get("message_id")
                            await db.flush()
                        return

                    user.flow_state = "idle"
                    user.current_flow_node_id = None
                    user.last_active_session_id = None
                    await db.flush()
                    body, kb = await TelegramEngine.build_start_menu(db, user, setting)
                    res = await client.send_message(chat_id, body, reply_markup=kb)
                    if res.get("ok"):
                        user.last_message_id = res.get("result", {}).get("message_id")
                        await db.flush()
                        return

                node_res = await db.execute(
                    select(BotFlowNode)
                    .where(and_(func.lower(BotFlowNode.trigger_command) == cmd, BotFlowNode.is_active.is_(True)))
                    .limit(1)
                )
                matched_node = node_res.scalar_one_or_none()
                if not matched_node and cmd in ["/limits", "/quota", "/limit"]:
                    lim_res = await db.execute(
                        select(BotFlowNode)
                        .where(and_(BotFlowNode.action_type == "limits_check", BotFlowNode.is_active.is_(True)))
                        .limit(1)
                    )
                    matched_node = lim_res.scalar_one_or_none()
                if matched_node:
                    if user.last_message_id and chat_id:
                        await client.delete_message(chat_id, user.last_message_id)
                        await TelegramEngine.execute_node_action(db, client, user, setting, matched_node, chat_id)
                    return

                if user.last_message_id and chat_id:
                    await client.delete_message(chat_id, user.last_message_id)
                body, kb = await TelegramEngine.build_start_menu(db, user, setting)
                res = await client.send_message(chat_id, body, reply_markup=kb)
                if res.get("ok"):
                    user.last_message_id = res.get("result", {}).get("message_id")
                    await db.flush()
            else:
                label_match_res = await db.execute(
                    select(BotFlowNode)
                    .where(and_(func.lower(BotFlowNode.label) == text.lower(), BotFlowNode.is_active.is_(True)))
                    .limit(1)
                )
                matched_node = label_match_res.scalar_one_or_none()
                if matched_node:
                    if user.last_message_id and chat_id:
                        await client.delete_message(chat_id, user.last_message_id)
                        await TelegramEngine.execute_node_action(db, client, user, setting, matched_node, chat_id)
                else:
                    if user.last_message_id and chat_id:
                        await client.delete_message(chat_id, user.last_message_id)
                    body, kb = await TelegramEngine.build_start_menu(db, user, setting)
                    res = await client.send_message(chat_id, body, reply_markup=kb)
                    if res.get("ok"):
                        user.last_message_id = res.get("result", {}).get("message_id")
                        await db.flush()

        elif "callback_query" in update:
            cb = update["callback_query"]
            cb_id = cb["id"]
            data = cb.get("data") or ""
            msg = cb.get("message") or {}
            chat_id = msg.get("chat", {}).get("id")
            msg_id = msg.get("message_id")
            user = await TelegramEngine.get_or_create_user(db, cb.get("from", {}))
            if user.is_blocked:
                await client.answer_callback_query(
                    cb_id,
                    text="Your account has been suspended by administration.",
                    show_alert=True
                )
                if msg_id and chat_id:
                    await client.remove_message_buttons(chat_id, msg_id)
                return

            if data == "verify_membership":
                is_joined, unjoined = await TelegramEngine.check_force_join_membership(client, user.telegram_id, setting)
                if is_joined:
                    await client.answer_callback_query(cb_id, text="Membership verified! Welcome to the portal.")
                    body, kb = await TelegramEngine.build_start_menu(db, user, setting)
                    if msg_id and chat_id:
                        await client.edit_message_text(chat_id, msg_id, body, reply_markup=kb)
                    else:
                        await client.send_message(chat_id, body, reply_markup=kb)
                else:
                    await client.answer_callback_query(
                        cb_id,
                        text="You have not joined all required channels/groups yet. Please join and try again.",
                        show_alert=True
                    )
                return

            if msg.get("chat", {}).get("type") == "private" and setting.force_join_enabled:
                is_joined, unjoined = await TelegramEngine.check_force_join_membership(client, user.telegram_id, setting)
                if not is_joined:
                    await client.answer_callback_query(
                        cb_id,
                        text="Please join all required channels/groups first to unlock access.",
                        show_alert=True
                    )
                    card_text, card_kb = TelegramEngine.build_force_join_card(setting, unjoined)
                    if msg_id and chat_id:
                        await client.edit_message_text(chat_id, msg_id, card_text, reply_markup=card_kb)
                    return

            if await TelegramEngine.check_and_handle_onboarding(
                db, client, user, setting, chat_id, message_id=msg_id, cb_id=cb_id, callback_data=data, is_message=False
            ):
                return

            active_sess_res = await db.execute(
                select(ExamSession)
                .where(and_(ExamSession.user_id == user.id, ExamSession.status == "in_progress"))
                .order_by(desc(ExamSession.id))
                .limit(1)
            )
            active_sess = active_sess_res.scalar_one_or_none()

            is_exam_action = (
                data.startswith("skp:") or
                data.startswith("end:") or
                data.startswith("res_exam:") or
                data.startswith("ans:")
            )

            if active_sess and not is_exam_action:
                await client.answer_callback_query(
                    cb_id,
                    text="Exam is currently in progress. Please complete or end your active exam first.",
                    show_alert=True
                )
                if msg_id:
                    await client.remove_message_buttons(chat_id, msg_id)
                    return

            if data == "start_nav" or data.startswith("fn_root"):
                await client.answer_callback_query(cb_id)
                user.flow_state = "idle"
                user.current_flow_node_id = None
                user.last_active_session_id = None
                await db.flush()
                body, kb = await TelegramEngine.build_start_menu(db, user, setting)
                msg_text = msg.get("text") or ""
                is_result_or_explanation = (
                    "Exam Completed" in msg_text or
                    "Detailed Exam Explanations" in msg_text or
                    "Explanations (Continued" in msg_text
                )

                if msg_id and not is_result_or_explanation:
                    await client.edit_message_text(chat_id, msg_id, body, reply_markup=kb)
                    user.last_message_id = msg_id
                    await db.flush()
                else:
                    if msg_id and is_result_or_explanation:
                        await client.remove_message_buttons(chat_id, msg_id)
                    elif user.last_message_id and chat_id:
                        await client.delete_message(chat_id, user.last_message_id)
                    res = await client.send_message(chat_id, body, reply_markup=kb)
                    if res.get("ok"):
                        user.last_message_id = res.get("result", {}).get("message_id")
                        await db.flush()
            elif data.startswith("fn:"):
                await client.answer_callback_query(cb_id)
                node_id = int(data.split(":")[1])
                node_res = await db.execute(select(BotFlowNode).where(BotFlowNode.id == node_id))
                node = node_res.scalar_one_or_none()
                if node:
                    user.flow_state = "in_flow"
                    user.current_flow_node_id = node.id
                    user.last_message_id = msg_id
                    await db.flush()
                    await TelegramEngine.execute_node_action(db, client, user, setting, node, chat_id, msg_id)

            elif data.startswith("cat:"):
                await client.answer_callback_query(cb_id)
                parts = data.split(":")
                cat_id = parts[1] if parts[1] != "None" else None
                node_id = int(parts[2])
                user.flow_state = "in_flow"
                user.current_flow_node_id = node_id
                user.last_message_id = msg_id
                await db.flush()
                body, kb = await TelegramEngine.build_category_hierarchy_keyboard(db, cat_id, node_id)
                await client.edit_message_text(chat_id, msg_id, body, reply_markup=kb)

            elif data.startswith("cat_root:"):
                await client.answer_callback_query(cb_id)
                node_id = int(data.split(":")[1])
                user.flow_state = "in_flow"
                user.current_flow_node_id = node_id
                user.last_message_id = msg_id
                await db.flush()
                body, kb = await TelegramEngine.build_category_hierarchy_keyboard(db, None, node_id)
                await client.edit_message_text(chat_id, msg_id, body, reply_markup=kb)

            elif data.startswith("ex_init:"):
                await client.answer_callback_query(cb_id)
                parts = data.split(":")
                cat_id = parts[1] if parts[1] != "None" else None
                node_id = int(parts[2]) if parts[2] != "None" else 0

                can_take, quota_msg = await TelegramEngine.check_user_quota(db, user, setting)
                if not can_take and quota_msg:
                    limit_text, limit_kb = await TelegramEngine.build_limit_reached_response(
                        db, user, setting, quota_msg, cat_id
                    )
                    if msg_id:
                        await client.edit_message_text(chat_id, msg_id, limit_text, reply_markup=limit_kb)
                    else:
                        await client.send_message(chat_id, limit_text, reply_markup=limit_kb)
                    return

                cat_name = "Exam"
                if cat_id:
                    c_res = await db.execute(select(QuestionCategory).where(QuestionCategory.id == cat_id))
                    cat = c_res.scalar_one_or_none()
                    if cat:
                        cat_name = cat.name

                presets = [int(x.strip()) for x in setting.default_count_presets.split(",") if x.strip().isdigit()]
                if not presets:
                    presets = [5, 10, 20, 25]

                count_keyboard: List[List[Dict[str, Any]]] = []
                temp_row: List[Dict[str, Any]] = []
                for c in presets:
                    temp_row.append({"text": f"{c} Questions", "callback_data": f"ex_cnt:{cat_id}:{node_id}:{c}"})
                    if len(temp_row) == 2:
                        count_keyboard.append(temp_row)
                        temp_row = []
                if temp_row:
                    count_keyboard.append(temp_row)

                back_cb = f"cat:{cat_id}:{node_id}" if cat_id else (f"fn:{node_id}" if node_id > 0 else "start_nav")
                count_keyboard.append([{"text": "Back", "callback_data": back_cb}])

                text_config = (
                    f"Exam Setup • Step 1 of 2\n\n"
                    f"Subject: {cat_name}\n\n"
                    f"Select question quantity:"
                )
                promo_ex = None
                if cat_id:
                    promo_ex = await TelegramEngine.get_active_promotion(db, trigger_event="category_specific", category_id=cat_id)
                if promo_ex:
                    if promo_ex.content_text:
                        text_config += f"\n\nAnnouncement:\n{promo_ex.title}\n{promo_ex.content_text}"
                    if promo_ex.button_text and promo_ex.button_url:
                        p_url = await TelegramEngine.get_promotion_button_url(db, promo_ex, setting)
                        if p_url:
                            count_keyboard.insert(-1, [{"text": promo_ex.button_text, "url": p_url}])
                if msg_id:
                    await client.edit_message_text(chat_id, msg_id, text_config, reply_markup={"inline_keyboard": count_keyboard})
                else:
                    res = await client.send_message(chat_id, text_config, reply_markup={"inline_keyboard": count_keyboard})
                    if res.get("ok"):
                        user.last_message_id = res.get("result", {}).get("message_id")
                        await db.flush()

            elif data.startswith("ex_cnt:") or data.startswith("ex_cfg:"):
                await client.answer_callback_query(cb_id)
                parts = data.split(":")
                cat_id = parts[1] if parts[1] != "None" else None
                node_id = int(parts[2]) if parts[2] != "None" else 0
                count_val = int(parts[3]) if len(parts) > 3 and parts[3].isdigit() else 10

                can_take, quota_msg = await TelegramEngine.check_user_quota(db, user, setting)
                if not can_take and quota_msg:
                    limit_text, limit_kb = await TelegramEngine.build_limit_reached_response(
                        db, user, setting, quota_msg, cat_id
                    )
                    if msg_id:
                        await client.edit_message_text(chat_id, msg_id, limit_text, reply_markup=limit_kb)
                    else:
                        await client.send_message(chat_id, limit_text, reply_markup=limit_kb)
                    return

                cat_name = "Exam"
                if cat_id:
                    c_res = await db.execute(select(QuestionCategory).where(QuestionCategory.id == cat_id))
                    cat = c_res.scalar_one_or_none()
                    if cat:
                        cat_name = cat.name

                diff_keyboard = [
                    [{"text": "Mixed (All Difficulty Levels)", "callback_data": f"ex_diff:{cat_id}:{node_id}:{count_val}:mixed"}],
                    [
                        {"text": "Easy", "callback_data": f"ex_diff:{cat_id}:{node_id}:{count_val}:easy"},
                        {"text": "Medium", "callback_data": f"ex_diff:{cat_id}:{node_id}:{count_val}:medium"},
                    ],
                    [
                        {"text": "Hard", "callback_data": f"ex_diff:{cat_id}:{node_id}:{count_val}:hard"},
                        {"text": "Expert", "callback_data": f"ex_diff:{cat_id}:{node_id}:{count_val}:expert"},
                    ],
                    [{"text": "Back to Question Quantity", "callback_data": f"ex_init:{cat_id}:{node_id}"}]
                ]

                text_diff = (
                    f"Exam Setup • Step 2 of 2\n\n"
                    f"Subject: {cat_name}\n"
                    f"Selected Quantity: {count_val} Questions\n\n"
                    f"Select question difficulty level:"
                )
                if msg_id:
                    await client.edit_message_text(chat_id, msg_id, text_diff, reply_markup={"inline_keyboard": diff_keyboard})
                else:
                    res = await client.send_message(chat_id, text_diff, reply_markup={"inline_keyboard": diff_keyboard})
                    if res.get("ok"):
                        user.last_message_id = res.get("result", {}).get("message_id")
                        await db.flush()

            elif data.startswith("ex_diff:") or data.startswith("ex_go:"):
                await client.answer_callback_query(cb_id)
                parts = data.split(":")
                cat_id = parts[1] if parts[1] != "None" else None
                node_id = int(parts[2]) if parts[2] != "None" else 0
                if data.startswith("ex_diff:"):
                    count_val = int(parts[3]) if len(parts) > 3 and parts[3].isdigit() else 10
                    diff_val = parts[4] if len(parts) > 4 else "mixed"
                    strat = "random_overall"
                else:
                    count_val = 10
                    diff_val = "mixed"
                    strat = parts[3] if len(parts) > 3 else "random_overall"

                can_take, quota_msg = await TelegramEngine.check_user_quota(db, user, setting)
                if not can_take and quota_msg:
                    limit_text, limit_kb = await TelegramEngine.build_limit_reached_response(
                        db, user, setting, quota_msg, cat_id
                    )
                    if msg_id:
                        await client.edit_message_text(chat_id, msg_id, limit_text, reply_markup=limit_kb)
                    else:
                        await client.send_message(chat_id, limit_text, reply_markup=limit_kb)
                    return

                if msg_id and chat_id:
                    await client.remove_message_buttons(chat_id, msg_id)

                node = None
                if node_id > 0:
                    node_res = await db.execute(select(BotFlowNode).where(BotFlowNode.id == node_id))
                    node = node_res.scalar_one_or_none()

                if node and node.picking_strategy and node.picking_strategy != "ask_user":
                    strat = node.picking_strategy

                session = await TelegramEngine.create_and_start_exam(
                    db=db,
                    user=user,
                    category_id=cat_id,
                    node=node,
                    chat_id=chat_id,
                    total_questions=count_val,
                    difficulty=diff_val,
                    strategy=strat,
                )
                if session:
                    user.flow_state = "in_exam"
                    user.current_flow_node_id = node_id if node_id > 0 else None
                    user.last_active_session_id = session.id
                    await db.flush()
                    await TelegramEngine.send_exam_question_poll(db, client, chat_id, session)
                else:
                    msg_err = f"No questions available matching this configuration.\nPlease try choosing 'Mixed' difficulty or another category."
                    kb_err = [
                        [{"text": "Back to Difficulty", "callback_data": f"ex_cnt:{cat_id}:{node_id}:{count_val}"}],
                        [{"text": "Main Menu", "callback_data": "start_nav"}]
                    ]
                    if msg_id:
                        await client.edit_message_text(chat_id, msg_id, msg_err, reply_markup={"inline_keyboard": kb_err})
                    else:
                        await client.send_message(chat_id, msg_err, reply_markup={"inline_keyboard": kb_err})

            elif data.startswith("res_exam:"):
                sess_id = int(data.split(":")[1])
                s_res = await db.execute(select(ExamSession).where(ExamSession.id == sess_id))
                session = s_res.scalar_one_or_none()
                if session and session.status == "in_progress":
                    await client.answer_callback_query(cb_id)
                    session.chat_id = chat_id
                    user.flow_state = "in_exam"
                    user.last_active_session_id = session.id
                    await db.flush()
                    if msg_id:
                        await client.remove_message_buttons(chat_id, msg_id)
                        await TelegramEngine.send_exam_question_poll(db, client, chat_id, session)
                else:
                    await client.answer_callback_query(cb_id, text="This exam session is no longer active.", show_alert=True)
                    if msg_id:
                        await client.remove_message_buttons(chat_id, msg_id)

            elif data.startswith("ans:"):
                parts = data.split(":")
                session_id = int(parts[1])
                q_idx = int(parts[2])
                opt_id = parts[3]

                s_res = await db.execute(select(ExamSession).where(ExamSession.id == session_id))
                session = s_res.scalar_one_or_none()
                if not session or session.status != "in_progress" or session.current_index != q_idx:
                    await client.answer_callback_query(cb_id, text="This question is no longer active in your flow.", show_alert=True)
                    if msg_id:
                        await client.remove_message_buttons(chat_id, msg_id)
                    return

                await client.answer_callback_query(cb_id)
                if msg_id:
                    await client.remove_message_buttons(chat_id, msg_id)
                if session.current_poll_message_id and session.current_poll_message_id != msg_id:
                    await client.remove_message_buttons(chat_id, session.current_poll_message_id)

                q_ids = [x.strip() for x in session.question_ids.split(",") if x.strip()]
                if q_idx < len(q_ids):
                    curr_q_id = q_ids[q_idx]
                    q_res = await db.execute(
                        select(Question).options(selectinload(Question.options)).where(Question.id == curr_q_id)
                    )
                    question = q_res.scalar_one_or_none()
                    if question:
                        chosen_opt = next((o for o in question.options if o.id == opt_id), None)
                        is_correct = chosen_opt.is_correct if chosen_opt else False
                        if is_correct:
                            pts = 1.00
                            session.correct_count += 1
                        else:
                            session.wrong_count += 1
                            node_res = await db.execute(select(BotFlowNode).where(BotFlowNode.id == session.flow_node_id))
                            node_obj = node_res.scalar_one_or_none()
                            setting_obj = await TelegramEngine.get_settings(db)
                            neg_rate = float(node_obj.negative_marking_rate) if (node_obj and node_obj.negative_marking_rate is not None and float(node_obj.negative_marking_rate) > 0) else (float(setting_obj.default_negative_marking) if setting_obj and setting_obj.default_negative_marking is not None else 0.00)
                            pts = -neg_rate

                        ans = ExamAnswer(
                            session_id=session.id,
                            question_id=curr_q_id,
                            selected_option_id=opt_id,
                            is_correct=is_correct,
                            points_awarded=pts,
                        )
                        db.add(ans)

                        if user:
                            session.current_index = q_idx + 1
                    await db.flush()

                await TelegramEngine.send_exam_question_poll(db, client, chat_id, session)

            elif data.startswith("skp:"):
                parts = data.split(":")
                session_id = int(parts[1])
                q_idx = int(parts[2])

                s_res = await db.execute(select(ExamSession).where(ExamSession.id == session_id))
                session = s_res.scalar_one_or_none()
                if not session or session.status != "in_progress" or session.current_index != q_idx:
                    await client.answer_callback_query(cb_id, text="This question is no longer active in your flow.", show_alert=True)
                    if msg_id:
                        await client.remove_message_buttons(chat_id, msg_id)
                        return

                await client.answer_callback_query(cb_id)
                if msg_id:
                    await client.remove_message_buttons(chat_id, msg_id)
                if session.current_poll_message_id and session.current_poll_message_id != msg_id:
                    await client.remove_message_buttons(chat_id, session.current_poll_message_id)

                q_ids = [x.strip() for x in session.question_ids.split(",") if x.strip()]
                if q_idx < len(q_ids):
                    curr_q_id = q_ids[q_idx]
                    session.skipped_count += 1
                    ans = ExamAnswer(
                        session_id=session.id,
                        question_id=curr_q_id,
                        selected_option_id=None,
                        is_correct=False,
                        points_awarded=0.00,
                    )
                    db.add(ans)
                    session.current_index = q_idx + 1
                    await db.flush()
                await TelegramEngine.send_exam_question_poll(db, client, chat_id, session)

            elif data.startswith("end:"):
                session_id = int(data.split(":")[1])
                s_res = await db.execute(select(ExamSession).where(ExamSession.id == session_id))
                session = s_res.scalar_one_or_none()
                if not session or session.status != "in_progress":
                    await client.answer_callback_query(cb_id, text="This exam has already concluded.", show_alert=True)
                    if msg_id:
                        await client.remove_message_buttons(chat_id, msg_id)
                    return

                await client.answer_callback_query(cb_id)
                if msg_id:
                    await client.remove_message_buttons(chat_id, msg_id)
                if session.current_poll_message_id and session.current_poll_message_id != msg_id:
                    await client.remove_message_buttons(chat_id, session.current_poll_message_id)

                node_res = await db.execute(select(BotFlowNode).where(BotFlowNode.id == session.flow_node_id))
                node = node_res.scalar_one_or_none()

                user.flow_state = "idle"
                user.current_flow_node_id = None
                user.last_active_session_id = None
                await db.flush()
                card_text, card_kb = await TelegramEngine.complete_exam(db, session, user, node, client)
                await client.send_message(chat_id, card_text, reply_markup=card_kb)

            elif data.startswith("res:"):
                await client.answer_callback_query(cb_id)
                session_id = int(data.split(":")[1])
                s_res = await db.execute(select(ExamSession).where(ExamSession.id == session_id))
                session = s_res.scalar_one_or_none()
                if session:
                    node_res = await db.execute(select(BotFlowNode).where(BotFlowNode.id == session.flow_node_id))
                    node = node_res.scalar_one_or_none()
                    card_text, card_kb = await TelegramEngine.complete_exam(db, session, user, node, client)
                    if msg_id:
                        await client.edit_message_text(chat_id, msg_id, card_text, reply_markup=card_kb)
                    else:
                        await client.send_message(chat_id, card_text, reply_markup=card_kb)

            elif data.startswith("rev:"):
                await client.answer_callback_query(cb_id, text="Posting detailed explanations in chat...")
                session_id = int(data.split(":")[1])
                explanation_items = await TelegramEngine.build_explanation_messages(db, session_id)
                for exp_text, exp_kb in explanation_items:
                    await client.send_message(chat_id, exp_text, reply_markup=exp_kb)

    @staticmethod
    async def dispatch_broadcast(
        db: AsyncSession,
        setting: BotSetting,
        target_type: str,
        content_text: str,
        selected_user_ids: Optional[List[int]] = None,
        custom_targets: Optional[str] = None,
        media_url: Optional[str] = None,
        button_text: Optional[str] = None,
        button_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not setting.bot_token:
            return {"success": False, "targets_count": 0, "sent_count": 0, "message": "Bot token not configured"}

        targets: List[Any] = []
        if target_type == "all_users":
            res = await db.execute(select(TelegramUser.telegram_id).where(TelegramUser.is_blocked == False))
            targets = [r[0] for r in res.all()]
        elif target_type == "vip_users":
            res = await db.execute(select(TelegramUser.telegram_id).where(and_(TelegramUser.is_vip == True, TelegramUser.is_blocked == False)))
            targets = [r[0] for r in res.all()]
        elif target_type == "selected_users":
            if selected_user_ids:
                res = await db.execute(
                    select(TelegramUser.telegram_id)
                    .where(and_(TelegramUser.id.in_(selected_user_ids), TelegramUser.is_blocked == False))
                )
                targets = [r[0] for r in res.all()]
        elif target_type == "allowed_groups":
            if setting.allowed_group_ids:
                targets = [x.strip() for x in setting.allowed_group_ids.replace("\n", ",").split(",") if x.strip()]
        elif target_type == "onboarding_criteria":
            if custom_targets:
                try:
                    filters = json.loads(custom_targets.strip())
                    if isinstance(filters, dict):
                        query = select(TelegramUser.telegram_id).where(TelegramUser.is_blocked == False)
                        for k, v in filters.items():
                            if v:
                                v_str = str(v).strip()
                                k_str = str(k).strip()
                                query = query.where(
                                    (TelegramUser.profile_data.contains(f'"{k_str}": "{v_str}"')) |
                                    (TelegramUser.profile_data.contains(f'"{k_str}":"{v_str}"')) |
                                    (TelegramUser.profile_data.contains(f'"{v_str}"'))
                                )
                        res = await db.execute(query)
                        targets = [r[0] for r in res.all()]
                except Exception:
                    s = f"%{custom_targets.strip()}%"
                    res = await db.execute(
                        select(TelegramUser.telegram_id)
                        .where(and_(TelegramUser.is_blocked == False, TelegramUser.profile_data.ilike(s)))
                    )
                    targets = [r[0] for r in res.all()]
        elif target_type == "custom":
            if custom_targets:
                targets = [x.strip() for x in custom_targets.replace("\n", ",").split(",") if x.strip()]

        if not targets:
            return {"success": False, "targets_count": 0, "sent_count": 0, "message": "No valid recipients found"}

        client = TelegramApiClient(token=setting.bot_token)
        kb = None
        if button_text and button_url:
            clean_u = button_url.strip()
            if clean_u.startswith("http://") or clean_u.startswith("https://") or clean_u.startswith("tg://"):
                kb = {"inline_keyboard": [[{"text": button_text.strip(), "url": clean_u}]]}

        sent_count = 0
        failed_count = 0
        clean_media = (media_url or "").strip()

        for t in targets:
            try:
                target_chat = int(t) if (isinstance(t, str) and (t.lstrip("-").isdigit())) else t
                if clean_media and (clean_media.startswith("http://") or clean_media.startswith("https://")):
                    r = await client.send_photo(target_chat, clean_media, caption=content_text, reply_markup=kb)
                else:
                    r = await client.send_message(target_chat, content_text, reply_markup=kb)
                if r.get("ok"):
                    sent_count += 1
                else:
                    failed_count += 1
            except Exception:
                failed_count += 1
            await asyncio.sleep(0.05)

        return {
            "success": True,
            "targets_count": len(targets),
            "sent_count": sent_count,
            "failed_count": failed_count,
            "message": f"Broadcast delivered to {sent_count} of {len(targets)} recipients."
        }
