from __future__ import annotations

from typing import Optional

import httpx

from app.config import get_settings


class GroqClient:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._groq_url = "https://api.groq.com/openai/v1/chat/completions"
        self._openai_url = "https://api.openai.com/v1/chat/completions"

    async def generate_reply(self, prompt: str) -> Optional[str]:
        provider = self._resolve_provider()
        if not provider:
            return None

        headers = {
            "Authorization": f"Bearer {self._api_key_for(provider)}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self._model_for(provider),
            "messages": [
                {
                    "role": "system",
                    "content": "You are a concise and helpful university assistant.",
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            "temperature": 0.2,
            "max_tokens": 300,
        }

        timeout = httpx.Timeout(self.settings.request_timeout_seconds)
        async with httpx.AsyncClient(timeout=timeout) as client:
            try:
                response = await client.post(self._base_url_for(provider), headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"].strip()
            except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError):
                return None

    def _resolve_provider(self) -> Optional[str]:
        configured = (self.settings.llm_provider or "auto").strip().lower()
        if configured == "groq" and self.settings.groq_api_key:
            return "groq"
        if configured == "openai" and self.settings.openai_api_key:
            return "openai"
        if configured not in {"", "auto", "groq", "openai"}:
            return None
        if self.settings.groq_api_key:
            return "groq"
        if self.settings.openai_api_key:
            return "openai"
        return None

    def _api_key_for(self, provider: str) -> str:
        return self.settings.groq_api_key if provider == "groq" else self.settings.openai_api_key

    def _model_for(self, provider: str) -> str:
        return self.settings.default_model if provider == "groq" else self.settings.openai_model

    def _base_url_for(self, provider: str) -> str:
        return self._groq_url if provider == "groq" else self._openai_url
