from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.config import get_settings
from app.schemas import (
    AdminAnnouncementItem,
    AdminAnnouncementRequest,
    AdminAnnouncementResponse,
    AdminFeedbackItem,
    AdminFeedbackReviewRequest,
    AdminStatsResponse,
    AdminReportItem,
    AssignmentParseRequest,
    AssignmentParseResponse,
    AdminLoginRequest,
    AdminLoginResponse,
    AdminUserItem,
    AdminUserStateRequest,
    ChatRequest,
    ChatResponse,
    FeedbackRequest,
    FeedbackResponse,
    HealthResponse,
    PersonaItem,
    PersonasResponse,
    PortalLoginRequest,
    PortalLoginResponse,
    PortalAccessResponse,
    PortalSectionResponse,
    QuickActionsResponse,
    QueryRouteRequest,
    QueryRouteResponse,
    RecentQueryItem,
    TopIntentItem,
)
from app.services.portal_config import get_portal_config
from app.services.chat_service import ChatService
from app.services.portal_data_service import PortalDataService
from app.services.assignment_service import AssignmentService
from app.services.auth_service import AuthService
from app.services.persistence import PersistenceService
from app.services.query_router import QueryRouterService
from app.services.identity_service import IdentityService
from app.services.admin_service import AdminService
from app.services.student_context_service import StudentContextService

router = APIRouter()
chat_service = ChatService()
persistence_service = PersistenceService()
auth_service = AuthService()
query_router = QueryRouterService()
assignment_service = AssignmentService()
portal_data_service = PortalDataService()
student_context_service = StudentContextService()
identity_service = IdentityService()
admin_service = AdminService()


def _route_ack_text(route_result: QueryRouteResponse) -> str:
    if route_result.action == "navigate":
        return route_result.navigation.label if route_result.navigation and route_result.navigation.label else "Navigation completed."
    if route_result.action == "clarify":
        return route_result.clarification or "Clarification requested."
    if route_result.action == "assignment_summary":
        return "Assignment summary generated."
    return "Query processed."


def require_admin(authorization: str | None = Header(default=None)) -> None:
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        if auth_service.token_is_admin(token):
            return

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized admin access")


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    settings = get_settings()
    persistence_mode = "supabase" if persistence_service.enabled else "memory"
    return HealthResponse(status="ok", app=settings.app_name, env=settings.app_env, persistence_mode=persistence_mode)


@router.post("/auth/login", response_model=PortalLoginResponse)
async def portal_login(payload: PortalLoginRequest) -> PortalLoginResponse:
    resolved = identity_service.resolve_login(email=payload.email, persona=payload.persona)
    if not resolved:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=identity_service.login_error_message(email=payload.email, persona=payload.persona),
        )
    if persistence_service.is_user_blocked(resolved.get("user_id")):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This portal account has been blocked by admin.",
        )
    return PortalLoginResponse(**resolved)


