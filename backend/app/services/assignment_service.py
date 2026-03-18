from __future__ import annotations

import re
from typing import List, Optional

from app.config import get_settings
from app.schemas import AssignmentDueItem, AssignmentParseRequest, AssignmentParseResponse
from app.services.portal_config import get_portal_config

try:
    from supabase import Client, create_client
except ImportError:  # pragma: no cover
    Client = None
    create_client = None


class AssignmentService:
    def __init__(self) -> None:
        settings = get_settings()
        self._cfg = get_portal_config()
        self._client: Client | None = None
        if settings.supabase_url and settings.supabase_key and create_client:
            self._client = create_client(settings.supabase_url, settings.supabase_key)

        self._subject_alias_map = self._build_subject_alias_map()
        self._mem_assignments = self._build_assignments_from_config()

    def parse_due_assignments(self, payload: AssignmentParseRequest) -> AssignmentParseResponse:
        message_normalized = self._normalize(payload.message)
        subject_hint = None if self._is_all_subjects_request(message_normalized) else self._extract_subject_hint(payload.message, payload.current_page)

        # Prefer config-backed assignments first for deterministic behavior.
        assignments = self._fetch_from_memory(subject_hint)
        if not assignments:
            assignments = self._fetch_from_supabase(subject_hint)

        return AssignmentParseResponse(
            subject=subject_hint,
            assignments=assignments[:10],
        )

    def _fetch_from_supabase(self, subject_hint: Optional[str]) -> List[AssignmentDueItem]:
        if not self._client:
            return []
        try:
            query = (
                self._client.table("assignments")
                .select("title,due_date,status,priority,subjects(name)")
                .in_("status", ["open", "overdue"])
                .order("due_date", desc=False)
                .limit(20)
            )
            if subject_hint:
                query = query.ilike("subjects.name", subject_hint)

            rows = query.execute().data or []
            parsed: List[AssignmentDueItem] = []
            for row in rows:
                subject_obj = row.get("subjects") or {}
                parsed.append(
                    AssignmentDueItem(
                        subject=subject_obj.get("name", "Unknown"),
                        title=row.get("title", ""),
                        due_date=str(row.get("due_date", "")),
                        status=row.get("status", "open"),
                        priority=row.get("priority"),
                    )
                )
            return parsed
        except Exception:
            return []

    def _fetch_from_memory(self, subject_hint: Optional[str]) -> List[AssignmentDueItem]:
        if not subject_hint:
            return self._mem_assignments
        return [item for item in self._mem_assignments if item.subject.lower() == subject_hint.lower()]

    def _extract_subject_hint(self, message: str, current_page: Optional[str]) -> Optional[str]:
        text = self._normalize(f"{message} {current_page or ''}")
        for token, canonical in self._subject_alias_map.items():
            if re.search(r"\b" + re.escape(token) + r"\b", text):
                return canonical
        return None

    def _build_subject_alias_map(self) -> dict[str, str]:
        result: dict[str, str] = {}
        canonical = self._cfg.get("canonical_subjects", {})
        for name, details in canonical.items():
            aliases = details.get("aliases") or []
            for alias in aliases:
                if isinstance(alias, str):
                    result[self._normalize(alias)] = name
            result[self._normalize(name)] = name
        if result:
            return result
        return {"dbms": "DBMS", "gen ai": "GEN_AI", "neural networks": "NEURAL_NETWORKS", "nn": "NEURAL_NETWORKS"}

    def _build_assignments_from_config(self) -> List[AssignmentDueItem]:
        assignments_section = self._cfg.get("sections", {}).get("assignments", {})
        subjects = assignments_section.get("subjects", {})
        rows: List[AssignmentDueItem] = []

        for subject_name, details in subjects.items():
            entries = details.get("assignments") or []
            for entry in entries:
                if not isinstance(entry, dict):
                    continue
                status = str(entry.get("status", "open")).lower()
                if status not in ("open", "overdue"):
                    continue
                rows.append(
                    AssignmentDueItem(
                        subject=subject_name,
                        title=str(entry.get("title", "")),
                        due_date=str(entry.get("due_date", "")),
                        status=status,
                        priority=entry.get("priority"),
                    )
                )

        if rows:
            rows.sort(key=lambda item: item.due_date)
            return rows

        return [
            AssignmentDueItem(subject="DBMS", title="Normalization Case Study", due_date="2026-03-15", status="open", priority="high"),
            AssignmentDueItem(subject="GEN_AI", title="Prompt Engineering Task", due_date="2026-03-18", status="open", priority="normal"),
            AssignmentDueItem(subject="NEURAL_NETWORKS", title="Backpropagation Implementation", due_date="2026-03-20", status="open", priority="normal"),
        ]

    def _normalize(self, text: str) -> str:
        return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9\s]", " ", text.lower())).strip()

    def _is_all_subjects_request(self, normalized: str) -> bool:
        markers = (
            "all subjects",
            "all subject",
            "every subject",
            "all courses",
            "all my subjects",
        )
        if any(marker in normalized for marker in markers):
            return True
        return "assignment" in normalized and "all" in normalized
