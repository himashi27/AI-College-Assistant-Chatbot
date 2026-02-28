from __future__ import annotations

import asyncio
import sys
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.schemas import ChatRequest
from app.services.persistence import PersistenceService


async def main() -> int:
    service = PersistenceService()

    if not service.enabled:
        print("Supabase persistence is not enabled. Set SUPABASE_URL and SUPABASE_KEY in backend/.env")
        return 1

    session_id = f"verify-{uuid.uuid4()}"
    message_id = str(uuid.uuid4())
    req = ChatRequest(
        session_id=session_id,
        user_id="verify-user",
        message="admission process verification",
        role="student",
        language="en",
    )

    service.persist_chat(
        req=req,
        assistant_message_id=message_id,
        assistant_reply="Verification assistant reply",
        sources=[],
        latency_ms=123,
    )

    try:
        session_rows = service._client.table("chat_sessions").select("session_id").eq("session_id", session_id).execute()
        message_rows = service._client.table("chat_messages").select("message_id,role").eq("session_id", session_id).execute()
        intent_rows = service._client.table("intent_logs").select("id,intent").eq("session_id", session_id).execute()

        print(f"session_found={len(session_rows.data or [])}")
        print(f"messages_found={len(message_rows.data or [])}")
        print(f"intents_found={len(intent_rows.data or [])}")

        if len(session_rows.data or []) >= 1 and len(message_rows.data or []) >= 2 and len(intent_rows.data or []) >= 1:
            print("PERSISTENCE_OK")
            return 0

        print("PERSISTENCE_INCOMPLETE")
        return 2
    except Exception as exc:
        print(f"PERSISTENCE_ERROR: {exc}")
        return 3


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
