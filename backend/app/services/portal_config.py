from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict

from app.config import get_settings


def _resolve_path(raw_path: str) -> Path:
    path = Path(raw_path)
    if path.is_absolute():
        return path
    backend_root = Path(__file__).resolve().parents[2]
    return backend_root / path


@lru_cache(maxsize=1)
def get_portal_config() -> Dict[str, Any]:
    settings = get_settings()
    cfg_path = _resolve_path(settings.portal_config_path)
    if not cfg_path.exists():
        return {}

    try:
        with cfg_path.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
        if isinstance(payload, dict):
            return payload
    except Exception:
        return {}
    return {}