@router.get("/auth/access", response_model=PortalAccessResponse)
async def portal_access(user_id: str | None = None) -> PortalAccessResponse:
    if persistence_service.is_user_blocked(user_id):
        return PortalAccessResponse(allowed=False, detail="This portal account has been blocked by admin.")
    return PortalAccessResponse(allowed=True)


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest, authorization: str | None = Header(default=None), x_student_id: str | None = Header(default=None)) -> ChatResponse:
    resolved_student_id = student_context_service.resolve_student_id(
        authorization=authorization,
        header_student_id=x_student_id,
        explicit_student_id=payload.user_id,
    )
    if resolved_student_id:
        payload.user_id = resolved_student_id
    if persistence_service.is_user_blocked(payload.user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This portal account has been blocked by admin.")
    return await chat_service.get_chat_response(payload)


@router.post("/query/route", response_model=QueryRouteResponse)
async def query_route(payload: QueryRouteRequest, authorization: str | None = Header(default=None), x_student_id: str | None = Header(default=None)) -> QueryRouteResponse:
    resolved_student_id = student_context_service.resolve_student_id(
        authorization=authorization,
        header_student_id=x_student_id,
        explicit_student_id=payload.user_id,
    )
    if resolved_student_id:
        payload.user_id = resolved_student_id
    if persistence_service.is_user_blocked(payload.user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This portal account has been blocked by admin.")
    route_result = query_router.route_query(payload)
    if route_result.action != "fallback_llm":
        persistence_service.persist_route_interaction(
            session_id=payload.session_id,
            user_id=payload.user_id,
            message=payload.message,
            intent=route_result.intent,
            assistant_reply=_route_ack_text(route_result),
            role=payload.role,
        )
    return route_result


@router.post("/assignments/parse-due", response_model=AssignmentParseResponse)
async def parse_due_assignments(payload: AssignmentParseRequest, authorization: str | None = Header(default=None), x_student_id: str | None = Header(default=None)) -> AssignmentParseResponse:
    _ = student_context_service.resolve_student_id(
        authorization=authorization,
        header_student_id=x_student_id,
        explicit_student_id=None,
    )
    return assignment_service.parse_due_assignments(payload)


@router.get("/portal/section/{section_name}", response_model=PortalSectionResponse)
async def portal_section(
    section_name: str,
    subject: str | None = None,
    student_id: str | None = None,
    semester: str | None = None,
    authorization: str | None = Header(default=None),
    x_student_id: str | None = Header(default=None),
) -> PortalSectionResponse:
    try:
        resolved_student_id = student_context_service.resolve_student_id(
            authorization=authorization,
            header_student_id=x_student_id,
            explicit_student_id=student_id,
        )
        if persistence_service.is_user_blocked(resolved_student_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This portal account has been blocked by admin.",
            )
        if portal_data_service.section_requires_auth(section_name) and not resolved_student_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Student authentication required for this section.",
            )
        if portal_data_service.section_requires_auth(section_name) and not portal_data_service.has_access(
            section_name=section_name,
            student_id=resolved_student_id,
            subject=subject,
            semester=semester,
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to access this section.",
            )
        payload = portal_data_service.get_section_data(
            section_name=section_name,
            subject=subject,
            student_id=resolved_student_id,
            semester=semester,
        )
        return PortalSectionResponse(**payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get("/portal/personas", response_model=PersonasResponse)
async def portal_personas() -> PersonasResponse:
    cfg = get_portal_config()
    personas_cfg = cfg.get("personas", {})
    items = []
    for key, details in personas_cfg.items():
        if key not in {"student", "faculty"}:
            continue
        items.append(
            PersonaItem(
                key=key,
                label=details.get("label", key.title()),
                description=details.get("description", ""),
            )
        )
    if not items:
        items = [
            PersonaItem(key="student", label="Student", description="Track subjects, assignments, fees, and results."),
            PersonaItem(key="faculty", label="Faculty", description="View class workload, student progress, and leave requests."),
        ]
    return PersonasResponse(personas=items)


@router.get("/portal/quick-actions", response_model=QuickActionsResponse)
async def portal_quick_actions(role: str = "student") -> QuickActionsResponse:
    cfg = get_portal_config()
    intent_cfg = cfg.get("intent_config", {})
    personas_cfg = cfg.get("personas", {})
    role_key = (role or "student").strip().lower()
    persona_details = personas_cfg.get(role_key, {})
    persona_actions = persona_details.get("quick_actions", [])

    if persona_actions:
        return QuickActionsResponse(
            actions=[
                {
                    "intent": item.get("intent", "general"),
                    "label": item.get("label", "Quick Action"),
                    "query": item.get("query", item.get("label", "help")),
                    "tone": item.get("tone", "General"),
                    "priority": int(item.get("priority", 1)),
                }
                for item in persona_actions
            ]
        )

    label_map = {
        "attendance": ("Attendance Summary", "Academic"),
        "syllabus": ("Syllabus Overview", "Course"),
        "assignments": ("Due Assignments", "Deadline"),
        "fees": ("Fee Status", "Finance"),
        "performance": ("Results Overview", "Performance"),
    }
    query_map = {
        "attendance": "attendance of all subjects",
        "syllabus": "syllabus of all subjects",
        "assignments": "due assignment of all subjects",
        "fees": "pending fees",
        "performance": "show result",
    }

    ranked_actions = []
    for intent, details in intent_cfg.items():
        priority = int(details.get("intent_priority", 1))
        keywords = [k for k in details.get("route_confidence_keywords", []) if isinstance(k, str)]
        fallback_query = query_map.get(intent, keywords[0] if keywords else intent)
        label, tone = label_map.get(intent, (intent.replace("_", " ").title(), "General"))
        ranked_actions.append(
            {
                "intent": intent,
                "label": label,
                "query": fallback_query,
                "tone": tone,
                "priority": priority,
            }
        )

    ranked_actions.sort(key=lambda row: row["priority"], reverse=True)
    return QuickActionsResponse(actions=ranked_actions[:6])


@router.post("/admin/login", response_model=AdminLoginResponse)
async def admin_login(payload: AdminLoginRequest) -> AdminLoginResponse:
    token, email = auth_service.admin_login(payload.email, payload.password)
    if not token or not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials")
    return AdminLoginResponse(access_token=token, email=email)


@router.get("/admin/stats", response_model=AdminStatsResponse, dependencies=[Depends(require_admin)])
async def admin_stats() -> AdminStatsResponse:
    return persistence_service.get_admin_stats()


@router.get("/admin/recent-queries", response_model=list[RecentQueryItem], dependencies=[Depends(require_admin)])
async def admin_recent_queries() -> list[RecentQueryItem]:
    return persistence_service.get_recent_queries()


@router.get("/admin/top-intents", response_model=list[TopIntentItem], dependencies=[Depends(require_admin)])
async def admin_top_intents() -> list[TopIntentItem]:
    return persistence_service.get_top_intents()


@router.get("/admin/users", response_model=list[AdminUserItem], dependencies=[Depends(require_admin)])
async def admin_users() -> list[AdminUserItem]:
    cfg = get_portal_config()
    all_user_ids = list((cfg.get("students") or {}).keys()) + list((cfg.get("faculty") or {}).keys())
    state_map = {user_id: persistence_service.get_user_state(user_id) for user_id in all_user_ids}
    return admin_service.list_users(state_map)


@router.post("/admin/users/{user_id}/state", response_model=AdminUserItem, dependencies=[Depends(require_admin)])
async def admin_user_state(user_id: str, payload: AdminUserStateRequest) -> AdminUserItem:
    persistence_service.update_user_state(user_id, verified=payload.verified, blocked=payload.blocked)
    cfg = get_portal_config()
    all_user_ids = list((cfg.get("students") or {}).keys()) + list((cfg.get("faculty") or {}).keys())
    state_map = {item_id: persistence_service.get_user_state(item_id) for item_id in all_user_ids}
    users = {item.user_id: item for item in admin_service.list_users(state_map)}
    if user_id not in users:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return users[user_id]


@router.get("/admin/reports", response_model=list[AdminReportItem], dependencies=[Depends(require_admin)])
async def admin_reports() -> list[AdminReportItem]:
    return persistence_service.get_flagged_reports()


@router.get("/admin/feedback", response_model=list[AdminFeedbackItem], dependencies=[Depends(require_admin)])
async def admin_feedback() -> list[AdminFeedbackItem]:
    return persistence_service.get_feedback_entries()


@router.post("/admin/feedback/{message_id}/review", response_model=AdminFeedbackItem, dependencies=[Depends(require_admin)])
async def admin_feedback_review(message_id: str, payload: AdminFeedbackReviewRequest) -> AdminFeedbackItem:
    persistence_service.save_feedback_review(message_id=message_id, reviewed=payload.reviewed, note=payload.note)
    entry = next((item for item in persistence_service.get_feedback_entries(limit=100) if item.message_id == message_id), None)
    if entry:
        return entry
    review = persistence_service.get_feedback_review(message_id)
    return AdminFeedbackItem(message_id=message_id, rating=0, comment=None, created_at=None, reviewed=bool(review.get("reviewed")), review_note=review.get("note"))


@router.get("/feedback/reviews")
async def feedback_reviews(message_ids: str = "") -> dict[str, dict]:
    items = [item.strip() for item in message_ids.split(",") if item.strip()]
    return persistence_service.get_feedback_reviews(items)


@router.post("/admin/announcements", response_model=AdminAnnouncementResponse, dependencies=[Depends(require_admin)])
async def admin_announcements(payload: AdminAnnouncementRequest) -> AdminAnnouncementResponse:
    item = persistence_service.create_announcement(title=payload.title, message=payload.message, audience=payload.audience)
    return AdminAnnouncementResponse(status=item.status, announcement_id=item.announcement_id)


@router.get("/admin/announcements", response_model=list[AdminAnnouncementItem], dependencies=[Depends(require_admin)])
async def admin_announcements_list() -> list[AdminAnnouncementItem]:
    return persistence_service.get_announcements(limit=20)


@router.get("/portal/announcements", response_model=list[AdminAnnouncementItem])
async def portal_announcements(role: str = "student") -> list[AdminAnnouncementItem]:
    return persistence_service.get_announcements(audience=role, limit=5)


@router.post("/feedback", response_model=FeedbackResponse)
async def feedback(payload: FeedbackRequest) -> FeedbackResponse:
    persistence_service.persist_feedback(payload)
    return FeedbackResponse(status="ok")
