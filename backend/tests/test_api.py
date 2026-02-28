from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)
ADMIN_HEADERS = {"x-admin-key": "dev-admin-key"}


def test_health_returns_ok() -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["app"]


def test_chat_returns_fallback_when_llm_unavailable(monkeypatch) -> None:
    from app.api.routes import chat_service

    async def fake_generate_reply(_prompt: str):
        return None

    monkeypatch.setattr(chat_service.groq, "generate_reply", fake_generate_reply)

    response = client.post(
        "/api/chat",
        json={
            "session_id": "session-1",
            "user_id": "u-1",
            "message": "Tell me about admission process",
            "role": "student",
            "language": "en",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["session_id"] == "session-1"
    assert isinstance(payload["message_id"], str)
    assert payload["latency_ms"] >= 0
    assert len(payload["sources"]) >= 1
    assert "Admissions usually open each semester" in payload["reply"]


def test_chat_validation_error_on_empty_message() -> None:
    response = client.post(
        "/api/chat",
        json={
            "session_id": "session-2",
            "message": "",
            "role": "student",
            "language": "en",
        },
    )

    assert response.status_code == 422


def test_admin_stats_endpoint_shape(monkeypatch) -> None:
    from app.api.routes import persistence_service
    from app.schemas import AdminStatsResponse

    monkeypatch.setattr(
        persistence_service,
        "get_admin_stats",
        lambda: AdminStatsResponse(total_queries=4, active_users=2, avg_latency_ms=1200, csat=4.3),
    )
    response = client.get("/api/admin/stats", headers=ADMIN_HEADERS)

    assert response.status_code == 200
    assert response.json() == {
        "total_queries": 4,
        "active_users": 2,
        "avg_latency_ms": 1200,
        "csat": 4.3,
    }


def test_admin_recent_queries_endpoint_shape(monkeypatch) -> None:
    from app.api.routes import persistence_service
    from app.schemas import RecentQueryItem

    monkeypatch.setattr(
        persistence_service,
        "get_recent_queries",
        lambda: [
            RecentQueryItem(query="Admission date?", session_id="session-1", created_at="2026-02-17T08:00:00Z")
        ],
    )
    response = client.get("/api/admin/recent-queries", headers=ADMIN_HEADERS)

    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    assert payload[0]["query"] == "Admission date?"
    assert payload[0]["session_id"] == "session-1"


def test_admin_top_intents_endpoint_shape(monkeypatch) -> None:
    from app.api.routes import persistence_service
    from app.schemas import TopIntentItem

    monkeypatch.setattr(
        persistence_service,
        "get_top_intents",
        lambda: [TopIntentItem(name="admissions", value=8), TopIntentItem(name="fees", value=4)],
    )
    response = client.get("/api/admin/top-intents", headers=ADMIN_HEADERS)

    assert response.status_code == 200
    assert response.json()[0] == {"name": "admissions", "value": 8}


def test_admin_endpoint_requires_key() -> None:
    response = client.get("/api/admin/stats")
    assert response.status_code == 401


def test_feedback_endpoint_ok(monkeypatch) -> None:
    from app.api.routes import persistence_service

    monkeypatch.setattr(persistence_service, "persist_feedback", lambda _payload: None)
    response = client.post(
        "/api/feedback",
        json={"message_id": "msg-1", "rating": 5, "comment": "great"},
    )

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_chat_rate_limit(monkeypatch) -> None:
    from app import main
    from app.api.routes import chat_service

    async def fake_generate_reply(_prompt: str):
        return "ok"

    monkeypatch.setattr(chat_service.groq, "generate_reply", fake_generate_reply)
    monkeypatch.setattr(main.settings, "chat_rate_limit_per_minute", 1)
    main.chat_buckets.clear()

    payload = {
        "session_id": "rate-limit-s1",
        "user_id": "u-1",
        "message": "Hello admission info",
        "role": "student",
        "language": "en",
    }
    first = client.post("/api/chat", json=payload)
    second = client.post("/api/chat", json=payload)

    assert first.status_code == 200
    assert second.status_code == 429
