from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)
ADMIN_HEADERS = {"Authorization": "Bearer admin-token"}


def test_health_returns_ok() -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["app"]
    assert payload["persistence_mode"] in ("supabase", "memory")


def test_portal_login_student_success() -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": "rahul@krmangalam.edu.in", "persona": "student"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["persona"] == "student"
    assert payload["user_id"] == "AI23001"


def test_portal_login_staff_success() -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": "dr.sharmaji@krmangalam.edu.in", "persona": "staff"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["persona"] == "faculty"
    assert payload["user_id"] == "FAC1001"


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


def test_chat_prompt_includes_persona(monkeypatch) -> None:
    from app.api.routes import chat_service

    captured_prompt = {"value": ""}

    async def fake_generate_reply(prompt: str):
        captured_prompt["value"] = prompt
        return "ok"

    monkeypatch.setattr(chat_service.groq, "generate_reply", fake_generate_reply)

    response = client.post(
        "/api/chat",
        json={
            "session_id": "session-faculty",
            "user_id": "FAC001",
            "message": "show pending reviews",
            "role": "faculty",
            "language": "en",
        },
    )

    assert response.status_code == 200
    assert "assisting a faculty" in captured_prompt["value"].lower()


def test_chat_prompt_includes_recent_history(monkeypatch) -> None:
    from app.api.routes import chat_service

    captured_prompt = {"value": ""}

    async def fake_generate_reply(prompt: str):
        captured_prompt["value"] = prompt
        return "ok"

    monkeypatch.setattr(chat_service.groq, "generate_reply", fake_generate_reply)

    response = client.post(
        "/api/chat",
        json={
            "session_id": "session-history",
            "user_id": "AI23001",
            "message": "make it short",
            "role": "student",
            "language": "en",
            "history": [
                {"role": "user", "text": "what is normalization"},
                {"role": "bot", "text": "Normalization organizes database tables to reduce redundancy and improve consistency."},
            ],
        },
    )

    assert response.status_code == 200
    assert "make it short" in captured_prompt["value"].lower()
    assert "normalization organizes database tables" in captured_prompt["value"].lower()


