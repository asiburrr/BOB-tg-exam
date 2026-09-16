from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

class OptionCreate(BaseModel):
    option_text: str = Field(..., min_length=1)
    is_correct: bool = False
    explanation: Optional[str] = None
    sort_order: int = 0

class OptionResponse(BaseModel):
    id: str
    question_id: str
    option_text: str
    is_correct: bool
    explanation: Optional[str] = None
    sort_order: int

    class Config:
        from_attributes = True

class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    parent_id: Optional[str] = None
    description: Optional[str] = None
    sort_order: int = 0

class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    parent_id: Optional[str] = None
    description: Optional[str] = None
    sort_order: Optional[int] = None

class CategoryResponse(BaseModel):
    id: str
    parent_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    sort_order: int
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    question_count: int = 0
    direct_count: int = 0

    class Config:
        from_attributes = True

class CategoryTreeResponse(BaseModel):
    id: str
    parent_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    sort_order: int
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    question_count: int = 0
    direct_count: int = 0
    children: List["CategoryTreeResponse"] = []

    class Config:
        from_attributes = True

class QuestionCreate(BaseModel):
    category_id: str
    question: str = Field(..., min_length=1)
    difficulty: str = Field("medium", pattern="^(easy|medium|hard|expert)$")
    explanation: Optional[str] = None
    options: List[OptionCreate] = Field(..., min_length=2)

class QuestionUpdate(BaseModel):
    category_id: Optional[str] = None
    question: Optional[str] = Field(None, min_length=1)
    difficulty: Optional[str] = Field(None, pattern="^(easy|medium|hard|expert)$")
    explanation: Optional[str] = None
    options: Optional[List[OptionCreate]] = None

class QuestionResponse(BaseModel):
    id: str
    category_id: str
    category_name: Optional[str] = None
    category_path: Optional[str] = None
    category_hierarchy: List[str] = []
    question: str
    difficulty: str
    explanation: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    options: List[OptionResponse] = []

    class Config:
        from_attributes = True

class QuestionMoveRequest(BaseModel):
    target_category_id: str
    question_ids: Optional[List[str]] = None
    from_category_id: Optional[str] = None
    include_subcategories: bool = True

