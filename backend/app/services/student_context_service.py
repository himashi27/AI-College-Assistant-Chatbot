from __future__ import annotations

from typing import Optional

from app.config import get_settings
from app.services.portal_config import get_portal_config

try:
    from supabase import Client, create_client
except ImportError:  # pragma: no cover
    Client = None
    create_client = None


class StudentContextService:
    def __init__(self) -> None:
        self._settings = get_settings()
        cfg = get_portal_config()
        self._students = cfg.get("students", {})
        self._faculty = cfg.get("faculty", {})
        self._email_map = cfg.get("student_email_map", {})
        self._client: Client | None = None
        if self._settings.supabase_url and self._settings.supabase_key and create_client:
            self._client = create_client(self._settings.supabase_url, self._settings.supabase_key)

    def resolve_student_id(
        self,
        authorization: Optional[str],
        header_student_id: Optional[str],
        explicit_student_id: Optional[str],
    ) -> Optional[str]:
        # Priority 1: explicit query/body value
        if explicit_student_id and self._is_known_user(explicit_student_id):
            return explicit_student_id

        # Priority 2: custom trusted header
        if header_student_id and self._is_known_user(header_student_id):
            return header_student_id

        # Priority 3: auth token mapped to student
        student_from_token = self._student_id_from_token(authorization)
        if student_from_token:
            return student_from_token

        return None

    def _student_id_from_token(self, authorization: Optional[str]) -> Optional[str]:
        if not authorization or not authorization.lower().startswith("bearer "):
            return None
        token = authorization.split(" ", 1)[1].strip()
        if not token or not self._client:
            return None
        try:
            response = self._client.auth.get_user(token)
            email = (response.user.email if response.user else None) or ""
            mapped_id = self._email_map.get(email.lower().strip())
            if mapped_id and self._is_known_user(mapped_id):
                return mapped_id
        except Exception:
            return None
        return None

    def _is_known_user(self, user_id: str) -> bool:
        return user_id in self._students or user_id in self._faculty
