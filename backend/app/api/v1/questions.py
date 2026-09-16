from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, desc, delete, update
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import (
    get_db,
    get_client_meta,
    get_current_admin,
    require_permission,
)
from app.core.client_detector import ClientMeta
from app.models.admin import Admin
from app.models.question import QuestionCategory, Question, QuestionOption
from app.schemas.question import (
    CategoryCreate,
    CategoryUpdate,
    CategoryResponse,
    CategoryTreeResponse,
    QuestionCreate,
    QuestionUpdate,
    QuestionResponse,
    OptionResponse,
    QuestionMoveRequest,
)
from app.schemas.response import ApiResponse, PaginatedResponse, PaginatedMeta
from app.services.audit_service import AuditService, calculate_row_diff

router = APIRouter(prefix="/questions", tags=["Question Bank"])

def build_tree_recursive(
    parent_id: Optional[str],
    categories_by_parent: Dict[Optional[str], List[QuestionCategory]],
    counts_map: Dict[str, int],
) -> List[CategoryTreeResponse]:
    items = categories_by_parent.get(parent_id, [])
    result: List[CategoryTreeResponse] = []
    
    for cat in sorted(items, key=lambda x: x.sort_order):
        children = build_tree_recursive(cat.id, categories_by_parent, counts_map)
        direct_count = counts_map.get(cat.id, 0)
        cumulative_count = direct_count + sum(child.question_count for child in children)
        node = CategoryTreeResponse(
            id=cat.id,
            parent_id=cat.parent_id,
            name=cat.name,
            description=cat.description,
            sort_order=cat.sort_order,
            created_by=cat.created_by,
            created_at=cat.created_at,
            updated_at=cat.updated_at,
            direct_count=direct_count,
            question_count=cumulative_count,
            children=children,
        )
        result.append(node)
        
    return result

def extract_cumulative_counts(nodes: List[CategoryTreeResponse], out_map: Dict[str, int]) -> None:
    for n in nodes:
        out_map[n.id] = n.question_count
        if n.children:
            extract_cumulative_counts(n.children, out_map)

async def get_descendant_category_ids(db: AsyncSession, root_ids: List[str]) -> List[str]:
    if not root_ids:
        return []
    res = await db.execute(select(QuestionCategory.id, QuestionCategory.parent_id))
    all_rows = res.all()
    children_map: Dict[str, List[str]] = {}
    for cid, pid in all_rows:
        if pid:
            children_map.setdefault(pid, []).append(cid)
    
    collected = set()
    queue = list(root_ids)
    while queue:
        curr = queue.pop(0)
        if curr not in collected:
            collected.add(curr)
            for child_id in children_map.get(curr, []):
                queue.append(child_id)
    return list(collected)

@router.get("/categories/tree", response_model=ApiResponse[List[CategoryTreeResponse]])
async def get_categories_tree(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("question:view")),
):
    cats_res = await db.execute(
        select(QuestionCategory).order_by(QuestionCategory.sort_order, QuestionCategory.name)
    )
    categories = cats_res.scalars().all()

    counts_res = await db.execute(
        select(Question.category_id, func.count(Question.id)).group_by(Question.category_id)
    )
    counts_map = {row[0]: row[1] for row in counts_res.all()}

    by_parent: Dict[Optional[str], List[QuestionCategory]] = {}
    for c in categories:
        by_parent.setdefault(c.parent_id, []).append(c)

    tree = build_tree_recursive(None, by_parent, counts_map)
    return ApiResponse(success=True, data=tree)

