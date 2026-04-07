from __future__ import annotations

import time
import uuid
from typing import List

from app.schemas import ChatRequest, ChatResponse
from app.services.faculty_chat_service import FacultyChatService
from app.services.groq_client import GroqClient
from app.services.persistence import PersistenceService
from app.services.retrieval import RetrievalService
from app.services.student_chat_service import StudentChatService


class ChatService:
    def __init__(self) -> None:
        self.groq = GroqClient()
        self.retrieval = RetrievalService()
        self.persistence = PersistenceService()
        self.faculty_chat = FacultyChatService()
        self.student_chat = StudentChatService()

    async def get_chat_response(self, req: ChatRequest) -> ChatResponse:
        start = time.perf_counter()
        persona = (req.role or "student").strip().lower()
        sources = self.retrieval.find_sources(req.message, persona=persona)
        announcement_reply = self._announcement_reply(req.message, persona)
        student_reply = self.student_chat.generate_reply(user_id=req.user_id, message=req.message) if persona == "student" else None
        faculty_reply = self.faculty_chat.generate_reply(user_id=req.user_id, message=req.message) if persona == "faculty" else None

        context = "\n".join([f"- {item.snippet}" for item in sources])
        history_text = self._format_history(req.history)
        prompt = (
            f"You are assisting a {persona} in a university portal chatbot.\n"
            "Answer using available university context when relevant, and adapt the explanation to that persona.\n"
            "If the user asks to shorten, simplify, summarize, or rephrase, apply that transformation to the latest relevant assistant answer from the conversation history.\n"
            f"Recent conversation:\n{history_text}\n"
            f"Question: {req.message}\n"
            f"Context:\n{context if context else 'No matching local context found.'}"
        )

        llm_reply = None if announcement_reply or student_reply or faculty_reply else await self.groq.generate_reply(prompt)

        if announcement_reply:
            reply = announcement_reply
        elif student_reply:
            reply = student_reply
        elif faculty_reply:
            reply = faculty_reply
        elif llm_reply:
            reply = llm_reply
        elif sources:
            reply = f"{sources[0].snippet} If you want, I can help you with next steps as well."
        else:
            reply = self._fallback_reply(persona)

        latency_ms = int((time.perf_counter() - start) * 1000)

        message_id = str(uuid.uuid4())
        self.persistence.persist_chat(
            req=req,
            assistant_message_id=message_id,
            assistant_reply=reply,
            sources=sources,
            latency_ms=latency_ms,
        )

        return ChatResponse(
            reply=reply,
            sources=sources,
            latency_ms=latency_ms,
            session_id=req.session_id,
            message_id=message_id,
        )

    def _announcement_reply(self, message: str, persona: str) -> str | None:
        normalized = (message or "").strip().lower()
        announcement_terms = ("announcement", "announcements", "notification", "notifications", "notice", "notices", "latest update", "new update")
        if not any(term in normalized for term in announcement_terms):
            return None

        audience = "faculty" if persona == "faculty" else "student"
        announcements = self.persistence.get_announcements(audience=audience, limit=3)
        if not announcements:
            return "There are no new announcements right now."

        lines = ["Latest announcements:"]
        for item in announcements:
            lines.append(f"- {item.title}: {item.message}")
        return "\n".join(lines)

    def _fallback_reply(self, persona: str) -> str:
        if persona == "faculty":
            return (
                "I could not match that staff request confidently yet. Try asking about classes, pending reviews, "
                "attendance alerts, leave requests, or assigned subjects."
            )
        return (
            "I could not find a confident answer yet. Please contact the help desk or provide more details "
            "like subject, semester, or request type."
        )

    def _format_history(self, history: List) -> str:
        if not history:
            return "No previous conversation."

        lines: list[str] = []
        for item in history[-6:]:
            role = getattr(item, "role", "") or ""
            text = getattr(item, "text", "") or ""
            if not role or not text:
                continue
            lines.append(f"{role.title()}: {text}")
        return "\n".join(lines) if lines else "No previous conversation."
