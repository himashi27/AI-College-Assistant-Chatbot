from typing import List, Optional

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=128)
    user_id: Optional[str] = Field(default=None, max_length=128)
    message: str = Field(..., min_length=1, max_length=2000)
    role: str = Field(default="student", max_length=32)
    language: str = Field(default="en", max_length=16)


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


class FeedbackRequest(BaseModel):
    message_id: str = Field(..., min_length=1, max_length=128)
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = Field(default=None, max_length=1000)


class FeedbackResponse(BaseModel):
    status: str