@router.get("/categories", response_model=ApiResponse[List[CategoryResponse]])
async def list_categories(
    parent_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("question:view")),
):
    all_cats_res = await db.execute(
        select(QuestionCategory).order_by(QuestionCategory.sort_order, QuestionCategory.name)
    )
    all_categories = all_cats_res.scalars().all()

    counts_res = await db.execute(
        select(Question.category_id, func.count(Question.id)).group_by(Question.category_id)
    )
    counts_map = {row[0]: row[1] for row in counts_res.all()}

    by_parent: Dict[Optional[str], List[QuestionCategory]] = {}
    for c in all_categories:
        by_parent.setdefault(c.parent_id, []).append(c)

    full_tree = build_tree_recursive(None, by_parent, counts_map)
    cumulative_map: Dict[str, int] = {}
    extract_cumulative_counts(full_tree, cumulative_map)

    if parent_id is not None:
        categories = [c for c in all_categories if c.parent_id == parent_id]
    else:
        categories = all_categories

    output = []
    for cat in categories:
        item = CategoryResponse.model_validate(cat)
        item.direct_count = counts_map.get(cat.id, 0)
        item.question_count = cumulative_map.get(cat.id, counts_map.get(cat.id, 0))
        output.append(item)

    return ApiResponse(success=True, data=output)

@router.post("/categories", response_model=ApiResponse[CategoryResponse], status_code=status.HTTP_201_CREATED)
async def create_category(
    payload: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("category:manage")),
    client_meta: ClientMeta = Depends(get_client_meta),
):
    if payload.parent_id:
        parent = await db.execute(
            select(QuestionCategory).where(QuestionCategory.id == payload.parent_id)
        )
        if not parent.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent category not found",
            )

    new_cat = QuestionCategory(
        parent_id=payload.parent_id,
        name=payload.name.strip(),
        description=payload.description,
        sort_order=payload.sort_order,
        created_by=current_admin.id,
    )
    db.add(new_cat)
    await db.flush()

    await AuditService.log_event(
        db=db,
        action="QUESTION_CATEGORY.CREATE",
        entity_type="questions_categories",
        entity_id=new_cat.id,
        client_meta=client_meta,
        admin_id=current_admin.id,
        admin_email=current_admin.email,
        metadata={"category_name": new_cat.name, "parent_id": new_cat.parent_id},
    )

    await db.commit()
    await db.refresh(new_cat)

    res = CategoryResponse.model_validate(new_cat)
    res.question_count = 0
    return ApiResponse(success=True, message="Category created successfully", data=res)

@router.get("/categories/{category_id}", response_model=ApiResponse[CategoryResponse])
async def get_category(
    category_id: str,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("question:view")),
):
    cat_res = await db.execute(
        select(QuestionCategory).where(QuestionCategory.id == category_id)
    )
    cat = cat_res.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    count_res = await db.execute(
        select(func.count(Question.id)).where(Question.category_id == category_id)
    )
    count = count_res.scalar() or 0

    res = CategoryResponse.model_validate(cat)
    res.direct_count = count
    res.question_count = count
    return ApiResponse(success=True, data=res)

@router.put("/categories/{category_id}", response_model=ApiResponse[CategoryResponse])
async def update_category(
    category_id: str,
    payload: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("category:manage")),
    client_meta: ClientMeta = Depends(get_client_meta),
):
    cat_res = await db.execute(
        select(QuestionCategory).where(QuestionCategory.id == category_id)
    )
    cat = cat_res.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    if payload.parent_id and payload.parent_id == category_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A category cannot be its own parent",
        )

    old_state = {
        "name": cat.name,
        "parent_id": cat.parent_id,
        "description": cat.description,
        "sort_order": cat.sort_order,
    }

    if payload.name is not None:
        cat.name = payload.name.strip()
    if payload.parent_id is not None:
        cat.parent_id = payload.parent_id if payload.parent_id else None
    if payload.description is not None:
        cat.description = payload.description
    if payload.sort_order is not None:
        cat.sort_order = payload.sort_order

    new_state = {
        "name": cat.name,
        "parent_id": cat.parent_id,
        "description": cat.description,
        "sort_order": cat.sort_order,
    }

    diff = calculate_row_diff(old_state, new_state)
    if diff:
        await AuditService.log_event(
            db=db,
            action="QUESTION_CATEGORY.UPDATE",
            entity_type="questions_categories",
            entity_id=cat.id,
            client_meta=client_meta,
            admin_id=current_admin.id,
            admin_email=current_admin.email,
            changes=diff,
        )

    await db.commit()
    await db.refresh(cat)

    count_res = await db.execute(
        select(func.count(Question.id)).where(Question.category_id == category_id)
    )
    count = count_res.scalar() or 0

    res = CategoryResponse.model_validate(cat)
    res.question_count = count
    return ApiResponse(success=True, message="Category updated successfully", data=res)

