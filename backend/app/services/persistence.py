from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
import uuid
from typing import List

from app.config import get_settings
from app.schemas import AdminAnnouncementItem, AdminFeedbackItem, AdminReportItem, AdminStatsResponse, ChatRequest, FeedbackRequest, RecentQueryItem, SourceItem, TopIntentItem

try:
    from supabase import Client, create_client
except ImportError:  # pragma: no cover
    Client = None
    create_client = None


class PersistenceService:
    def __init__(self) -> None:
        settings = get_settings()
        self._enabled = bool(settings.supabase_url and settings.supabase_key and create_client)
        self._client: Client | None = None
        self._mem_sessions: dict[str, dict] = {}
        self._mem_messages: list[dict] = []
        self._mem_intents: list[dict] = []
        self._mem_feedback: list[dict] = []
        self._mem_user_states: dict[str, dict] = {}
        self._mem_announcements: list[dict] = []
        self._mem_feedback_reviews: dict[str, dict] = {}
        self._report_keywords = {
            "hack": "Possible misuse request",
            "bypass": "Possible misuse request",
            "password": "Sensitive credential-related query",
            "exploit": "Potential exploitation query",
            "abuse": "Potential inappropriate use",
            "inappropriate": "Potential inappropriate content",
        }

        if self._enabled:
            self._client = create_client(settings.supabase_url, settings.supabase_key)

    @property
    def enabled(self) -> bool:
        return self._enabled and self._client is not None

    def persist_chat(
        self,
        req: ChatRequest,
        assistant_message_id: str,
        assistant_reply: str,
        sources: List[SourceItem],
        latency_ms: int,
    ) -> None:
        now = datetime.now(timezone.utc).isoformat()
        user_message_id = f"{assistant_message_id}-user"
        intent = self._extract_intent(req.message)
        sources_payload = [item.model_dump() for item in sources]

        if not self.enabled:
            self._persist_chat_memory(
                req=req,
                now=now,
                user_message_id=user_message_id,
                assistant_message_id=assistant_message_id,
                assistant_reply=assistant_reply,
                sources_payload=sources_payload,
                latency_ms=latency_ms,
                intent=intent,
            )
            return

        try:
            self._client.table("chat_sessions").upsert(
                {
                    "session_id": req.session_id,
                    "user_id": req.user_id,
                    "role": req.role,
                    "language": req.language,
                    "last_active_at": now,
                },
                on_conflict="session_id",
            ).execute()

            self._client.table("chat_messages").insert(
                [
                    {
                        "message_id": user_message_id,
                        "session_id": req.session_id,
                        "role": "user",
                        "message": req.message,
                        "latency_ms": 0,
                        "sources": [],
                    },
                    {
                        "message_id": assistant_message_id,
                        "session_id": req.session_id,
                        "role": "assistant",
                        "message": assistant_reply,
                        "latency_ms": latency_ms,
                        "sources": sources_payload,
                    },
                ]
            ).execute()

            self._client.table("intent_logs").insert(
                {
                    "session_id": req.session_id,
                    "user_id": req.user_id,
                    "intent": intent,
                    "query": req.message,
                    "confidence": 0.6,
                }
            ).execute()
        except Exception:
            self._persist_chat_memory(
                req=req,
                now=now,
                user_message_id=user_message_id,
                assistant_message_id=assistant_message_id,
                assistant_reply=assistant_reply,
                sources_payload=sources_payload,
                latency_ms=latency_ms,
                intent=intent,
            )

    def persist_route_interaction(
        self,
        *,
        session_id: str | None,
        user_id: str | None,
        message: str,
        intent: str,
        assistant_reply: str,
        role: str = "student",
        language: str = "en",
        confidence: float = 0.9,
    ) -> None:
        req = ChatRequest(
            session_id=session_id or f"route-{uuid.uuid4()}",
            user_id=user_id,
            message=message,
            role=role,
            language=language,
        )
        now = datetime.now(timezone.utc).isoformat()
        assistant_message_id = str(uuid.uuid4())
        user_message_id = f"{assistant_message_id}-user"
        sources_payload: list[dict] = []
        latency_ms = 0

        if not self.enabled:
            self._persist_chat_memory(
                req=req,
                now=now,
                user_message_id=user_message_id,
                assistant_message_id=assistant_message_id,
                assistant_reply=assistant_reply,
                sources_payload=sources_payload,
                latency_ms=latency_ms,
                intent=intent,
            )
            return

        try:
            self._client.table("chat_sessions").upsert(
                {
                    "session_id": req.session_id,
                    "user_id": req.user_id,
                    "role": req.role,
                    "language": req.language,
                    "last_active_at": now,
                },
                on_conflict="session_id",
            ).execute()

            self._client.table("chat_messages").insert(
                [
                    {
                        "message_id": user_message_id,
                        "session_id": req.session_id,
                        "role": "user",
                        "message": req.message,
                        "latency_ms": 0,
                        "sources": [],
                    },
                    {
                        "message_id": assistant_message_id,
                        "session_id": req.session_id,
                        "role": "assistant",
                        "message": assistant_reply,
                        "latency_ms": latency_ms,
                        "sources": sources_payload,
                    },
                ]
            ).execute()

            self._client.table("intent_logs").insert(
                {
                    "session_id": req.session_id,
                    "user_id": req.user_id,
                    "intent": intent,
                    "query": req.message,
                    "confidence": 0.6,
                }
            ).execute()
        except Exception:
            self._persist_chat_memory(
                req=req,
                now=now,
                user_message_id=user_message_id,
                assistant_message_id=assistant_message_id,
                assistant_reply=assistant_reply,
                sources_payload=sources_payload,
                latency_ms=latency_ms,
                intent=intent,
            )
            return

        try:
            self._client.table("chat_sessions").upsert(
                {
                    "session_id": req.session_id,
                    "user_id": req.user_id,
                    "role": req.role,
                    "language": req.language,
                    "last_active_at": now,
                },
                on_conflict="session_id",
            ).execute()

            self._client.table("chat_messages").insert(
                [
                    {
                        "message_id": user_message_id,
                        "session_id": req.session_id,
                        "role": "user",
                        "message": req.message,
                        "latency_ms": 0,
                        "sources": [],
                    },
                    {
                        "message_id": assistant_message_id,
                        "session_id": req.session_id,
                        "role": "assistant",
                        "message": assistant_reply,
                        "latency_ms": 0,
                        "sources": [],
                    },
                ]
            ).execute()

            self._client.table("intent_logs").insert(
                {
                    "session_id": req.session_id,
                    "user_id": req.user_id,
                    "intent": intent,
                    "query": req.message,
                    "confidence": confidence,
                }
            ).execute()
        except Exception:
            self._persist_chat_memory(
                req=req,
                now=now,
                user_message_id=user_message_id,
                assistant_message_id=assistant_message_id,
                assistant_reply=assistant_reply,
                sources_payload=sources_payload,
                latency_ms=latency_ms,
                intent=intent,
            )
            return

        try:
            self._client.table("chat_sessions").upsert(
                {
                    "session_id": req.session_id,
                    "user_id": req.user_id,
                    "role": req.role,
                    "language": req.language,
                    "last_active_at": now,
                },
                on_conflict="session_id",
            ).execute()

            self._client.table("chat_messages").insert(
                [
                    {
                        "message_id": user_message_id,
                        "session_id": req.session_id,
                        "role": "user",
                        "message": req.message,
                        "latency_ms": 0,
                        "sources": [],
                    },
                    {
                        "message_id": assistant_message_id,
                        "session_id": req.session_id,
                        "role": "assistant",
                        "message": assistant_reply,
                        "latency_ms": latency_ms,
                        "sources": sources_payload,
                    },
                ]
            ).execute()

            self._client.table("intent_logs").insert(
                {
                    "session_id": req.session_id,
                    "user_id": req.user_id,
                    "intent": intent,
                    "query": req.message,
                    "confidence": 0.6,
                }
            ).execute()
        except Exception:
            self._persist_chat_memory(
                req=req,
                now=now,
                user_message_id=user_message_id,
                assistant_message_id=assistant_message_id,
                assistant_reply=assistant_reply,
                sources_payload=sources_payload,
                latency_ms=latency_ms,
                intent=intent,
            )

    def _persist_chat_memory(
        self,
        req: ChatRequest,
        now: str,
        user_message_id: str,
        assistant_message_id: str,
        assistant_reply: str,
        sources_payload: list[dict],
        latency_ms: int,
        intent: str,
    ) -> None:
        self._mem_sessions[req.session_id] = {
            "session_id": req.session_id,
            "user_id": req.user_id,
            "role": req.role,
            "language": req.language,
            "last_active_at": now,
        }
        self._mem_messages.extend(
            [
                {
                    "message_id": user_message_id,
                    "session_id": req.session_id,
                    "role": "user",
                    "message": req.message,
                    "latency_ms": 0,
                    "sources": [],
                    "created_at": now,
                },
                {
                    "message_id": assistant_message_id,
                    "session_id": req.session_id,
                    "role": "assistant",
                    "message": assistant_reply,
                    "latency_ms": latency_ms,
                    "sources": sources_payload,
                    "created_at": now,
                },
            ]
        )
        self._mem_intents.append(
            {
                "session_id": req.session_id,
                "user_id": req.user_id,
                "intent": intent,
                "query": req.message,
                "confidence": 0.6,
                "created_at": now,
            }
        )

    def _extract_intent(self, query: str) -> str:
        text = query.lower()

        if any(token in text for token in ("admission", "apply", "enroll")):
            return "admissions"
        if any(token in text for token in ("fee", "tuition", "payment", "scholarship")):
            return "fees"
        if any(token in text for token in ("exam", "timetable", "schedule")):
            return "academics"
        if any(token in text for token in ("hostel", "housing", "dorm")):
            return "housing"

        return "general"

    def get_admin_stats(self) -> AdminStatsResponse:
        if not self.enabled:
            return self._admin_stats_from_memory()

        try:
            assistant_rows = self._client.table("chat_messages").select("latency_ms").eq("role", "assistant").execute()
            session_rows = self._client.table("chat_sessions").select("user_id").execute()
            feedback_rows = self._client.table("feedback").select("rating").execute()

            total_queries = len(assistant_rows.data or [])
            active_user_ids = {
                row.get("user_id")
                for row in (session_rows.data or [])
                if row.get("user_id")
            }
            latency_values = [int(row.get("latency_ms", 0)) for row in (assistant_rows.data or [])]
            avg_latency_ms = int(sum(latency_values) / len(latency_values)) if latency_values else 0
            ratings = [int(row.get("rating", 0)) for row in (feedback_rows.data or []) if row.get("rating")]
            csat = round(sum(ratings) / len(ratings), 2) if ratings else None

            return AdminStatsResponse(
                total_queries=total_queries,
                active_users=len(active_user_ids),
                avg_latency_ms=avg_latency_ms,
                csat=csat,
            )
        except Exception:
            return self._admin_stats_from_memory()

    def _admin_stats_from_memory(self) -> AdminStatsResponse:
        assistant_rows = [row for row in self._mem_messages if row.get("role") == "assistant"]
        active_user_ids = {
            row.get("user_id")
            for row in self._mem_sessions.values()
            if row.get("user_id")
        }
        latency_values = [int(row.get("latency_ms", 0)) for row in assistant_rows]
        avg_latency_ms = int(sum(latency_values) / len(latency_values)) if latency_values else 0
        ratings = [int(row.get("rating", 0)) for row in self._mem_feedback if row.get("rating")]
        csat = round(sum(ratings) / len(ratings), 2) if ratings else None
        return AdminStatsResponse(
            total_queries=len(assistant_rows),
            active_users=len(active_user_ids),
            avg_latency_ms=avg_latency_ms,
            csat=csat,
        )

    def get_recent_queries(self, limit: int = 10) -> List[RecentQueryItem]:
        return self._recent_queries_from_intents(limit)

    def _recent_queries_from_intents(self, limit: int = 10) -> List[RecentQueryItem]:
        if not self.enabled:
            rows = sorted(self._mem_intents, key=lambda item: item.get("created_at", ""), reverse=True)[:limit]
            return [
                RecentQueryItem(
                    query=row.get("query", ""),
                    session_id=row.get("session_id", ""),
                    created_at=row.get("created_at"),
                    status="Logged",
                )
                for row in rows
            ]

        try:
            rows = (
                self._client.table("intent_logs")
                .select("query,session_id,created_at")
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            return [
                RecentQueryItem(
                    query=row.get("query", ""),
                    session_id=row.get("session_id", ""),
                    created_at=row.get("created_at"),
                    status="Logged",
                )
                for row in (rows.data or [])
            ]
        except Exception:
            return []

    def get_top_intents(self, limit: int = 5) -> List[TopIntentItem]:
        if not self.enabled:
            counts = Counter(row.get("intent", "general") for row in self._mem_intents)
            return [TopIntentItem(name=name, value=value) for name, value in counts.most_common(limit)]

        try:
            rows = self._client.table("intent_logs").select("intent").limit(500).execute()
            counts = Counter(row.get("intent", "general") for row in (rows.data or []))
            return [TopIntentItem(name=name, value=value) for name, value in counts.most_common(limit)]
        except Exception:
            counts = Counter(row.get("intent", "general") for row in self._mem_intents)
            return [TopIntentItem(name=name, value=value) for name, value in counts.most_common(limit)]

    def get_feedback_entries(self, limit: int = 10) -> List[AdminFeedbackItem]:
        if not self.enabled:
            rows = sorted(self._mem_feedback, key=lambda item: item.get("created_at", ""), reverse=True)[:limit]
            return [
                AdminFeedbackItem(
                    message_id=row.get("message_id", ""),
                    rating=int(row.get("rating", 0)),
                    comment=row.get("comment"),
                    created_at=row.get("created_at"),
                    reviewed=bool(self._mem_feedback_reviews.get(row.get("message_id", ""), {}).get("reviewed")),
                    review_note=self._mem_feedback_reviews.get(row.get("message_id", ""), {}).get("note"),
                )
                for row in rows
            ]

        try:
            rows = (
                self._client.table("feedback")
                .select("message_id,rating,comment,created_at")
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            return [
                AdminFeedbackItem(
                    message_id=row.get("message_id", ""),
                    rating=int(row.get("rating", 0)),
                    comment=row.get("comment"),
                    created_at=row.get("created_at"),
                    reviewed=bool(self._mem_feedback_reviews.get(row.get("message_id", ""), {}).get("reviewed")),
                    review_note=self._mem_feedback_reviews.get(row.get("message_id", ""), {}).get("note"),
                )
                for row in (rows.data or [])
            ]
        except Exception:
            rows = sorted(self._mem_feedback, key=lambda item: item.get("created_at", ""), reverse=True)[:limit]
            return [
                AdminFeedbackItem(
                    message_id=row.get("message_id", ""),
                    rating=int(row.get("rating", 0)),
                    comment=row.get("comment"),
                    created_at=row.get("created_at"),
                    reviewed=bool(self._mem_feedback_reviews.get(row.get("message_id", ""), {}).get("reviewed")),
                    review_note=self._mem_feedback_reviews.get(row.get("message_id", ""), {}).get("note"),
                )
                for row in rows
            ]

    def get_flagged_reports(self, limit: int = 10) -> List[AdminReportItem]:
        recent_queries = self.get_recent_queries(limit=50)
        reports: list[AdminReportItem] = []
        for index, item in enumerate(recent_queries):
            normalized = (item.query or "").lower()
            for keyword, reason in self._report_keywords.items():
                if keyword in normalized:
                    reports.append(
                        AdminReportItem(
                            report_id=f"report-{index}-{keyword}",
                            session_id=item.session_id,
                            query=item.query,
                            created_at=item.created_at,
                            reason=reason,
                        )
                    )
                    break
            if len(reports) >= limit:
                break
        return reports

    def persist_feedback(self, payload: FeedbackRequest) -> None:
        now = datetime.now(timezone.utc).isoformat()
        if not self.enabled:
            self._mem_feedback.append(
                {
                    "message_id": payload.message_id,
                    "rating": payload.rating,
                    "comment": payload.comment,
                    "created_at": now,
                }
            )
            return

        try:
            self._client.table("feedback").insert(
                {
                    "message_id": payload.message_id,
                    "rating": payload.rating,
                    "comment": payload.comment,
                }
            ).execute()
        except Exception:
            self._mem_feedback.append(
                {
                    "message_id": payload.message_id,
                    "rating": payload.rating,
                    "comment": payload.comment,
                    "created_at": now,
                }
            )

    def get_user_state(self, user_id: str | None) -> dict:
        if not user_id:
            return {}
        if self.enabled:
            try:
                rows = self._client.table("admin_user_states").select("verified,blocked").eq("user_id", user_id).limit(1).execute()
                row = (rows.data or [{}])[0]
                return {
                    "verified": bool(row.get("verified", False)),
                    "blocked": bool(row.get("blocked", False)),
                }
            except Exception:
                pass
        return dict(self._mem_user_states.get(user_id, {}))

    def update_user_state(self, user_id: str, *, verified: bool | None = None, blocked: bool | None = None) -> dict:
        current = dict(self._mem_user_states.get(user_id, {}))
        if verified is not None:
            current["verified"] = bool(verified)
        if blocked is not None:
            current["blocked"] = bool(blocked)
        self._mem_user_states[user_id] = current
        if self.enabled:
            try:
                self._client.table("admin_user_states").upsert(
                    {
                        "user_id": user_id,
                        "verified": current.get("verified", False),
                        "blocked": current.get("blocked", False),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    },
                    on_conflict="user_id",
                ).execute()
            except Exception:
                pass
        return dict(current)

    def is_user_blocked(self, user_id: str | None) -> bool:
        if not user_id:
            return False
        return bool(self.get_user_state(user_id).get("blocked"))

    def create_announcement(self, *, title: str, message: str, audience: str) -> AdminAnnouncementItem:
        now = datetime.now(timezone.utc).isoformat()
        announcement_id = f"announce-{abs(hash((title, message, audience, now))) % 1000000}"
        item = {
            "announcement_id": announcement_id,
            "title": title,
            "message": message,
            "audience": audience,
            "created_at": now,
            "status": "queued",
        }
        self._mem_announcements.insert(0, item)
        self._mem_announcements = self._mem_announcements[:25]
        if self.enabled:
            try:
                self._client.table("admin_announcements").insert(item).execute()
            except Exception:
                pass
        return AdminAnnouncementItem(**item)

    def get_announcements(self, audience: str | None = None, limit: int = 10) -> list[AdminAnnouncementItem]:
        rows = self._mem_announcements
        if self.enabled:
            try:
                rows = (
                    self._client.table("admin_announcements")
                    .select("announcement_id,title,message,audience,created_at,status")
                    .order("created_at", desc=True)
                    .limit(limit)
                    .execute()
                ).data or []
            except Exception:
                rows = self._mem_announcements
        if audience:
            audience_key = audience.lower()
            synonyms = {
                "student": {"student", "students", "all"},
                "students": {"student", "students", "all"},
                "faculty": {"faculty", "faculties", "staff", "all"},
                "staff": {"faculty", "faculties", "staff", "all"},
                "all": {"all"},
            }
            allowed = synonyms.get(audience_key, {audience_key, "all"})
            rows = [row for row in rows if str(row.get("audience", "")).lower() in allowed]
        return [AdminAnnouncementItem(**row) for row in rows[:limit]]

    def save_feedback_review(self, *, message_id: str, reviewed: bool, note: str | None = None) -> dict:
        self._mem_feedback_reviews[message_id] = {
            "reviewed": bool(reviewed),
            "note": note or "",
        }
        if self.enabled:
            try:
                self._client.table("admin_feedback_reviews").upsert(
                    {
                        "message_id": message_id,
                        "reviewed": bool(reviewed),
                        "note": note or "",
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    },
                    on_conflict="message_id",
                ).execute()
            except Exception:
                pass
        return dict(self._mem_feedback_reviews[message_id])

    def get_feedback_review(self, message_id: str | None) -> dict:
        if not message_id:
            return {}
        if self.enabled:
            try:
                rows = self._client.table("admin_feedback_reviews").select("reviewed,note").eq("message_id", message_id).limit(1).execute()
                row = (rows.data or [{}])[0]
                return {
                    "reviewed": bool(row.get("reviewed", False)),
                    "note": row.get("note", ""),
                }
            except Exception:
                pass
        return dict(self._mem_feedback_reviews.get(message_id, {}))

    def get_feedback_reviews(self, message_ids: list[str]) -> dict[str, dict]:
        if self.enabled and message_ids:
            try:
                rows = self._client.table("admin_feedback_reviews").select("message_id,reviewed,note").in_("message_id", message_ids).execute()
                return {
                    row.get("message_id"): {
                        "reviewed": bool(row.get("reviewed", False)),
                        "note": row.get("note", ""),
                    }
                    for row in (rows.data or [])
                    if row.get("message_id")
                }
            except Exception:
                pass
        return {message_id: dict(self._mem_feedback_reviews.get(message_id, {})) for message_id in message_ids if message_id}