def test_chat_faculty_class_query_uses_deterministic_data(monkeypatch) -> None:
    from app.api.routes import chat_service

    async def fake_generate_reply(_prompt: str):
        return None

    monkeypatch.setattr(chat_service.groq, "generate_reply", fake_generate_reply)

    response = client.post(
        "/api/chat",
        json={
            "session_id": "session-faculty-classes",
            "user_id": "FAC1001",
            "message": "show my classes for today",
            "role": "faculty",
            "language": "en",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert "your classes for today" in payload["reply"].lower()
    assert "DBMS" in payload["reply"]


def test_chat_faculty_leave_query_uses_deterministic_data(monkeypatch) -> None:
    from app.api.routes import chat_service

    async def fake_generate_reply(_prompt: str):
        return None

    monkeypatch.setattr(chat_service.groq, "generate_reply", fake_generate_reply)

    response = client.post(
        "/api/chat",
        json={
            "session_id": "session-faculty-leave",
            "user_id": "FAC1001",
            "message": "show pending leave requests",
            "role": "faculty",
            "language": "en",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert "pending leave requests" in payload["reply"].lower()
    assert "Rohit Kumar" in payload["reply"]


def test_chat_faculty_fallback_is_persona_specific(monkeypatch) -> None:
    from app.api.routes import chat_service

    async def fake_generate_reply(_prompt: str):
        return None

    monkeypatch.setattr(chat_service.groq, "generate_reply", fake_generate_reply)

    response = client.post(
        "/api/chat",
        json={
            "session_id": "session-faculty-fallback",
            "user_id": "FAC1001",
            "message": "help me with something random",
            "role": "faculty",
            "language": "en",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert "staff request" in payload["reply"].lower()


def test_chat_faculty_first_class_follow_up(monkeypatch) -> None:
    from app.api.routes import chat_service

    async def fake_generate_reply(_prompt: str):
        return None

    monkeypatch.setattr(chat_service.groq, "generate_reply", fake_generate_reply)

    response = client.post(
        "/api/chat",
        json={
            "session_id": "session-faculty-first-class",
            "user_id": "FAC1001",
            "message": "which class is first today",
            "role": "faculty",
            "language": "en",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert "first class" in payload["reply"].lower()
    assert "DBMS" in payload["reply"]


def test_chat_faculty_review_count_follow_up(monkeypatch) -> None:
    from app.api.routes import chat_service

    async def fake_generate_reply(_prompt: str):
        return None

    monkeypatch.setattr(chat_service.groq, "generate_reply", fake_generate_reply)

    response = client.post(
        "/api/chat",
        json={
            "session_id": "session-faculty-review-count",
            "user_id": "FAC1001",
            "message": "how many reviews are pending",
            "role": "faculty",
            "language": "en",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert "7 pending assignment reviews" in payload["reply"]


def test_chat_faculty_low_attendance_names_follow_up(monkeypatch) -> None:
    from app.api.routes import chat_service

    async def fake_generate_reply(_prompt: str):
        return None

    monkeypatch.setattr(chat_service.groq, "generate_reply", fake_generate_reply)

    response = client.post(
        "/api/chat",
        json={
            "session_id": "session-faculty-low-attendance",
            "user_id": "FAC1001",
            "message": "who has low attendance",
            "role": "faculty",
            "language": "en",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert "Aditi Singh" in payload["reply"]
    assert "Ankit Yadav" in payload["reply"]


def test_chat_student_lowest_attendance_follow_up(monkeypatch) -> None:
    from app.api.routes import chat_service

    async def fake_generate_reply(_prompt: str):
        return None

    monkeypatch.setattr(chat_service.groq, "generate_reply", fake_generate_reply)

    response = client.post(
        "/api/chat",
        json={
            "session_id": "session-student-lowest-attendance",
            "user_id": "AI23001",
            "message": "which subject has lowest attendance",
            "role": "student",
            "language": "en",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert "lowest attendance" in payload["reply"].lower()
    assert "DBMS" in payload["reply"]
    assert "43/50" in payload["reply"]


def test_chat_student_highest_attendance_follow_up(monkeypatch) -> None:
    from app.api.routes import chat_service

    async def fake_generate_reply(_prompt: str):
        return None

    monkeypatch.setattr(chat_service.groq, "generate_reply", fake_generate_reply)

    response = client.post(
        "/api/chat",
        json={
            "session_id": "session-student-highest-attendance",
            "user_id": "AI23001",
            "message": "which subject has highest attendance",
            "role": "student",
            "language": "en",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert "highest attendance" in payload["reply"].lower()
    assert "GEN_AI" in payload["reply"]
    assert "45/50" in payload["reply"]


def test_chat_student_assignment_count_follow_up(monkeypatch) -> None:
    from app.api.routes import chat_service

    async def fake_generate_reply(_prompt: str):
        return None

    monkeypatch.setattr(chat_service.groq, "generate_reply", fake_generate_reply)

    response = client.post(
        "/api/chat",
        json={
            "session_id": "session-student-assignment-count",
            "user_id": "AI23001",
            "message": "how many assignments are pending",
            "role": "student",
            "language": "en",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert "4 pending assignments" in payload["reply"]


def test_chat_student_next_assignment_follow_up(monkeypatch) -> None:
    from app.api.routes import chat_service

    async def fake_generate_reply(_prompt: str):
        return None

    monkeypatch.setattr(chat_service.groq, "generate_reply", fake_generate_reply)

    response = client.post(
        "/api/chat",
        json={
            "session_id": "session-student-next-assignment",
            "user_id": "AI23001",
            "message": "which assignment is due first",
            "role": "student",
            "language": "en",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert "next assignment due" in payload["reply"].lower()
    assert "Normalization Case Study" in payload["reply"]
    assert "2026-03-15" in payload["reply"]


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


def test_query_route_attendance_subject_match() -> None:
    response = client.post(
        "/api/query/route",
        json={"message": "attendance of dbms"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["action"] == "navigate"
    assert payload["intent"] == "attendance"
    assert payload["navigation"]["url"] == "/attendance/dbms"


def test_query_route_persists_non_fallback_actions(monkeypatch) -> None:
    from app.api.routes import persistence_service

    captured: list[dict] = []

    def fake_persist_route_interaction(**kwargs):
        captured.append(kwargs)

    monkeypatch.setattr(persistence_service, "persist_route_interaction", fake_persist_route_interaction)

    response = client.post(
        "/api/query/route",
        json={"message": "attendance of dbms", "session_id": "s-1", "user_id": "AI23001"},
    )

    assert response.status_code == 200
    assert len(captured) == 1
    assert captured[0]["intent"] == "attendance"
    assert captured[0]["message"] == "attendance of dbms"


def test_query_route_does_not_persist_fallback_llm(monkeypatch) -> None:
    from app.api.routes import persistence_service

    captured: list[dict] = []

    def fake_persist_route_interaction(**kwargs):
        captured.append(kwargs)

    monkeypatch.setattr(persistence_service, "persist_route_interaction", fake_persist_route_interaction)

    response = client.post(
        "/api/query/route",
        json={"message": "explain recursion in c", "session_id": "s-2", "user_id": "AI23001"},
    )

    assert response.status_code == 200
    assert response.json()["action"] == "fallback_llm"
    assert captured == []


def test_query_route_clarifies_when_subject_missing() -> None:
    response = client.post(
        "/api/query/route",
        json={"message": "show attendance"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["action"] == "clarify"
    assert payload["intent"] == "attendance"
    assert "specify a subject" in payload["clarification"].lower()


def test_query_route_attendance_all_subjects() -> None:
    response = client.post(
        "/api/query/route",
        json={"message": "attendance of all subjects"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["action"] == "navigate"
    assert payload["intent"] == "attendance"
    assert payload["navigation"]["url"] == "/attendance"


def test_query_route_syllabus_all_subjects() -> None:
    response = client.post(
        "/api/query/route",
        json={"message": "syllabus of all subjects"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["action"] == "navigate"
    assert payload["intent"] == "syllabus"
    assert payload["navigation"]["url"] == "/syllabus"


def test_query_route_syllabus_natural_topics_phrase() -> None:
    response = client.post(
        "/api/query/route",
        json={"message": "what are the topics of dbms"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["action"] == "navigate"
    assert payload["intent"] == "syllabus"
    assert payload["navigation"]["url"] == "/syllabus/dbms"


def test_query_route_performance_semester() -> None:
    response = client.post(
        "/api/query/route",
        json={"message": "show sem3 result"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["action"] == "navigate"
    assert payload["intent"] == "performance"
    assert payload["navigation"]["url"] == "/performance/sem3"


def test_query_route_faculty_classes_navigation() -> None:
    response = client.post(
        "/api/query/route",
        json={"message": "show my classes for today", "role": "faculty", "user_id": "FAC1001"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["action"] == "navigate"
    assert payload["intent"] == "class_schedule"
    assert payload["navigation"]["url"] == "/staff/classes"


def test_query_route_faculty_phrase_without_role_still_routes_to_staff() -> None:
    response = client.post(
        "/api/query/route",
        json={"message": "show my classes for today"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["action"] == "navigate"
    assert payload["intent"] == "class_schedule"
    assert payload["navigation"]["url"] == "/staff/classes"


def test_query_route_due_assignment_returns_structured_action() -> None:
    response = client.post(
        "/api/query/route",
        json={"message": "due assignment for dbms"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["action"] == "assignment_summary"
    assert payload["intent"] == "assignment_due"
    assert payload["data"]["subject"] == "DBMS"
    assert payload["navigation"]["url"] == "/assignments/dbms"


def test_query_route_assignments_natural_phrase() -> None:
    response = client.post(
        "/api/query/route",
        json={"message": "show my homework for dbms"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["action"] == "assignment_summary"
    assert payload["intent"] == "assignment_due"
    assert payload["navigation"]["url"] == "/assignments/dbms"


def test_query_route_fees_natural_dues_phrase() -> None:
    response = client.post(
        "/api/query/route",
        json={"message": "what are my pending dues"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["action"] == "navigate"
    assert payload["intent"] == "fees"
    assert payload["navigation"]["url"] == "/fees/overview"


def test_query_route_performance_report_card_phrase() -> None:
    response = client.post(
        "/api/query/route",
        json={"message": "show my report card"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["action"] == "navigate"
    assert payload["intent"] == "performance"
    assert payload["navigation"]["url"] == "/performance"


def test_parse_due_assignments_endpoint() -> None:
    response = client.post(
        "/api/assignments/parse-due",
        json={"message": "show due assignment for dbms"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["action"] == "assignment_summary"
    assert payload["subject"] == "DBMS"
    assert isinstance(payload["assignments"], list)
    assert len(payload["assignments"]) >= 1
    assert payload["assignments"][0]["subject"] == "DBMS"


def test_parse_due_assignments_filters_specific_subject() -> None:
    response = client.post(
        "/api/assignments/parse-due",
        json={"message": "due assignment for neural networks"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["subject"] == "NEURAL_NETWORKS"
    assert len(payload["assignments"]) >= 1
    assert all(item["subject"] == "NEURAL_NETWORKS" for item in payload["assignments"])


def test_parse_due_assignments_for_all_subjects() -> None:
    response = client.post(
        "/api/assignments/parse-due",
        json={"message": "show due assignments of all subjects"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["subject"] is None
    subjects = {item["subject"] for item in payload["assignments"]}
    assert len(subjects) >= 2


def test_portal_section_endpoint_for_syllabus() -> None:
    response = client.get("/api/portal/section/syllabus?subject=dbms")
    assert response.status_code == 200
    payload = response.json()
    assert payload["section"] == "syllabus"
    assert payload["subject"] == "DBMS"
    assert isinstance(payload["data"], dict)
    assert isinstance(payload["data"].get("units"), list)


def test_portal_quick_actions_endpoint() -> None:
    response = client.get("/api/portal/quick-actions")
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload.get("actions"), list)
    assert len(payload["actions"]) >= 1
    first = payload["actions"][0]
    assert "label" in first
    assert "query" in first
    assert "priority" in first


def test_portal_personas_endpoint() -> None:
    response = client.get("/api/portal/personas")
    assert response.status_code == 200
    payload = response.json()
    keys = {item["key"] for item in payload["personas"]}
    assert {"student", "faculty"}.issubset(keys)
    assert "parent" not in keys


def test_portal_quick_actions_for_faculty() -> None:
    response = client.get("/api/portal/quick-actions?role=faculty")
    assert response.status_code == 200
    payload = response.json()
    labels = [item["label"] for item in payload["actions"]]
    assert "Today's Classes" in labels


def test_portal_section_endpoint_for_assignments_without_subject() -> None:
    response = client.get("/api/portal/section/assignments?student_id=AI23001")
    assert response.status_code == 200
    payload = response.json()
    assert payload["section"] == "assignments"
    assert isinstance(payload["data"], dict)
    assert isinstance(payload["data"].get("assignments"), list)


def test_portal_section_endpoint_for_faculty_classes() -> None:
    response = client.get("/api/portal/section/class_schedule?student_id=FAC1001")
    assert response.status_code == 200
    payload = response.json()
    assert payload["section"] == "class_schedule"
    assert isinstance(payload["data"], dict)
    assert isinstance(payload["data"].get("classes"), list)


def test_portal_section_endpoint_for_performance_sem3() -> None:
    response = client.get("/api/portal/section/performance?semester=sem3&student_id=AI23001")
    assert response.status_code == 200
    payload = response.json()
    assert payload["section"] == "performance"
    assert payload["subject"] == "sem3"
    assert isinstance(payload["data"], dict)
    assert payload["data"]["marks_page_url"].endswith("/performance/AI23001/sem3")


def test_portal_section_requires_student_for_protected_sections() -> None:
    response = client.get("/api/portal/section/attendance?subject=dbms")
    assert response.status_code == 401


def test_portal_section_forbidden_when_subject_not_allowed_for_student() -> None:
    response = client.get("/api/portal/section/attendance?subject=os&student_id=AI23001")
    assert response.status_code == 403


def test_admin_stats_endpoint_shape(monkeypatch) -> None:
    from app.api.routes import auth_service, persistence_service
    from app.schemas import AdminStatsResponse

    monkeypatch.setattr(auth_service, "token_is_admin", lambda token: token == "admin-token")
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
    from app.api.routes import auth_service, persistence_service
    from app.schemas import RecentQueryItem

    monkeypatch.setattr(auth_service, "token_is_admin", lambda token: token == "admin-token")
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
    from app.api.routes import auth_service, persistence_service
    from app.schemas import TopIntentItem

    monkeypatch.setattr(auth_service, "token_is_admin", lambda token: token == "admin-token")
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


def test_admin_endpoint_accepts_bearer_token(monkeypatch) -> None:
    from app.api.routes import auth_service

    monkeypatch.setattr(auth_service, "token_is_admin", lambda token: token == "admin-token")
    response = client.get("/api/admin/stats", headers={"Authorization": "Bearer admin-token"})
    assert response.status_code == 200


def test_admin_login_success(monkeypatch) -> None:
    from app.api.routes import auth_service

    monkeypatch.setattr(auth_service, "admin_login", lambda email, password: ("tok-1", email))
    response = client.post("/api/admin/login", json={"email": "admin@example.com", "password": "password123"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["access_token"] == "tok-1"
    assert payload["email"] == "admin@example.com"


def test_admin_login_failure(monkeypatch) -> None:
    from app.api.routes import auth_service

    monkeypatch.setattr(auth_service, "admin_login", lambda email, password: (None, None))
    response = client.post("/api/admin/login", json={"email": "admin@example.com", "password": "password123"})

    assert response.status_code == 401


def test_admin_login_with_local_admin_key() -> None:
    response = client.post(
        "/api/admin/login",
        json={"email": "hihimanshi2957@gmail.com", "password": "dev-admin-key"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["access_token"].startswith("local-admin:")
    assert payload["email"] == "hihimanshi2957@gmail.com"


def test_admin_endpoint_accepts_local_admin_token() -> None:
    response = client.get(
        "/api/admin/stats",
        headers={"Authorization": "Bearer local-admin:hihimanshi2957@gmail.com"},
    )
    assert response.status_code == 200


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