@router.delete("/categories/{category_id}", response_model=ApiResponse[dict])
async def delete_category(
    category_id: str,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("category:manage")),
    client_meta: ClientMeta = Depends(get_client_meta),
):
    cat_res = await db.execute(
        select(QuestionCategory).where(QuestionCategory.id == category_id)
    )
    cat = cat_res.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    all_family_ids = await get_descendant_category_ids(db, [category_id])
    direct_q_count = (
        await db.scalar(
            select(func.count(Question.id)).where(Question.category_id == category_id)
        )
        or 0
    )

    child_cat_ids = [cid for cid in all_family_ids if cid != category_id]
    child_q_count = 0
    child_names_with_questions: List[str] = []
    if child_cat_ids:
        sub_counts_res = await db.execute(
            select(QuestionCategory.name, func.count(Question.id))
            .join(Question, Question.category_id == QuestionCategory.id)
            .where(QuestionCategory.id.in_(child_cat_ids))
            .group_by(QuestionCategory.id, QuestionCategory.name)
        )
        for sub_name, s_count in sub_counts_res.all():
            child_q_count += s_count
            child_names_with_questions.append(sub_name)

    if direct_q_count > 0 and child_q_count > 0:
        names_str = ", ".join(child_names_with_questions[:3]) + ("..." if len(child_names_with_questions) > 3 else "")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete '{cat.name}'. This category contains {direct_q_count} questions and its subcategories ({names_str}) contain {child_q_count} questions. Move these questions to another category to delete.",
        )
    elif direct_q_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete '{cat.name}'. This category contains {direct_q_count} questions. Move these questions to another category to delete.",
        )
    elif child_q_count > 0:
        names_str = ", ".join(child_names_with_questions[:3]) + ("..." if len(child_names_with_questions) > 3 else "")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete '{cat.name}'. Its subcategories ({names_str}) contain {child_q_count} questions. Move these subcategory questions to another category to delete.",
        )

    await AuditService.log_event(
        db=db,
        action="QUESTION_CATEGORY.DELETE",
        entity_type="questions_categories",
        entity_id=cat.id,
        client_meta=client_meta,
        admin_id=current_admin.id,
        admin_email=current_admin.email,
        metadata={"deleted_category_name": cat.name, "deleted_child_count": len(child_cat_ids)},
    )

    await db.delete(cat)
    await db.commit()
    return ApiResponse(success=True, message="Category and associated empty subcategories deleted", data={"id": category_id})

@router.post("/move", response_model=ApiResponse[dict])
async def move_questions(
    payload: QuestionMoveRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("question:edit")),
    client_meta: ClientMeta = Depends(get_client_meta),
):
    target_res = await db.execute(
        select(QuestionCategory).where(QuestionCategory.id == payload.target_category_id)
    )
    target_cat = target_res.scalar_one_or_none()
    if not target_cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target category not found")

    moved_count = 0
    if payload.from_category_id:
        if payload.from_category_id == payload.target_category_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target category cannot be the same as source category",
            )
        source_res = await db.execute(
            select(QuestionCategory).where(QuestionCategory.id == payload.from_category_id)
        )
        source_cat = source_res.scalar_one_or_none()
        if not source_cat:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source category not found")

        source_family_ids = await get_descendant_category_ids(db, [payload.from_category_id])
        if payload.target_category_id in source_family_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot move questions into a subcategory of the source category",
            )

        if payload.include_subcategories:
            source_ids_to_move = source_family_ids
        else:
            source_ids_to_move = [payload.from_category_id]

        upd = (
            update(Question)
            .where(Question.category_id.in_(source_ids_to_move))
            .values(category_id=payload.target_category_id)
        )
        result = await db.execute(upd)
        moved_count = result.rowcount or 0

    elif payload.question_ids:
        if not payload.question_ids:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No question IDs provided")

        upd = (
            update(Question)
            .where(Question.id.in_(payload.question_ids))
            .values(category_id=payload.target_category_id)
        )
        result = await db.execute(upd)
        moved_count = result.rowcount or 0
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either from_category_id or question_ids must be provided",
        )

    await AuditService.log_event(
        db=db,
        action="QUESTION.BATCH_MOVE",
        entity_type="questions",
        entity_id=payload.target_category_id,
        client_meta=client_meta,
        admin_id=current_admin.id,
        admin_email=current_admin.email,
        metadata={
            "target_category_id": payload.target_category_id,
            "target_category_name": target_cat.name,
            "from_category_id": payload.from_category_id,
            "moved_count": moved_count,
        },
    )

    await db.commit()
    return ApiResponse(
        success=True,
        message=f"Successfully moved {moved_count} questions to '{target_cat.name}'",
        data={"moved_count": moved_count, "target_category_id": payload.target_category_id},
    )

