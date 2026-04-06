from __future__ import annotations

from typing import Any, Dict, Optional

from app.services.portal_config import get_portal_config


class IdentityService:
    def __init__(self) -> None:
        cfg = get_portal_config()
        self._students: Dict[str, Any] = cfg.get("students", {})
        self._faculty: Dict[str, Any] = cfg.get("faculty", {})
        self._student_email_map: Dict[str, str] = {
            str(email).lower().strip(): str(user_id).strip()
            for email, user_id in cfg.get("student_email_map", {}).items()
        }
        self._faculty_email_map: Dict[str, str] = {
            str(email).lower().strip(): str(user_id).strip()
            for email, user_id in cfg.get("faculty_email_map", {}).items()
        }

    def resolve_login(self, *, email: str, persona: str) -> Optional[Dict[str, str]]:
        normalized_email = (email or "").strip().lower()
        normalized_persona = (persona or "").strip().lower()

        if normalized_persona == "student":
            student_id = self._student_email_map.get(normalized_email)
            if not student_id:
                return None
            student = self._students.get(student_id, {})
            return {
                "persona": "student",
                "user_id": student_id,
                "email": normalized_email,
                "display_name": student.get("name", student_id),
            }

        if normalized_persona in {"staff", "faculty", "teacher"}:
            faculty_id = self._faculty_email_map.get(normalized_email)
            if not faculty_id:
                return None
            faculty = self._faculty.get(faculty_id, {})
            return {
                "persona": "faculty",
                "user_id": faculty_id,
                "email": normalized_email,
                "display_name": faculty.get("name", faculty_id),
            }

        return None

    def login_error_message(self, *, email: str, persona: str) -> str:
        normalized_email = (email or "").strip().lower()
        normalized_persona = (persona or "").strip().lower()

        if normalized_persona == "student":
            if normalized_email in self._faculty_email_map:
                return "This Outlook ID is mapped for staff access. Please use Staff Login."
            return "This Outlook ID is not mapped for student access yet."

        if normalized_persona in {"staff", "faculty", "teacher"}:
            if normalized_email in self._student_email_map:
                return "This Outlook ID is mapped for student access. Please use Student Login."
            return "This Outlook ID is not mapped for staff access yet."

        return "No matching portal account found for this login type."
