from typing import List, Optional

from pydantic import BaseModel, Field


class ChatHistoryItem(BaseModel):
    role: str = Field(..., min_length=1, max_length=32)
    text: str = Field(..., min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=128)
    user_id: Optional[str] = Field(default=None, max_length=128)
    message: str = Field(..., min_length=1, max_length=2000)
    role: str = Field(default="student", max_length=32)
    language: str = Field(default="en", max_length=16)
    history: List[ChatHistoryItem] = Field(default_factory=list, max_length=12)


class SourceItem(BaseModel):
    title: str
    snippet: str


class ChatResponse(BaseModel):
    reply: str
    sources: List[SourceItem]
    latency_ms: int
    session_id: str
    message_id: str


class HealthResponse(BaseModel):
    status: str
    app: str
    env: str
    persistence_mode: str


class AdminStatsResponse(BaseModel):
    total_queries: int
    active_users: int
    avg_latency_ms: int
    csat: Optional[float] = None


class RecentQueryItem(BaseModel):
    query: str
    session_id: str
    created_at: Optional[str] = None


class TopIntentItem(BaseModel):
    name: str
    value: int


class AdminUserItem(BaseModel):
    user_id: str
    name: str
    email: str
    persona: str
    semester: Optional[int] = None


class AdminReportItem(BaseModel):
    report_id: str
    session_id: str
    query: str
    created_at: Optional[str] = None
    reason: str


class AdminFeedbackItem(BaseModel):
    message_id: str
    rating: int
    comment: Optional[str] = None
    created_at: Optional[str] = None


class AdminAnnouncementRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=160)
    message: str = Field(..., min_length=3, max_length=1000)
    audience: str = Field(default="students", min_length=3, max_length=32)


class AdminAnnouncementResponse(BaseModel):
    status: str
    announcement_id: str


class FeedbackRequest(BaseModel):
    message_id: str = Field(..., min_length=1, max_length=128)
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = Field(default=None, max_length=1000)


class FeedbackResponse(BaseModel):
    status: str


class AdminLoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=6, max_length=255)


class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    email: str


class PortalLoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    persona: str = Field(..., min_length=3, max_length=32)


class PortalLoginResponse(BaseModel):
    persona: str
    user_id: str
    email: str
    display_name: str


class QueryRouteRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: Optional[str] = Field(default=None, max_length=128)
    user_id: Optional[str] = Field(default=None, max_length=128)
    role: str = Field(default="student", max_length=32)
    current_page: Optional[str] = Field(default=None, max_length=256)


class NavigationTarget(BaseModel):
    url: str
    label: Optional[str] = None
    anchor: Optional[str] = None


class QueryRouteData(BaseModel):
    subject: Optional[str] = None
    suggestions: Optional[List[str]] = None
    filters: Optional[dict] = None


class QueryRouteResponse(BaseModel):
    action: str
    intent: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    matched_keyword: Optional[str] = None
    navigation: Optional[NavigationTarget] = None
    data: Optional[QueryRouteData] = None
    clarification: Optional[str] = None


class AssignmentDueItem(BaseModel):
    subject: str
    title: str
    due_date: str
    status: str
    priority: Optional[str] = None


class AssignmentParseRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    current_page: Optional[str] = Field(default=None, max_length=256)


class AssignmentParseResponse(BaseModel):
    action: str = "assignment_summary"
    subject: Optional[str] = None
    assignments: List[AssignmentDueItem]


class PortalSectionResponse(BaseModel):
    section: str
    requires_auth: bool = False
    last_updated_at: Optional[str] = None
    subject: Optional[str] = None
    data: Optional[dict] = None


class QuickActionItem(BaseModel):
    intent: str
    label: str
    query: str
    tone: str
    priority: int


class QuickActionsResponse(BaseModel):
    actions: List[QuickActionItem]


class PersonaItem(BaseModel):
    key: str
    label: str
    description: str


class PersonasResponse(BaseModel):
    personas: List[PersonaItem]