@router.get("", response_model=PaginatedResponse[QuestionResponse])
async def list_questions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category_id: Optional[str] = Query(None),
    category_ids: Optional[str] = Query(None),
    exact: bool = Query(False),
    difficulty: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("question:view")),
):
    query = (
        select(Question)
        .options(selectinload(Question.options), selectinload(Question.category))
    )

    raw_category_ids: List[str] = []
    if category_id:
        raw_category_ids.append(category_id.strip())
    if category_ids:
        for cid in category_ids.split(","):
            cid_clean = cid.strip()
            if cid_clean and cid_clean not in raw_category_ids:
                raw_category_ids.append(cid_clean)

    if raw_category_ids:
        if exact:
            target_ids = raw_category_ids
        else:
            target_ids = await get_descendant_category_ids(db, raw_category_ids)
        query = query.where(Question.category_id.in_(target_ids))

    if difficulty:
        query = query.where(Question.difficulty == difficulty.lower().strip())
    if search:
        query = query.where(Question.question.ilike(f"%{search.strip()}%"))

    count_res = await db.execute(select(func.count()).select_from(query.subquery()))
    total_count = count_res.scalar() or 0

    offset = (page - 1) * page_size
    query = query.order_by(desc(Question.created_at)).offset(offset).limit(page_size)
    paginated_res = await db.execute(query)
    questions = paginated_res.scalars().all()

    total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 1

    cats_res = await db.execute(select(QuestionCategory))
    all_cats = cats_res.scalars().all()
    cat_map = {c.id: c for c in all_cats}

    def resolve_hierarchy(cid: str) -> tuple[str, List[str]]:
        crumbs: List[str] = []
        curr = cat_map.get(cid)
        visited = set()
        while curr and curr.id not in visited:
            visited.add(curr.id)
            crumbs.insert(0, curr.name)
            curr = cat_map.get(curr.parent_id) if curr.parent_id else None
        return " > ".join(crumbs), crumbs

    data = []
    for q in questions:
        path_str, hierarchy_list = resolve_hierarchy(q.category_id)
        item = QuestionResponse(
            id=q.id,
            category_id=q.category_id,
            category_name=q.category.name if q.category else None,
            category_path=path_str if path_str else (q.category.name if q.category else None),
            category_hierarchy=hierarchy_list if hierarchy_list else ([q.category.name] if q.category else []),
            question=q.question,
            difficulty=q.difficulty,
            explanation=q.explanation,
            created_by=q.created_by,
            created_at=q.created_at,
            updated_at=q.updated_at,
            options=[OptionResponse.model_validate(opt) for opt in q.options],
        )
        data.append(item)

    return PaginatedResponse(
        success=True,
        data=data,
        meta=PaginatedMeta(
            page=page,
            page_size=page_size,
            total_count=total_count,
            total_pages=total_pages,
        ),
    )

