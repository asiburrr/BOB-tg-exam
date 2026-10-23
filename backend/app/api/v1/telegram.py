import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, Header
from fastapi.responses import RedirectResponse
from sqlalchemy import select, func, desc, and_, or_, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_db, require_permission
from app.db.session import AsyncSessionLocal
from app.models.admin import Admin
from app.models.question import QuestionCategory, Question, QuestionOption
from app.models.telegram import (
    TelegramUser,
    BotFlowNode,
    BotSetting,
    TelegramPromotion,
    ExamSession,
    ExamAnswer,
    TelegramQuizTarget,
    TelegramQuiz,
    TelegramQuizAssignment,
    TelegramQuizParticipant,
)
from app.schemas.response import ApiResponse, PaginatedResponse, PaginatedMeta
from app.schemas.telegram import (
    BotSettingResponse,
    BotSettingUpdate,
    BotFlowNodeCreate,
    BotFlowNodeUpdate,
    BotFlowNodeResponse,
    BotFlowNodeTreeResponse,
    BotFlowReorderRequest,
    BotFlowBatchCreate,
    TelegramPromotionCreate,
    TelegramPromotionUpdate,
    TelegramPromotionResponse,
    TelegramUserResponse,
    ExamSessionResponse,
    ExamSessionDetailResponse,
    ExamAnswerResponse,
    WebhookSetRequest,
    WebhookInfoResponse,
    BroadcastSendRequest,
    BroadcastSendResponse,
    TelegramQuizTargetCreate,
    TelegramQuizTargetUpdate,
    TelegramQuizTargetResponse,
    TelegramQuizCreate,
    TelegramQuizUpdate,
    TelegramQuizResponse,
    TelegramQuizDetailResponse,
    TelegramQuizAssignmentCreate,
    TelegramQuizAssignmentUpdate,
    TelegramQuizAssignmentResponse,
    TelegramQuizLeaderboardEntry,
    TelegramQuizLeaderboardResponse,
)
from app.services.telegram_engine import TelegramApiClient, TelegramEngine

router = APIRouter(prefix="/telegram", tags=["Telegram Bot"])

@router.get("/webhook", include_in_schema=False)
async def telegram_webhook_health():
    return {
        "status": "online",
        "message": "Telegram Webhook is live and awaiting POST updates from Telegram servers."
    }

@router.post("/webhook", include_in_schema=False)
async def telegram_webhook(
    update_data: Dict[str, Any],
    x_telegram_bot_api_secret_token: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(BotSetting).limit(1))
    setting = res.scalar_one_or_none()
    if setting and setting.webhook_secret:
        if x_telegram_bot_api_secret_token != setting.webhook_secret:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Secret token mismatch")

    if setting and setting.bot_token:
        try:
            await TelegramEngine.handle_update(db, update_data, setting)
            await db.commit()
        except Exception:
            await db.rollback()
            import traceback
            traceback.print_exc()

    return {"ok": True}


