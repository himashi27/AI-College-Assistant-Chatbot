from __future__ import annotations

from datetime import datetime, timedelta, timezone
from random import randint
from typing import Dict

from fastapi import HTTPException, status

from app.config import get_settings
from app.services.identity_service import IdentityService
from app.services.persistence import PersistenceService


class OTPService:
    def __init__(self) -> None:
        self._settings = get_settings()
        self._identity = IdentityService()
        self._persistence = PersistenceService()
        self._otp_store: Dict[str, dict] = {}

    def _key(self, *, email: str, persona: str) -> str:
        return f"{persona.strip().lower()}::{email.strip().lower()}"

    def request_otp(self, *, email: str, persona: str) -> dict:
        resolved = self._identity.resolve_login(email=email, persona=persona)
        if not resolved:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=self._identity.login_error_message(email=email, persona=persona),
            )
        if self._persistence.is_user_blocked(resolved.get("user_id")):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This portal account has been blocked by admin.",
            )

        otp_code = f"{randint(0, 999999):06d}"
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=self._settings.otp_expiry_seconds)
        self._otp_store[self._key(email=email, persona=persona)] = {
            "otp": otp_code,
            "expires_at": expires_at,
            "resolved": resolved,
        }

        detail = "OTP generated successfully."
        if self._settings.otp_demo_mode:
            detail = "OTP generated for the prototype. Use the code shown below to continue."

        return {
            "status": "otp_sent",
            "expires_in": self._settings.otp_expiry_seconds,
            "detail": detail,
            "otp_code": otp_code if self._settings.otp_demo_mode else None,
        }

    def verify_otp(self, *, email: str, persona: str, otp: str) -> dict:
        record = self._otp_store.get(self._key(email=email, persona=persona))
        if not record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No OTP request was found for this Outlook ID. Please request a new OTP.",
            )

        if datetime.now(timezone.utc) > record["expires_at"]:
            self._otp_store.pop(self._key(email=email, persona=persona), None)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This OTP has expired. Please request a new OTP.",
            )

        if str(otp).strip() != str(record["otp"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid OTP. Please check the code and try again.",
            )

        resolved = record["resolved"]
        if self._persistence.is_user_blocked(resolved.get("user_id")):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This portal account has been blocked by admin.",
            )

        self._otp_store.pop(self._key(email=email, persona=persona), None)
        return resolved