@router.post("", response_model=ApiResponse[QuestionResponse], status_code=status.HTTP_201_CREATED)
async def create_question(
    payload: QuestionCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("question:create")),
    client_meta: ClientMeta = Depends(get_client_meta),
):
    cat_res = await db.execute(
        select(QuestionCategory).where(QuestionCategory.id == payload.category_id)
    )
    category = cat_res.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    has_correct = any(opt.is_correct for opt in payload.options)
    if not has_correct:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one option must be marked as correct",
        )

    new_q = Question(
        category_id=payload.category_id,
        question=payload.question.strip(),
        difficulty=payload.difficulty,
        explanation=payload.explanation,
        created_by=current_admin.id,
    )
    db.add(new_q)
    await db.flush()

    for idx, opt_data in enumerate(payload.options):
        opt = QuestionOption(
            question_id=new_q.id,
            option_text=opt_data.option_text.strip(),
            is_correct=opt_data.is_correct,
            explanation=opt_data.explanation,
            sort_order=opt_data.sort_order if opt_data.sort_order else idx,
        )
        db.add(opt)

    await AuditService.log_event(
        db=db,
        action="QUESTION.CREATE",
        entity_type="questions",
        entity_id=new_q.id,
        client_meta=client_meta,
        admin_id=current_admin.id,
        admin_email=current_admin.email,
        metadata={"category_id": new_q.category_id, "difficulty": new_q.difficulty},
    )

    await db.commit()

    loaded_q_res = await db.execute(
        select(Question)
        .options(selectinload(Question.options), selectinload(Question.category))
        .where(Question.id == new_q.id)
    )
    loaded_q = loaded_q_res.scalar_one()

    res = QuestionResponse(
        id=loaded_q.id,
        category_id=loaded_q.category_id,
        category_name=loaded_q.category.name if loaded_q.category else None,
        question=loaded_q.question,
        difficulty=loaded_q.difficulty,
        explanation=loaded_q.explanation,
        created_by=loaded_q.created_by,
        created_at=loaded_q.created_at,
        updated_at=loaded_q.updated_at,
        options=[OptionResponse.model_validate(o) for o in loaded_q.options],
    )
    return ApiResponse(success=True, message="Question created successfully", data=res)

@router.get("/{question_id}", response_model=ApiResponse[QuestionResponse])
async def get_question_detail(
    question_id: str,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("question:view")),
):
    res = await db.execute(
        select(Question)
        .options(selectinload(Question.options), selectinload(Question.category))
        .where(Question.id == question_id)
    )
    q = res.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    output = QuestionResponse(
        id=q.id,
        category_id=q.category_id,
        category_name=q.category.name if q.category else None,
        question=q.question,
        difficulty=q.difficulty,
        explanation=q.explanation,
        created_by=q.created_by,
        created_at=q.created_at,
        updated_at=q.updated_at,
        options=[OptionResponse.model_validate(o) for o in q.options],
    )
    return ApiResponse(success=True, data=output)

@router.put("/{question_id}", response_model=ApiResponse[QuestionResponse])
async def update_question(
    question_id: str,
    payload: QuestionUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("question:edit")),
    client_meta: ClientMeta = Depends(get_client_meta),
):
    res = await db.execute(
        select(Question)
        .options(selectinload(Question.options), selectinload(Question.category))
        .where(Question.id == question_id)
    )
    q = res.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    old_state = {
        "question": q.question,
        "category_id": q.category_id,
        "difficulty": q.difficulty,
        "explanation": q.explanation,
    }

    if payload.category_id is not None:
        cat_res = await db.execute(
            select(QuestionCategory).where(QuestionCategory.id == payload.category_id)
        )
        if not cat_res.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        q.category_id = payload.category_id

    if payload.question is not None:
        q.question = payload.question.strip()
    if payload.difficulty is not None:
        q.difficulty = payload.difficulty
    if payload.explanation is not None:
        q.explanation = payload.explanation

    if payload.options is not None:
        if len(payload.options) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A question must have at least 2 options",
            )
        if not any(opt.is_correct for opt in payload.options):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one option must be marked as correct",
            )

        await db.execute(delete(QuestionOption).where(QuestionOption.question_id == q.id))
        for idx, opt_data in enumerate(payload.options):
            opt = QuestionOption(
                question_id=q.id,
                option_text=opt_data.option_text.strip(),
                is_correct=opt_data.is_correct,
                explanation=opt_data.explanation,
                sort_order=opt_data.sort_order if opt_data.sort_order else idx,
            )
            db.add(opt)

    new_state = {
        "question": q.question,
        "category_id": q.category_id,
        "difficulty": q.difficulty,
        "explanation": q.explanation,
    }

    diff = calculate_row_diff(old_state, new_state)
    if diff or payload.options is not None:
        await AuditService.log_event(
            db=db,
            action="QUESTION.UPDATE",
            entity_type="questions",
            entity_id=q.id,
            client_meta=client_meta,
            admin_id=current_admin.id,
            admin_email=current_admin.email,
            changes=diff if diff else None,
            metadata={"options_updated": payload.options is not None},
        )

    await db.commit()

    loaded_res = await db.execute(
        select(Question)
        .options(selectinload(Question.options), selectinload(Question.category))
        .where(Question.id == q.id)
    )
    loaded_q = loaded_res.scalar_one()

    output = QuestionResponse(
        id=loaded_q.id,
        category_id=loaded_q.category_id,
        category_name=loaded_q.category.name if loaded_q.category else None,
        question=loaded_q.question,
        difficulty=loaded_q.difficulty,
        explanation=loaded_q.explanation,
        created_by=loaded_q.created_by,
        created_at=loaded_q.created_at,
        updated_at=loaded_q.updated_at,
        options=[OptionResponse.model_validate(o) for o in loaded_q.options],
    )
    return ApiResponse(success=True, message="Question updated successfully", data=output)

