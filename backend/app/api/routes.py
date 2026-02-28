from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.config import get_settings
from app.schemas import (
    AdminStatsResponse,
    ChatRequest,
    ChatResponse,
    FeedbackRequest,
    FeedbackResponse,
    HealthResponse,
    RecentQueryItem,
    TopIntentItem,
)
from app.services.chat_service import ChatService
from app.services.persistence import PersistenceService

router = APIRouter()
chat_service = ChatService()
persistence_service = PersistenceService()


def require_admin(x_admin_key: str | None = Header(default=None)) -> None:
    settings = get_settings()
    if not settings.admin_api_key:
        return
    if x_admin_key != settings.admin_api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized admin access")


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(status="ok", app=settings.app_name, env=settings.app_env)


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest) -> ChatResponse:
    return await chat_service.get_chat_response(payload)


@router.get("/admin/stats", response_model=AdminStatsResponse, dependencies=[Depends(require_admin)])
async def admin_stats() -> AdminStatsResponse:
    return persistence_service.get_admin_stats()


@router.get("/admin/recent-queries", response_model=list[RecentQueryItem], dependencies=[Depends(require_admin)])
async def admin_recent_queries() -> list[RecentQueryItem]:
    return persistence_service.get_recent_queries()


@router.get("/admin/top-intents", response_model=list[TopIntentItem], dependencies=[Depends(require_admin)])
async def admin_top_intents() -> list[TopIntentItem]:
    return persistence_service.get_top_intents()


@router.post("/feedback", response_model=FeedbackResponse)
async def feedback(payload: FeedbackRequest) -> FeedbackResponse:
    persistence_service.persist_feedback(payload)
    return FeedbackResponse(status="ok")
