from __future__ import annotations

import time
import uuid

from app.schemas import ChatRequest, ChatResponse
from app.services.groq_client import GroqClient
from app.services.persistence import PersistenceService
from app.services.retrieval import RetrievalService


class ChatService:
    def __init__(self) -> None:
        self.groq = GroqClient()
        self.retrieval = RetrievalService()
        self.persistence = PersistenceService()

    async def get_chat_response(self, req: ChatRequest) -> ChatResponse:
        start = time.perf_counter()
        sources = self.retrieval.find_sources(req.message)

        context = "\n".join([f"- {item.snippet}" for item in sources])
        prompt = (
            "Answer the student question using available university context when relevant.\n"
            f"Question: {req.message}\n"
            f"Context:\n{context if context else 'No matching local context found.'}"
        )

        llm_reply = await self.groq.generate_reply(prompt)

        if llm_reply:
            reply = llm_reply
        elif sources:
            reply = f"{sources[0].snippet} If you want, I can help you with next steps as well."
        else:
            reply = (
                "I could not find a confident answer yet. Please contact the help desk or provide more details "
                "like department, semester, and deadline type."
            )

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