@router.post("/bulk", response_model=ApiResponse[dict])
async def create_questions_bulk(
    payload: List[QuestionCreate],
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("question:create")),
    client_meta: ClientMeta = Depends(get_client_meta),
):
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No questions provided in bulk payload",
        )

    category_ids = {q.category_id for q in payload}
    for cat_id in category_ids:
        cat_res = await db.execute(
            select(QuestionCategory).where(QuestionCategory.id == cat_id)
        )
        if not cat_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Category '{cat_id}' not found",
            )

    for idx, q_data in enumerate(payload):
        if len(q_data.options) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Question {idx + 1} must have at least 2 options",
            )
        has_correct = any(opt.is_correct for opt in q_data.options)
        if not has_correct:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Question {idx + 1} must have at least one correct option",
            )

    created_question_ids = []
    for q_data in payload:
        new_q = Question(
            category_id=q_data.category_id,
            question=q_data.question.strip(),
            difficulty=q_data.difficulty,
            explanation=q_data.explanation,
            created_by=current_admin.id,
        )
        db.add(new_q)
        await db.flush()
        created_question_ids.append(new_q.id)

        for opt_idx, opt_data in enumerate(q_data.options):
            opt = QuestionOption(
                question_id=new_q.id,
                option_text=opt_data.option_text.strip(),
                is_correct=opt_data.is_correct,
                explanation=opt_data.explanation,
                sort_order=opt_data.sort_order if opt_data.sort_order is not None else opt_idx,
            )
            db.add(opt)

    await AuditService.log_event(
        db=db,
        action="QUESTION.BULK_CREATE",
        entity_type="questions",
        entity_id=created_question_ids[0] if created_question_ids else "",
        client_meta=client_meta,
        admin_id=current_admin.id,
        admin_email=current_admin.email,
        metadata={
            "count": len(created_question_ids),
            "category_ids": list(category_ids),
        },
    )

    await db.commit()
    return ApiResponse(
        success=True,
        message=f"Successfully created {len(created_question_ids)} questions",
        data={
            "inserted_count": len(created_question_ids),
            "question_ids": created_question_ids,
        },
    )

@router.delete("/{question_id}", response_model=ApiResponse[dict])
async def delete_question(
    question_id: str,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(require_permission("question:delete")),
    client_meta: ClientMeta = Depends(get_client_meta),
):
    res = await db.execute(
        select(Question).where(Question.id == question_id)
    )
    q = res.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    await AuditService.log_event(
        db=db,
        action="QUESTION.DELETE",
        entity_type="questions",
        entity_id=q.id,
        client_meta=client_meta,
        admin_id=current_admin.id,
        admin_email=current_admin.email,
        metadata={"category_id": q.category_id},
    )

    await db.delete(q)
    await db.commit()
    return ApiResponse(success=True, message="Question deleted successfully", data={"id": question_id})