@router.get("/settings", response_model=ApiResponse[BotSettingResponse])
async def get_bot_settings(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    res = await db.execute(select(BotSetting).limit(1))
    setting = res.scalar_one_or_none()
    if not setting:
        setting = BotSetting(created_by=current_admin.id)
        db.add(setting)
        await db.commit()
        await db.refresh(setting)
    else:
        dirty = False
        if setting.onboarding_enabled is None:
            setting.onboarding_enabled = False
            dirty = True
        if setting.force_join_enabled is None:
            setting.force_join_enabled = False
            dirty = True
        if setting.group_access_mode is None:
            setting.group_access_mode = "all_blocked"
            dirty = True
        if setting.group_commands_in_private is None:
            setting.group_commands_in_private = False
            dirty = True
        if dirty:
            await db.commit()
            await db.refresh(setting)
    return ApiResponse(success=True, data=setting)

@router.put("/settings", response_model=ApiResponse[BotSettingResponse])
async def update_bot_settings(
    payload: BotSettingUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    res = await db.execute(select(BotSetting).limit(1))
    setting = res.scalar_one_or_none()
    if not setting:
        setting = BotSetting(created_by=current_admin.id)
        db.add(setting)

    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(setting, field, val)

    setting.created_by = current_admin.id
    await db.commit()
    await db.refresh(setting)
    return ApiResponse(success=True, message="Settings updated successfully", data=setting)

@router.get("/onboarding/usage", response_model=ApiResponse[Dict[str, List[str]]])
async def get_onboarding_usage(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    stmt = select(TelegramUser.profile_data).where(
        TelegramUser.profile_data.isnot(None),
        TelegramUser.profile_data != ""
    )
    res = await db.execute(stmt)
    rows = res.scalars().all()

    used_step_ids = set()
    used_option_values = set()

    for raw in rows:
        if not raw:
            continue
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                for k, v in parsed.items():
                    if k:
                        used_step_ids.add(str(k))
                    if v:
                        used_option_values.add(str(v))
            elif isinstance(parsed, list):
                for item in parsed:
                    if item:
                        used_option_values.add(str(item))
            elif isinstance(raw, str):
                for part in raw.replace(">", ",").split(","):
                    p = part.strip()
                    if p:
                        used_option_values.add(p)
        except Exception:
            for part in str(raw).replace(">", ",").split(","):
                p = part.strip()
                if p:
                    used_option_values.add(p)

    return ApiResponse(
        success=True,
        data={
            "used_step_ids": sorted(list(used_step_ids)),
            "used_option_values": sorted(list(used_option_values)),
        }
    )

@router.post("/test-connection", response_model=ApiResponse[Dict[str, Any]])
async def test_bot_connection(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    res = await db.execute(select(BotSetting).limit(1))
    setting = res.scalar_one_or_none()
    if not setting or not setting.bot_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bot token is not configured")

    client = TelegramApiClient(token=setting.bot_token)
    bot_info = await client.get_me()
    if not bot_info.get("ok"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Connection failed: {bot_info.get('description', 'Unknown error')}"
        )

    user_info = bot_info.get("result", {})
    setting.bot_username = user_info.get("username")
    await db.commit()

    return ApiResponse(
        success=True,
        message=f"Connected to @{user_info.get('username')}",
        data=user_info,
    )

@router.post("/set-webhook", response_model=ApiResponse[Dict[str, Any]])
async def set_telegram_webhook(
    payload: Optional[WebhookSetRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    res = await db.execute(select(BotSetting).limit(1))
    setting = res.scalar_one_or_none()
    if not setting or not setting.bot_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bot token is not configured")

    target_url = (payload.webhook_url.strip() if payload and payload.webhook_url else None) or (setting.webhook_url.strip() if setting.webhook_url else None)
    if not target_url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Webhook URL is required")

    secret = setting.webhook_secret or str(uuid.uuid4()).replace("-", "")
    setting.webhook_secret = secret

    client = TelegramApiClient(token=setting.bot_token)
    resp = await client.set_webhook(url=target_url, secret_token=secret)
    if not resp.get("ok"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Telegram setWebhook failed: {resp.get('description')}"
        )

    setting.webhook_url = target_url
    setting.is_webhook_active = True
    await db.commit()

    return ApiResponse(success=True, message="Webhook registered successfully with Telegram", data=resp)

@router.post("/delete-webhook", response_model=ApiResponse[Dict[str, Any]])
async def delete_telegram_webhook(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    res = await db.execute(select(BotSetting).limit(1))
    setting = res.scalar_one_or_none()
    if not setting or not setting.bot_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bot token is not configured")

    client = TelegramApiClient(token=setting.bot_token)
    resp = await client.delete_webhook()
    setting.is_webhook_active = False
    await db.commit()

    return ApiResponse(success=True, message="Webhook deleted successfully", data=resp)

@router.get("/webhook-info", response_model=ApiResponse[WebhookInfoResponse])
async def get_telegram_webhook_info(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    res = await db.execute(select(BotSetting).limit(1))
    setting = res.scalar_one_or_none()
    if not setting or not setting.bot_token:
        return ApiResponse(success=True, data=WebhookInfoResponse())

    client = TelegramApiClient(token=setting.bot_token)
    info = await client.get_webhook_info()
    if not info.get("ok"):
        return ApiResponse(success=True, data=WebhookInfoResponse())

    result = info.get("result", {})
    data = WebhookInfoResponse(
        url=result.get("url", ""),
        has_custom_certificate=result.get("has_custom_certificate", False),
        pending_update_count=result.get("pending_update_count", 0),
        last_error_date=result.get("last_error_date"),
        last_error_message=result.get("last_error_message"),
        max_connections=result.get("max_connections"),
        ip_address=result.get("ip_address"),
    )
    return ApiResponse(success=True, data=data)

def build_flow_tree_recursive(
    parent_id: Optional[int],
    by_parent: Dict[Optional[int], List[BotFlowNode]],
    cat_names: Dict[str, str],
) -> List[BotFlowNodeTreeResponse]:
    nodes = by_parent.get(parent_id, [])
    output: List[BotFlowNodeTreeResponse] = []
    for n in sorted(nodes, key=lambda x: (x.row_index, x.sort_order)):
        children = build_flow_tree_recursive(n.id, by_parent, cat_names)
        item = BotFlowNodeTreeResponse(
            id=n.id,
            parent_id=n.parent_id,
            trigger_command=n.trigger_command,
            label=n.label,
            action_type=n.action_type,
            content_text=n.content_text,
            category_id=n.category_id,
            category_name=cat_names.get(n.category_id) if n.category_id else None,
            picking_strategy=n.picking_strategy,
            question_count_mode=n.question_count_mode,
            fixed_count=n.fixed_count,
            difficulty_mode=n.difficulty_mode,
            fixed_difficulty=n.fixed_difficulty,
            scope_mode=n.scope_mode,
            timer_seconds=n.timer_seconds,
            negative_marking_rate=float(n.negative_marking_rate),
            url=n.url,
            row_index=n.row_index,
            sort_order=n.sort_order,
            is_active=n.is_active,
            created_by=n.created_by,
            created_at=n.created_at,
            updated_at=n.updated_at,
            children=children,
        )
        output.append(item)
    return output

@router.get("/flow", response_model=ApiResponse[List[BotFlowNodeTreeResponse]])
async def get_flow_tree(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    cats_res = await db.execute(select(QuestionCategory.id, QuestionCategory.name))
    cat_names = {r[0]: r[1] for r in cats_res.all()}

    res = await db.execute(select(BotFlowNode).order_by(BotFlowNode.row_index, BotFlowNode.sort_order))
    all_nodes = res.scalars().all()

    by_parent: Dict[Optional[int], List[BotFlowNode]] = {}
    for n in all_nodes:
        by_parent.setdefault(n.parent_id, []).append(n)

    tree = build_flow_tree_recursive(None, by_parent, cat_names)
    return ApiResponse(success=True, data=tree)

@router.post("/flow", response_model=ApiResponse[BotFlowNodeResponse], status_code=status.HTTP_201_CREATED)
async def create_flow_node(
    payload: BotFlowNodeCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    node = BotFlowNode(
        parent_id=payload.parent_id,
        trigger_command=payload.trigger_command.strip().lower() if payload.trigger_command else None,
        label=payload.label.strip(),
        action_type=payload.action_type,
        content_text=payload.content_text,
        category_id=payload.category_id,
        picking_strategy=payload.picking_strategy,
        question_count_mode=payload.question_count_mode,
        fixed_count=payload.fixed_count,
        difficulty_mode=payload.difficulty_mode,
        fixed_difficulty=payload.fixed_difficulty,
        scope_mode=payload.scope_mode,
        timer_seconds=payload.timer_seconds,
        negative_marking_rate=payload.negative_marking_rate,
        url=payload.url,
        row_index=payload.row_index,
        sort_order=payload.sort_order,
        is_active=payload.is_active,
        created_by=current_admin.id,
    )
    db.add(node)
    await db.commit()
    await db.refresh(node)

    cat_name = None
    if node.category_id:
        c_res = await db.execute(select(QuestionCategory.name).where(QuestionCategory.id == node.category_id))
        row = c_res.first()
        if row:
            cat_name = row[0]

    resp = BotFlowNodeResponse.model_validate(node)
    resp.category_name = cat_name
    return ApiResponse(success=True, message="Flow node created successfully", data=resp)

@router.put("/flow/{node_id}", response_model=ApiResponse[BotFlowNodeResponse])
async def update_flow_node(
    node_id: int,
    payload: BotFlowNodeUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    res = await db.execute(select(BotFlowNode).where(BotFlowNode.id == node_id))
    node = res.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found")

    for field, val in payload.model_dump(exclude_unset=True).items():
        if field == "trigger_command" and val:
            val = val.strip().lower()
        setattr(node, field, val)

    node.created_by = current_admin.id
    await db.commit()
    await db.refresh(node)

    cat_name = None
    if node.category_id:
        c_res = await db.execute(select(QuestionCategory.name).where(QuestionCategory.id == node.category_id))
        row = c_res.first()
        if row:
            cat_name = row[0]

    resp = BotFlowNodeResponse.model_validate(node)
    resp.category_name = cat_name
    return ApiResponse(success=True, message="Flow node updated successfully", data=resp)

@router.post("/flow/batch", response_model=ApiResponse[List[BotFlowNodeResponse]], status_code=status.HTTP_201_CREATED)
async def batch_create_flow_nodes(
    payload: BotFlowBatchCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    parent_id = payload.parent_id
    created_nodes: List[BotFlowNode] = []

    if payload.create_parent_node and payload.parent_label:
        parent_node = BotFlowNode(
            parent_id=parent_id,
            label=payload.parent_label.strip(),
            action_type="menu_nodes",
            content_text=payload.parent_content_text,
            row_index=payload.parent_row_index,
            sort_order=0,
            is_active=True,
            created_by=current_admin.id,
        )
        db.add(parent_node)
        await db.flush()
        parent_id = parent_node.id
        created_nodes.append(parent_node)

    for idx, item in enumerate(payload.items):
        node = BotFlowNode(
            parent_id=parent_id,
            label=item.label.strip(),
            action_type=item.action_type,
            category_id=item.category_id,
            picking_strategy=item.picking_strategy,
            fixed_count=item.fixed_count,
            difficulty_mode=item.difficulty_mode,
            fixed_difficulty=item.fixed_difficulty,
            scope_mode=item.scope_mode,
            timer_seconds=item.timer_seconds,
            negative_marking_rate=item.negative_marking_rate,
            row_index=item.row_index if item.row_index is not None else (idx // 2),
            sort_order=item.sort_order if item.sort_order is not None else idx,
            is_active=item.is_active,
            created_by=current_admin.id,
        )
        db.add(node)
        created_nodes.append(node)

    await db.commit()
    for n in created_nodes:
        await db.refresh(n)

    cats_res = await db.execute(select(QuestionCategory.id, QuestionCategory.name))
    cat_names = {r[0]: r[1] for r in cats_res.all()}

    responses = []
    for n in created_nodes:
        resp = BotFlowNodeResponse.model_validate(n)
        resp.category_name = cat_names.get(n.category_id) if n.category_id else None
        responses.append(resp)

    return ApiResponse(success=True, message=f"Created {len(created_nodes)} flow nodes", data=responses)

@router.delete("/flow", response_model=ApiResponse[Dict[str, Any]])
async def clear_all_flow_nodes(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    await db.execute(delete(BotFlowNode))
    await db.commit()
    return ApiResponse(success=True, message="All flow nodes deleted successfully")

@router.delete("/flow/{node_id}", response_model=ApiResponse[Dict[str, Any]])
async def delete_flow_node(
    node_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    res = await db.execute(select(BotFlowNode).where(BotFlowNode.id == node_id))
    node = res.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found")

    await db.delete(node)
    await db.commit()
    return ApiResponse(success=True, message="Node deleted successfully")

@router.post("/flow/reorder", response_model=ApiResponse[Dict[str, Any]])
async def reorder_flow_nodes(
    payload: BotFlowReorderRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    for item in payload.items:
        await db.execute(
            update(BotFlowNode)
            .where(BotFlowNode.id == item.id)
            .values(
                row_index=item.row_index,
                sort_order=item.sort_order,
                parent_id=item.parent_id,
            )
        )
    await db.commit()
    return ApiResponse(success=True, message="Nodes reordered successfully")

@router.get("/promotions", response_model=ApiResponse[List[TelegramPromotionResponse]])
async def list_promotions(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    cats_res = await db.execute(select(QuestionCategory.id, QuestionCategory.name))
    cat_names = {r[0]: r[1] for r in cats_res.all()}

    res = await db.execute(select(TelegramPromotion).order_by(desc(TelegramPromotion.priority), desc(TelegramPromotion.id)))
    promos = res.scalars().all()

    output: List[TelegramPromotionResponse] = []
    for p in promos:
        item = TelegramPromotionResponse.model_validate(p)
        item.target_category_name = cat_names.get(p.target_category_id) if p.target_category_id else None
        output.append(item)

    return ApiResponse(success=True, data=output)

@router.post("/promotions", response_model=ApiResponse[TelegramPromotionResponse], status_code=status.HTTP_201_CREATED)
async def create_promotion(
    payload: TelegramPromotionCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    promo = TelegramPromotion(
        title=payload.title.strip(),
        promo_type=payload.promo_type,
        content_text=payload.content_text,
        media_url=payload.media_url,
        button_text=payload.button_text,
        button_url=payload.button_url,
        trigger_event=payload.trigger_event,
        target_category_id=payload.target_category_id,
        priority=payload.priority,
        is_active=payload.is_active,
        created_by=current_admin.id,
    )
    db.add(promo)
    await db.commit()
    await db.refresh(promo)

    cat_name = None
    if promo.target_category_id:
        c_res = await db.execute(select(QuestionCategory.name).where(QuestionCategory.id == promo.target_category_id))
        row = c_res.first()
        if row:
            cat_name = row[0]

    resp = TelegramPromotionResponse.model_validate(promo)
    resp.target_category_name = cat_name
    return ApiResponse(success=True, message="Promotion created successfully", data=resp)

@router.put("/promotions/{promo_id}", response_model=ApiResponse[TelegramPromotionResponse])
async def update_promotion(
    promo_id: int,
    payload: TelegramPromotionUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    res = await db.execute(select(TelegramPromotion).where(TelegramPromotion.id == promo_id))
    promo = res.scalar_one_or_none()
    if not promo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Promotion not found")

    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(promo, field, val)

    promo.created_by = current_admin.id
    await db.commit()
    await db.refresh(promo)

    cat_name = None
    if promo.target_category_id:
        c_res = await db.execute(select(QuestionCategory.name).where(QuestionCategory.id == promo.target_category_id))
        row = c_res.first()
        if row:
            cat_name = row[0]

    resp = TelegramPromotionResponse.model_validate(promo)
    resp.target_category_name = cat_name
    return ApiResponse(success=True, message="Promotion updated successfully", data=resp)

@router.delete("/promotions/{promo_id}", response_model=ApiResponse[Dict[str, Any]])
async def delete_promotion(
    promo_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    res = await db.execute(select(TelegramPromotion).where(TelegramPromotion.id == promo_id))
    promo = res.scalar_one_or_none()
    if not promo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Promotion not found")

    await db.delete(promo)
    await db.commit()
    return ApiResponse(success=True, message="Promotion deleted successfully")

@router.get("/c/{promo_id}")
@router.get("/click/{promo_id}")
@router.get("/r/{promo_id}")
async def track_promotion_click(
    promo_id: int,
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(TelegramPromotion).where(TelegramPromotion.id == promo_id))
    promo = res.scalar_one_or_none()
    if not promo or not promo.button_url:
        return RedirectResponse(url="https://t.me", status_code=status.HTTP_307_TEMPORARY_REDIRECT)

    await db.execute(
        update(TelegramPromotion)
        .where(TelegramPromotion.id == promo_id)
        .values(clicks_count=TelegramPromotion.clicks_count + 1)
    )
    await db.commit()

    target_url = promo.button_url.strip()
    if not (target_url.startswith("https://") or target_url.startswith("http://") or target_url.startswith("tg://")):
        target_url = f"https://{target_url}"

    return RedirectResponse(url=target_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)

@router.post("/promotions/{promo_id}/click", response_model=ApiResponse[Dict[str, Any]])
async def record_promotion_click(
    promo_id: int,
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(TelegramPromotion).where(TelegramPromotion.id == promo_id))
    promo = res.scalar_one_or_none()
    if not promo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Promotion not found")

    await db.execute(
        update(TelegramPromotion)
        .where(TelegramPromotion.id == promo_id)
        .values(clicks_count=TelegramPromotion.clicks_count + 1)
    )
    await db.commit()

    return ApiResponse(
        success=True,
        message="Click recorded successfully",
        data={"id": promo.id, "clicks_count": promo.clicks_count + 1, "button_url": promo.button_url}
    )

@router.get("/users", response_model=PaginatedResponse[TelegramUserResponse])
async def list_telegram_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    limit: Optional[int] = Query(None, ge=1, le=500),
    search: Optional[str] = Query(None),
    user_role: Optional[str] = Query(None),
    is_vip: Optional[bool] = Query(None),
    is_blocked: Optional[bool] = Query(None),
    onboarding_filters: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    effective_limit = limit if limit is not None else page_size
    query = select(TelegramUser)

    if user_role == "vip" or is_vip is True:
        query = query.where(TelegramUser.is_vip == True)
    elif user_role == "standard":
        query = query.where(and_(TelegramUser.is_vip == False, TelegramUser.is_blocked == False))
    elif user_role == "blocked" or is_blocked is True:
        query = query.where(TelegramUser.is_blocked == True)

    if search:
        s = f"%{search.strip()}%"
        search_term = search.strip()
        conditions = [
            TelegramUser.first_name.ilike(s),
            TelegramUser.last_name.ilike(s),
            TelegramUser.username.ilike(s),
            TelegramUser.profile_data.ilike(s),
        ]
        if search_term.isdigit():
            try:
                conditions.append(TelegramUser.telegram_id == int(search_term))
            except Exception:
                pass
        query = query.where(or_(*conditions))

    if onboarding_filters:
        try:
            filters = json.loads(onboarding_filters)
            if isinstance(filters, dict):
                for k, v in filters.items():
                    if v:
                        v_str = str(v).strip()
                        k_str = str(k).strip()
                        query = query.where(
                            (TelegramUser.profile_data.contains(f'"{k_str}": "{v_str}"')) |
                            (TelegramUser.profile_data.contains(f'"{k_str}":"{v_str}"')) |
                            (TelegramUser.profile_data.contains(f'"{v_str}"'))
                        )
        except Exception:
            pass

    count_res = await db.execute(select(func.count()).select_from(query.subquery()))
    total_count = count_res.scalar() or 0

    query = query.order_by(desc(TelegramUser.updated_at)).offset((page - 1) * effective_limit).limit(effective_limit)
    res = await db.execute(query)
    users = res.scalars().all()

    user_ids = [u.id for u in users]
    exam_stats = {}
    if user_ids:
        exam_stats_res = await db.execute(
            select(ExamSession.user_id, func.count(ExamSession.id), func.coalesce(func.sum(ExamSession.total_questions), 0))
            .where(ExamSession.user_id.in_(user_ids))
            .group_by(ExamSession.user_id)
        )
        exam_stats = {r[0]: (r[1], r[2]) for r in exam_stats_res.all()}

    output = []
    for u in users:
        item = TelegramUserResponse.model_validate(u)
        stats_tuple = exam_stats.get(u.id, (0, 0))
        item.exams_count = stats_tuple[0]
        item.total_exams = stats_tuple[0]
        item.questions_count = stats_tuple[1]
        if not item.flow_state:
            item.flow_state = "idle"
        output.append(item)

    total_pages = (total_count + effective_limit - 1) // effective_limit if total_count > 0 else 1

    return PaginatedResponse(
        success=True,
        data=output,
        meta=PaginatedMeta(page=page, page_size=effective_limit, total_count=total_count, total_pages=total_pages),
    )

@router.put("/users/{user_id}/toggle-vip", response_model=ApiResponse[Dict[str, Any]])
async def toggle_user_vip(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    res = await db.execute(select(TelegramUser).where(TelegramUser.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_vip = not user.is_vip
    await db.commit()
    return ApiResponse(success=True, message=f"VIP status set to {user.is_vip}")

@router.put("/users/{user_id}/toggle-block", response_model=ApiResponse[Dict[str, Any]])
async def toggle_user_block(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    res = await db.execute(select(TelegramUser).where(TelegramUser.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_blocked = not user.is_blocked
    await db.commit()
    return ApiResponse(success=True, message=f"Block status set to {user.is_blocked}")

@router.get("/sessions", response_model=PaginatedResponse[ExamSessionResponse])
async def list_exam_sessions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    limit: Optional[int] = Query(None, ge=1, le=500),
    user_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    effective_limit = limit if limit is not None else page_size
    query = select(ExamSession).options(selectinload(ExamSession.user))
    if user_id:
        query = query.where(ExamSession.user_id == user_id)
    if status_filter and status_filter.lower() != "all":
        query = query.where(ExamSession.status == status_filter.lower())
    if search:
        s = f"%{search.strip()}%"
        search_term = search.strip()
        conditions = [
            TelegramUser.first_name.ilike(s),
            TelegramUser.last_name.ilike(s),
            TelegramUser.username.ilike(s),
        ]
        if search_term.isdigit():
            try:
                conditions.append(ExamSession.id == int(search_term))
                conditions.append(TelegramUser.telegram_id == int(search_term))
            except Exception:
                pass
        query = query.join(ExamSession.user, isouter=True).where(or_(*conditions))

    count_res = await db.execute(select(func.count()).select_from(query.subquery()))
    total_count = count_res.scalar() or 0

    query = query.order_by(desc(ExamSession.started_at)).offset((page - 1) * effective_limit).limit(effective_limit)
    res = await db.execute(query)
    sessions = res.scalars().all()

    cat_ids = [s.category_id for s in sessions if s.category_id]
    cat_names = {}
    if cat_ids:
        cats_res = await db.execute(select(QuestionCategory.id, QuestionCategory.name).where(QuestionCategory.id.in_(cat_ids)))
        cat_names = {r[0]: r[1] for r in cats_res.all()}

    output = []
    for s in sessions:
        item = ExamSessionResponse.model_validate(s)
        item.telegram_id = s.user.telegram_id if s.user else None
        item.user_name = f"{s.user.first_name} {s.user.last_name or ''}".strip() if s.user else None
        item.category_name = cat_names.get(s.category_id) if s.category_id else None
        output.append(item)

    total_pages = (total_count + effective_limit - 1) // effective_limit if total_count > 0 else 1

    return PaginatedResponse(
        success=True,
        data=output,
        meta=PaginatedMeta(page=page, page_size=effective_limit, total_count=total_count, total_pages=total_pages),
    )

@router.get("/sessions/stats", response_model=ApiResponse[Dict[str, Any]])
async def get_exam_sessions_stats(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    total_res = await db.execute(select(func.count()).select_from(ExamSession))
    total_count = total_res.scalar() or 0

    completed_res = await db.execute(
        select(func.count()).select_from(ExamSession).where(ExamSession.status == "completed")
    )
    completed_count = completed_res.scalar() or 0

    in_progress_res = await db.execute(
        select(func.count()).select_from(ExamSession).where(ExamSession.status == "in_progress")
    )
    in_progress_count = in_progress_res.scalar() or 0

    avg_res = await db.execute(
        select(func.avg(ExamSession.accuracy_percentage)).select_from(ExamSession).where(ExamSession.status == "completed")
    )
    avg_val = avg_res.scalar()
    avg_accuracy = round(float(avg_val)) if avg_val is not None else 0

    return ApiResponse(
        success=True,
        data={
            "total_sessions": total_count,
            "completed_sessions": completed_count,
            "in_progress_sessions": in_progress_count,
            "average_accuracy": avg_accuracy,
        },
    )

@router.get("/sessions/{session_id}", response_model=ApiResponse[ExamSessionDetailResponse])
async def get_exam_session_detail(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    res = await db.execute(
        select(ExamSession)
        .options(selectinload(ExamSession.user))
        .where(ExamSession.id == session_id)
    )
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    cat_name = None
    if session.category_id:
        c_res = await db.execute(select(QuestionCategory.name).where(QuestionCategory.id == session.category_id))
        row = c_res.first()
        if row:
            cat_name = row[0]

    ans_res = await db.execute(
        select(ExamAnswer).where(ExamAnswer.session_id == session_id).order_by(ExamAnswer.id)
    )
    answers = ans_res.scalars().all()

    q_ids = [a.question_id for a in answers]
    q_res = await db.execute(
        select(Question).options(selectinload(Question.options)).where(Question.id.in_(q_ids))
    )
    questions_map = {q.id: q for q in q_res.scalars().all()}

    ans_output = []
    for a in answers:
        q = questions_map.get(a.question_id)
        q_text = q.question if q else "Question removed"
        explanation = q.explanation if q else None
        sel_text = None
        corr_text = None
        if q:
            for opt in q.options:
                if opt.id == a.selected_option_id:
                    sel_text = opt.option_text
                    if not explanation and opt.explanation:
                        explanation = opt.explanation
                if opt.is_correct:
                    corr_text = opt.option_text
                    if not explanation and opt.explanation:
                        explanation = opt.explanation

        ans_item = ExamAnswerResponse(
            id=a.id,
            question_id=a.question_id,
            question_text=q_text,
            selected_option_id=a.selected_option_id,
            selected_option_text=sel_text,
            correct_option_text=corr_text,
            is_correct=a.is_correct,
            points_awarded=float(a.points_awarded),
            time_spent_seconds=a.time_spent_seconds,
            explanation=explanation,
            answered_at=a.answered_at,
        )
        ans_output.append(ans_item)

    resp = ExamSessionDetailResponse(
        id=session.id,
        user_id=session.user_id,
        telegram_id=session.user.telegram_id if session.user else None,
        user_name=f"{session.user.first_name} {session.user.last_name or ''}".strip() if session.user else None,
        category_id=session.category_id,
        category_name=cat_name,
        flow_node_id=session.flow_node_id,
        strategy_used=session.strategy_used,
        difficulty=session.difficulty,
        total_questions=session.total_questions,
        correct_count=session.correct_count,
        wrong_count=session.wrong_count,
        skipped_count=session.skipped_count,
        score=float(session.score),
        max_score=float(session.max_score),
        accuracy_percentage=float(session.accuracy_percentage),
        status=session.status,
        started_at=session.started_at,
        completed_at=session.completed_at,
        answers=ans_output,
    )

    return ApiResponse(success=True, data=resp)

@router.post("/broadcast", response_model=ApiResponse[BroadcastSendResponse])
async def send_broadcast(
    payload: BroadcastSendRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    res = await db.execute(select(BotSetting).limit(1))
    setting = res.scalar_one_or_none()
    if not setting or not setting.bot_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Telegram Bot token is not configured.")

    result = await TelegramEngine.dispatch_broadcast(
        db=db,
        setting=setting,
        target_type=payload.target_type,
        content_text=payload.content_text,
        selected_user_ids=payload.selected_user_ids,
        custom_targets=payload.custom_targets,
        media_url=payload.media_url,
        button_text=payload.button_text,
        button_url=payload.button_url,
    )
    await db.commit()
    return ApiResponse(
        success=result.get("success", True),
        data=BroadcastSendResponse(
            success=result.get("success", True),
            targets_count=result.get("targets_count", 0),
            message=result.get("message", "")
        )
    )

@router.get("/quiz-targets", response_model=ApiResponse[List[TelegramQuizTargetResponse]])
async def list_quiz_targets(
    is_active: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    query = select(TelegramQuizTarget).order_by(desc(TelegramQuizTarget.created_at))
    if is_active is not None:
        query = query.where(TelegramQuizTarget.is_active == is_active)
    res = await db.execute(query)
    targets = res.scalars().all()
    return ApiResponse(success=True, data=targets)

@router.post("/quiz-targets", response_model=ApiResponse[TelegramQuizTargetResponse], status_code=status.HTTP_201_CREATED)
async def create_quiz_target(
    payload: TelegramQuizTargetCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    target = TelegramQuizTarget(
        title=payload.title.strip(),
        chat_id=payload.chat_id.strip(),
        chat_type=payload.chat_type,
        description=payload.description,
        is_active=payload.is_active,
        created_by=current_admin.id,
    )
    db.add(target)
    await db.commit()
    await db.refresh(target)
    return ApiResponse(success=True, message="Target added successfully", data=target)

@router.put("/quiz-targets/{target_id}", response_model=ApiResponse[TelegramQuizTargetResponse])
async def update_quiz_target(
    target_id: int,
    payload: TelegramQuizTargetUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    res = await db.execute(select(TelegramQuizTarget).where(TelegramQuizTarget.id == target_id))
    target = res.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz target not found")
    for field, val in payload.model_dump(exclude_unset=True).items():
        if val is not None and isinstance(val, str):
            val = val.strip()
        setattr(target, field, val)
    await db.commit()
    await db.refresh(target)
    return ApiResponse(success=True, message="Target updated successfully", data=target)

@router.delete("/quiz-targets/{target_id}", response_model=ApiResponse[Dict[str, Any]])
async def delete_quiz_target(
    target_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    res = await db.execute(select(TelegramQuizTarget).where(TelegramQuizTarget.id == target_id))
    target = res.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz target not found")
    await db.delete(target)
    await db.commit()
    return ApiResponse(success=True, message="Target deleted successfully")

@router.get("/quizzes", response_model=ApiResponse[List[TelegramQuizResponse]])
async def list_quizzes(
    is_active: Optional[bool] = Query(None),
    category_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    query = select(TelegramQuiz).order_by(desc(TelegramQuiz.created_at))
    if is_active is not None:
        query = query.where(TelegramQuiz.is_active == is_active)
    if category_id:
        query = query.where(TelegramQuiz.category_id == category_id)
    if search:
        s = f"%{search.strip()}%"
        query = query.where(or_(TelegramQuiz.title.ilike(s), TelegramQuiz.description.ilike(s)))
    res = await db.execute(query)
    quizzes = res.scalars().all()
    return ApiResponse(success=True, data=quizzes)

@router.post("/quizzes", response_model=ApiResponse[TelegramQuizResponse], status_code=status.HTTP_201_CREATED)
async def create_quiz(
    payload: TelegramQuizCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    q_ids_clean = [q.strip() for q in payload.question_ids if q.strip()]
    if not q_ids_clean:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one question must be selected")
    quiz = TelegramQuiz(
        title=payload.title.strip(),
        description=payload.description,
        category_id=payload.category_id,
        time_limit_per_question=payload.time_limit_per_question or 0,
        total_time_minutes=payload.total_time_minutes or 0,
        negative_marking_rate=payload.negative_marking_rate,
        question_ids=",".join(q_ids_clean),
        total_questions=len(q_ids_clean),
        is_active=payload.is_active,
        created_by=current_admin.id,
    )
    db.add(quiz)
    await db.commit()
    await db.refresh(quiz)
    return ApiResponse(success=True, message="Quiz created successfully", data=quiz)

@router.get("/quizzes/{quiz_id}", response_model=ApiResponse[TelegramQuizDetailResponse])
async def get_quiz_detail(
    quiz_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    res = await db.execute(select(TelegramQuiz).where(TelegramQuiz.id == quiz_id))
    quiz = res.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    q_ids = [q.strip() for q in (quiz.question_ids or "").split(",") if q.strip()]
    data = TelegramQuizDetailResponse.model_validate(quiz)
    data.question_ids = q_ids
    return ApiResponse(success=True, data=data)

@router.put("/quizzes/{quiz_id}", response_model=ApiResponse[TelegramQuizResponse])
async def update_quiz(
    quiz_id: int,
    payload: TelegramQuizUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    res = await db.execute(select(TelegramQuiz).where(TelegramQuiz.id == quiz_id))
    quiz = res.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    update_data = payload.model_dump(exclude_unset=True)
    if "question_ids" in update_data and update_data["question_ids"] is not None:
        q_ids = [q.strip() for q in update_data["question_ids"] if q.strip()]
        quiz.question_ids = ",".join(q_ids)
        quiz.total_questions = len(q_ids)
        update_data.pop("question_ids")
    for field, val in update_data.items():
        if val is not None and isinstance(val, str):
            val = val.strip()
        setattr(quiz, field, val)
    await db.commit()
    await db.refresh(quiz)
    return ApiResponse(success=True, message="Quiz updated successfully", data=quiz)

@router.delete("/quizzes/{quiz_id}", response_model=ApiResponse[Dict[str, Any]])
async def delete_quiz(
    quiz_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    res = await db.execute(select(TelegramQuiz).where(TelegramQuiz.id == quiz_id))
    quiz = res.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    await db.delete(quiz)
    await db.commit()
    return ApiResponse(success=True, message="Quiz deleted successfully")

@router.get("/quiz-assignments", response_model=ApiResponse[List[TelegramQuizAssignmentResponse]])
async def list_quiz_assignments(
    status_filter: Optional[str] = Query(None),
    target_id: Optional[int] = Query(None),
    quiz_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    setting_res = await db.execute(select(BotSetting).limit(1))
    setting = setting_res.scalar_one_or_none()
    if setting and setting.bot_token:
        client = TelegramApiClient(token=setting.bot_token)
        try:
            await TelegramEngine.sync_quiz_schedules(db, client, setting)
            await db.commit()
        except Exception:
            await db.rollback()

    query = (
        select(TelegramQuizAssignment)
        .options(
            selectinload(TelegramQuizAssignment.quiz),
            selectinload(TelegramQuizAssignment.target)
        )
        .order_by(desc(TelegramQuizAssignment.created_at))
    )
    if status_filter and status_filter.lower() != "all":
        query = query.where(TelegramQuizAssignment.status == status_filter.lower())
    if target_id:
        query = query.where(TelegramQuizAssignment.target_id == target_id)
    if quiz_id:
        query = query.where(TelegramQuizAssignment.quiz_id == quiz_id)
    res = await db.execute(query)
    assignments = res.scalars().all()

    output = []
    for a in assignments:
        item = TelegramQuizAssignmentResponse.model_validate(a)
        item.quiz_title = a.quiz.title if a.quiz else None
        item.total_questions = a.quiz.total_questions if a.quiz else 0
        item.target_title = a.target.title if a.target else None
        item.target_chat_id = a.target.chat_id if a.target else None
        item.target_chat_type = a.target.chat_type if a.target else None
        output.append(item)
    return ApiResponse(success=True, data=output)

@router.post("/quiz-assignments", response_model=ApiResponse[TelegramQuizAssignmentResponse], status_code=status.HTTP_201_CREATED)
async def create_quiz_assignment(
    payload: TelegramQuizAssignmentCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    if payload.end_time <= payload.start_time:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="End time must be after start time")

    quiz_res = await db.execute(select(TelegramQuiz).where(TelegramQuiz.id == payload.quiz_id))
    quiz = quiz_res.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")

    target_res = await db.execute(select(TelegramQuizTarget).where(TelegramQuizTarget.id == payload.target_id))
    target = target_res.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz target not found")

    now_utc = datetime.now(timezone.utc)
    st_utc = payload.start_time if payload.start_time.tzinfo else payload.start_time.replace(tzinfo=timezone.utc)
    et_utc = payload.end_time if payload.end_time.tzinfo else payload.end_time.replace(tzinfo=timezone.utc)

    status_init = "scheduled"
    if st_utc <= now_utc < et_utc:
        status_init = "active"

    asg = TelegramQuizAssignment(
        quiz_id=payload.quiz_id,
        target_id=payload.target_id,
        start_time=st_utc,
        end_time=et_utc,
        status=status_init,
        created_by=current_admin.id,
    )
    db.add(asg)
    await db.commit()
    await db.refresh(asg)

    setting_res = await db.execute(select(BotSetting).limit(1))
    setting = setting_res.scalar_one_or_none()
    if payload.announce_now and setting and setting.bot_token:
        client = TelegramApiClient(token=setting.bot_token)
        try:
            await TelegramEngine.publish_quiz_announcement(db, client, asg.id, setting)
            await db.commit()
            await db.refresh(asg)
        except Exception:
            pass

    resp_item = TelegramQuizAssignmentResponse.model_validate(asg)
    resp_item.quiz_title = quiz.title
    resp_item.total_questions = quiz.total_questions
    resp_item.target_title = target.title
    resp_item.target_chat_id = target.chat_id
    resp_item.target_chat_type = target.chat_type
    return ApiResponse(success=True, message="Quiz assigned and scheduled successfully", data=resp_item)

@router.put("/quiz-assignments/{assignment_id}", response_model=ApiResponse[TelegramQuizAssignmentResponse])
async def update_quiz_assignment(
    assignment_id: int,
    payload: TelegramQuizAssignmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    res = await db.execute(
        select(TelegramQuizAssignment)
        .options(
            selectinload(TelegramQuizAssignment.quiz),
            selectinload(TelegramQuizAssignment.target)
        )
        .where(TelegramQuizAssignment.id == assignment_id)
    )
    asg = res.scalar_one_or_none()
    if not asg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

    for field, val in payload.model_dump(exclude_unset=True).items():
        if val is not None and field in ["start_time", "end_time"] and not val.tzinfo:
            val = val.replace(tzinfo=timezone.utc)
        setattr(asg, field, val)

    await db.commit()
    await db.refresh(asg)

    resp_item = TelegramQuizAssignmentResponse.model_validate(asg)
    resp_item.quiz_title = asg.quiz.title if asg.quiz else None
    resp_item.total_questions = asg.quiz.total_questions if asg.quiz else 0
    resp_item.target_title = asg.target.title if asg.target else None
    resp_item.target_chat_id = asg.target.chat_id if asg.target else None
    resp_item.target_chat_type = asg.target.chat_type if asg.target else None
    return ApiResponse(success=True, message="Assignment updated successfully", data=resp_item)

@router.delete("/quiz-assignments/{assignment_id}", response_model=ApiResponse[Dict[str, Any]])
async def delete_quiz_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    res = await db.execute(select(TelegramQuizAssignment).where(TelegramQuizAssignment.id == assignment_id))
    asg = res.scalar_one_or_none()
    if not asg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    await db.delete(asg)
    await db.commit()
    return ApiResponse(success=True, message="Assignment deleted successfully")

@router.post("/quiz-assignments/{assignment_id}/announce", response_model=ApiResponse[Dict[str, Any]])
async def trigger_quiz_announcement(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    setting_res = await db.execute(select(BotSetting).limit(1))
    setting = setting_res.scalar_one_or_none()
    if not setting or not setting.bot_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Telegram bot token not configured")
    client = TelegramApiClient(token=setting.bot_token)
    res = await TelegramEngine.publish_quiz_announcement(db, client, assignment_id, setting)
    if not res.get("success"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=res.get("message", "Failed to send announcement"))
    await db.commit()
    return ApiResponse(success=True, message="Quiz announcement published to channel/group", data=res)

@router.post("/quiz-assignments/{assignment_id}/publish-leaderboard", response_model=ApiResponse[Dict[str, Any]])
async def trigger_quiz_leaderboard(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    setting_res = await db.execute(select(BotSetting).limit(1))
    setting = setting_res.scalar_one_or_none()
    if not setting or not setting.bot_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Telegram bot token not configured")
    client = TelegramApiClient(token=setting.bot_token)
    res = await TelegramEngine.publish_quiz_leaderboard(db, client, assignment_id)
    if not res.get("success"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=res.get("message", "Failed to publish leaderboard"))
    await db.commit()
    return ApiResponse(success=True, message="Official leaderboard published to channel/group", data=res)

@router.get("/quiz-assignments/{assignment_id}/leaderboard", response_model=ApiResponse[TelegramQuizLeaderboardResponse])
async def get_quiz_leaderboard_data(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    res = await db.execute(
        select(TelegramQuizAssignment)
        .options(
            selectinload(TelegramQuizAssignment.quiz),
            selectinload(TelegramQuizAssignment.target)
        )
        .where(TelegramQuizAssignment.id == assignment_id)
    )
    asg = res.scalar_one_or_none()
    if not asg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

    p_res = await db.execute(
        select(TelegramQuizParticipant)
        .options(selectinload(TelegramQuizParticipant.user))
        .where(
            and_(
                TelegramQuizParticipant.assignment_id == assignment_id,
                TelegramQuizParticipant.status == "completed"
            )
        )
        .order_by(
            desc(TelegramQuizParticipant.score),
            TelegramQuizParticipant.total_time_seconds.asc(),
            TelegramQuizParticipant.completed_at.asc()
        )
        .limit(100)
    )
    participants = p_res.scalars().all()

    entries = []
    for idx, p in enumerate(participants, start=1):
        entries.append(
            TelegramQuizLeaderboardEntry(
                rank=idx,
                user_id=p.user_id,
                telegram_id=p.user.telegram_id if p.user else 0,
                first_name=p.user.first_name if p.user else "Candidate",
                last_name=p.user.last_name if p.user else None,
                username=p.user.username if p.user else None,
                score=float(p.score),
                correct_count=p.correct_count,
                wrong_count=p.wrong_count,
                skipped_count=p.skipped_count,
                total_time_seconds=p.total_time_seconds,
                completed_at=p.completed_at,
            )
        )

    resp = TelegramQuizLeaderboardResponse(
        assignment_id=asg.id,
        quiz_title=asg.quiz.title if asg.quiz else "Quiz",
        target_title=asg.target.title if asg.target else "Target",
        total_participants=len(entries),
        status=asg.status,
        start_time=asg.start_time,
        end_time=asg.end_time,
        leaderboard_published_at=asg.leaderboard_published_at,
        leaderboard=entries,
    )
    return ApiResponse(success=True, data=resp)

@router.post("/quiz-assignments/sync-schedules", response_model=ApiResponse[Dict[str, Any]])
async def sync_all_quiz_schedules(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("bot:manage")),
):
    setting_res = await db.execute(select(BotSetting).limit(1))
    setting = setting_res.scalar_one_or_none()
    if not setting or not setting.bot_token:
        return ApiResponse(success=True, message="Bot token not configured, skipped")
    client = TelegramApiClient(token=setting.bot_token)
    await TelegramEngine.sync_quiz_schedules(db, client, setting)
    await db.commit()
    return ApiResponse(success=True, message="Quiz schedules synchronized successfully")
