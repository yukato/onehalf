"""
Pydantic schemas for API request/response models
"""

from datetime import datetime
from pydantic import BaseModel, Field


# Authentication
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# Chat Request
class ConversationMessage(BaseModel):
    """会話履歴の1メッセージ"""
    role: str = Field(..., description="user または assistant")
    content: str


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    top_k: int = Field(default=3, ge=1, le=10)
    category: str | None = Field(default=None, description="カテゴリでフィルタ（男性会員の方/女性会員の方）")
    conversation_history: list[ConversationMessage] = Field(default=[], description="これまでの会話履歴")


# FAQ Response
class FAQSource(BaseModel):
    title: str
    url: str
    score: float


class FAQMacroRef(BaseModel):
    """FAQで参照したマクロ情報"""
    macro_id: int
    title: str
    score: float


class SimilarTicketRef(BaseModel):
    """類似チケット情報（参考表示用）"""
    ticket_id: int
    subject: str
    score: float


class FAQChatResponse(BaseModel):
    answer: str
    sources: list[FAQSource]
    referenced_macros: list[FAQMacroRef] = []
    similar_tickets: list[SimilarTicketRef] = []  # 参考用の類似チケット
    # 品質評価は内部利用のみ（APIレスポンスには含めない）


class FAQStats(BaseModel):
    article_count: int
    model: str


# Internal Tool Response
class TicketSource(BaseModel):
    ticket_id: int
    subject: str
    url: str
    score: float


class MacroSuggestion(BaseModel):
    macro_id: int
    title: str
    score: float
    comment_template: str


class InternalChatResponse(BaseModel):
    answer: str
    sources: list[TicketSource]
    suggested_macros: list[MacroSuggestion] = []


class InternalStats(BaseModel):
    ticket_count: int
    model: str


# Settings
class ModelInfo(BaseModel):
    provider: str
    model: str
    name: str
    enabled: bool


class CurrentSettings(BaseModel):
    provider: str
    model: str


class SettingsResponse(BaseModel):
    current: CurrentSettings
    available_models: list[ModelInfo]


class UpdateSettingsRequest(BaseModel):
    provider: str
    model: str


# Operational Rules
# target_gender: ["male"], ["female"], ["male", "female"], or None (not applied)
class OperationalRule(BaseModel):
    id: str
    title: str
    content: str
    enabled: bool = True
    order: int
    target_gender: list[str] | None = None  # ["male", "female"] or None
    created_at: datetime
    updated_at: datetime
    updated_by: str


class RuleChange(BaseModel):
    old: str | None
    new: str | None


class RuleHistory(BaseModel):
    id: str
    rule_id: str
    action: str  # create, update, delete, enable, disable
    timestamp: datetime
    username: str
    changes: dict[str, RuleChange] = {}


class CreateRuleRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1, max_length=5000)
    enabled: bool = True
    target_gender: list[str] | None = None  # ["male", "female"] or None


class UpdateRuleRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    content: str | None = Field(default=None, min_length=1, max_length=5000)
    enabled: bool | None = None
    order: int | None = None
    target_gender: list[str] | None = None  # ["male", "female"] or None


class RulesListResponse(BaseModel):
    rules: list[OperationalRule]
    total: int


class RuleHistoryResponse(BaseModel):
    history: list[RuleHistory]
    total: int


# Quality Assessment & Improvement Recommendations

class QualityAssessment(BaseModel):
    """AIによる回答品質の自己評価"""
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="回答の確信度 (0.0-1.0)")
    information_completeness: str = Field(..., description="complete | partial | insufficient")
    suggested_improvement: str | None = Field(default=None, description="改善が必要な場合の提案")
    missing_topics: list[str] = Field(default_factory=list, description="不足している情報のトピック")


class MatchedFAQ(BaseModel):
    """チャットログで参照したFAQ情報"""
    faq_id: str
    title: str
    score: float


class ImprovementSuggestion(BaseModel):
    """集計された改善提案"""
    id: str
    topic: str = Field(..., description="改善が必要なトピック")
    occurrence_count: int = Field(..., description="発生回数")
    sample_questions: list[str] = Field(default_factory=list, description="サンプル質問（最大5件）")
    avg_confidence: float = Field(..., description="平均確信度")
    suggested_action: str = Field(..., description="create_new | update_existing | add_examples")
    related_faq_ids: list[str] = Field(default_factory=list, description="関連する既存FAQ ID")
    created_at: datetime
    status: str = Field(default="pending", description="pending | in_progress | resolved | dismissed")


class ArticleDraft(BaseModel):
    """AI生成の記事下書き"""
    id: str
    suggestion_id: str = Field(..., description="元の改善提案ID")
    title: str
    content: str = Field(..., description="マークダウン形式")
    source_questions: list[str] = Field(default_factory=list, description="参考にした質問")
    generated_at: datetime


# API Request/Response for Improvements

class ImprovementSuggestionsResponse(BaseModel):
    suggestions: list[ImprovementSuggestion]
    total: int


class ArticleDraftsResponse(BaseModel):
    drafts: list[ArticleDraft]
    total: int


class UpdateSuggestionStatusRequest(BaseModel):
    status: str = Field(..., description="pending | in_progress | resolved | dismissed")


class AnalyzeRequest(BaseModel):
    days: int = Field(default=7, ge=1, le=90, description="分析対象の日数")
    min_occurrences: int = Field(default=3, ge=1, description="最小発生回数")


# Admin Login/Event Logging
class AdminLoginLogRequest(BaseModel):
    """管理者ログインイベントの記録リクエスト"""
    admin_user_id: str = Field(..., description="管理者ユーザーID")
    admin_username: str = Field(..., description="管理者ユーザー名")
    event_type: str = Field(default="login", description="イベントタイプ（login, logout, refresh）")
