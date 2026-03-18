from __future__ import annotations

from typing import Optional

from app.config import get_settings

try:
    from supabase import Client, create_client
except ImportError:  # pragma: no cover
    Client = None
    create_client = None


class AuthService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._client: Client | None = None
        if self.settings.supabase_url and self.settings.supabase_key and create_client:
            self._client = create_client(self.settings.supabase_url, self.settings.supabase_key)

    @property
    def enabled(self) -> bool:
        return self._client is not None

    def _is_admin_email(self, email: str | None) -> bool:
        if not email:
            return False
        allowed = set(self.settings.admin_email_list)
        if not allowed:
            return False
        return email.lower() in allowed

    def admin_login(self, email: str, password: str) -> tuple[Optional[str], Optional[str]]:
        normalized_email = (email or "").strip().lower()

        # Local-dev fallback: allow ADMIN_API_KEY as password for allowlisted admin emails.
        if self._is_admin_email(normalized_email) and password == self.settings.admin_api_key:
            return f"local-admin:{normalized_email}", normalized_email

        if not self.enabled:
            return None, None

        try:
            response = self._client.auth.sign_in_with_password({"email": email, "password": password})
            user_email = (response.user.email if response.user else "") or ""
            access_token = (response.session.access_token if response.session else "") or ""
            if access_token and self._is_admin_email(user_email):
                return access_token, user_email
            return None, None
        except Exception:
            return None, None

    def token_is_admin(self, token: str) -> bool:
        if not token:
            return False

        if token.startswith("local-admin:"):
            token_email = token.split(":", 1)[1].strip().lower()
            return self._is_admin_email(token_email)

        if token == self.settings.admin_api_key:
            return True

        if not self.enabled:
            return False
        try:
            response = self._client.auth.get_user(token)
            user_email = response.user.email if response.user else None
            return self._is_admin_email(user_email)
        except Exception:
            return False
