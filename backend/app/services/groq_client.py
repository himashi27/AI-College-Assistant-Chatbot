from __future__ import annotations

from typing import Optional

import httpx

from app.config import get_settings


class GroqClient:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"

    async def generate_reply(self, prompt: str) -> Optional[str]:
        if not self.settings.groq_api_key:
            return None

        headers = {
            "Authorization": f"Bearer {self.settings.groq_api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.settings.default_model,
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
                response = await client.post(self.base_url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"].strip()
            except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError):
                return None
