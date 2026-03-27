from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

from app.services.portal_config import get_portal_config


class StudentChatService:
    def __init__(self) -> None:
        cfg = get_portal_config()
        self._students: Dict[str, Any] = cfg.get("students", {})
        self._assignment_subjects: Dict[str, Any] = cfg.get("sections", {}).get("assignments", {}).get("subjects", {})

    def generate_reply(self, *, user_id: Optional[str], message: str) -> Optional[str]:
        if not user_id:
            return None

        student = self._students.get(user_id)
        if not isinstance(student, dict):
            return None

        normalized = self._normalize(message)
        attendance = student.get("attendance", {})
        assignments = self._open_assignments()

        if attendance and any(token in normalized for token in ("lowest attendance", "least attendance", "low attendance subject")):
            subject, details = min(attendance.items(), key=lambda item: self._attendance_ratio(item[1]))
            return self._format_attendance_extreme("lowest", subject, details)

        if attendance and any(token in normalized for token in ("highest attendance", "best attendance", "top attendance subject")):
            subject, details = max(attendance.items(), key=lambda item: self._attendance_ratio(item[1]))
            return self._format_attendance_extreme("highest", subject, details)

        if assignments and any(token in normalized for token in ("how many assignments", "assignment count", "pending assignments", "assignments are pending")):
            return f"You currently have {len(assignments)} pending assignment{'s' if len(assignments) != 1 else ''} across your subjects."

        if assignments and any(token in normalized for token in ("which assignment is due first", "next assignment due", "earliest assignment", "assignment due first")):
            first = assignments[0]
            return (
                f"Your next assignment due is {first.get('title')} for {first.get('subject')} on "
                f"{first.get('due_date')}."
            )

        if assignments and any(token in normalized for token in ("which subject has most assignments", "most assignments", "maximum assignments")):
            counts = self._assignment_counts(assignments)
            subject, count = max(counts.items(), key=lambda item: item[1])
            return f"{subject} currently has the most pending assignments with {count} item{'s' if count != 1 else ''}."

        return None

    def _open_assignments(self) -> List[Dict[str, Any]]:
        rows: List[Dict[str, Any]] = []
        for subject, details in self._assignment_subjects.items():
            entries = details.get("assignments") or []
            for entry in entries:
                if not isinstance(entry, dict):
                    continue
                status = str(entry.get("status", "open")).lower()
                if status not in ("open", "overdue"):
                    continue
                rows.append(
                    {
                        "subject": subject,
                        "title": str(entry.get("title", "")),
                        "due_date": str(entry.get("due_date", "")),
                        "status": status,
                    }
                )
        rows.sort(key=lambda item: item["due_date"])
        return rows

    def _assignment_counts(self, assignments: List[Dict[str, Any]]) -> Dict[str, int]:
        counts: Dict[str, int] = {}
        for row in assignments:
            subject = str(row.get("subject", "Unknown"))
            counts[subject] = counts.get(subject, 0) + 1
        return counts

    def _attendance_ratio(self, details: Any) -> float:
        if not isinstance(details, dict):
            return 0.0
        attended = details.get("attended")
        total = details.get("total")
        try:
            if total:
                return float(attended) / float(total)
        except (TypeError, ValueError, ZeroDivisionError):
            pass
        percentage = str(details.get("percentage", "0")).replace("%", "").strip()
        try:
            return float(percentage) / 100.0
        except ValueError:
            return 0.0

    def _format_attendance_extreme(self, label: str, subject: str, details: Any) -> str:
        if not isinstance(details, dict):
            return f"Your {label} attendance subject is {subject}."
        percentage = details.get("percentage", "N/A")
        attended = details.get("attended")
        total = details.get("total")
        if attended is not None and total is not None:
            return f"Your {label} attendance is in {subject}: {percentage} ({attended}/{total} classes attended)."
        return f"Your {label} attendance is in {subject}: {percentage}."

    def _normalize(self, text: str) -> str:
        return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9\s]", " ", str(text).lower())).strip()
