from __future__ import annotations

import re
from typing import Any, Dict, Optional

from app.services.portal_config import get_portal_config


class FacultyChatService:
    def __init__(self) -> None:
        cfg = get_portal_config()
        self._faculty: Dict[str, Any] = cfg.get("faculty", {})

    def generate_reply(self, *, user_id: Optional[str], message: str) -> Optional[str]:
        if not user_id:
            return None

        faculty = self._faculty.get(user_id)
        if not isinstance(faculty, dict):
            return None

        normalized = self._normalize(message)
        teaching = faculty.get("teaching", {})
        review = faculty.get("assignment_review", {})
        alerts = faculty.get("attendance_alerts", {})
        leave = faculty.get("leave_requests", {})
        classes = teaching.get("today_classes", [])
        alert_students = alerts.get("students", [])
        leave_requests = leave.get("pending", [])

        if any(token in normalized for token in ("first class", "which class is first", "next class", "my first class")):
            if not classes:
                return f"{faculty.get('name', 'Faculty')}, no classes are scheduled for today."
            first_class = classes[0]
            return (
                f"Your first class is {first_class.get('subject')} for {first_class.get('section')} at "
                f"{first_class.get('time')} in Room {first_class.get('room')}."
            )

        if any(token in normalized for token in ("how many reviews", "review count", "number of reviews")):
            pending = int(review.get("pending_count", 0))
            return f"You currently have {pending} pending assignment review{'s' if pending != 1 else ''}."

        if any(token in normalized for token in ("who has low attendance", "which student has low attendance", "student with low attendance")):
            if not alert_students:
                return "No low attendance alerts are active right now."
            names = ", ".join(f"{row.get('name')} ({row.get('percentage')})" for row in alert_students)
            return f"Students with low attendance: {names}."

        if any(token in normalized for token in ("how many leave requests", "leave request count", "number of leave requests")):
            count = len(leave_requests)
            return f"There {'is' if count == 1 else 'are'} {count} pending leave request{'s' if count != 1 else ''} right now."

        if any(token in normalized for token in ("class", "classes", "schedule", "timetable")):
            if not classes:
                return f"{faculty.get('name', 'Faculty')}, no classes are scheduled for today."
            lines = [f"{faculty.get('name', 'Faculty')}, your classes for today:"]
            for row in classes:
                lines.append(f"- {row.get('time')} | {row.get('subject')} | {row.get('section')} | Room {row.get('room')}")
            return "\n".join(lines)

        if any(token in normalized for token in ("review", "pending assignment", "submission", "check assignment")):
            pending = int(review.get("pending_count", 0))
            subjects = review.get("subjects", [])
            if pending <= 0:
                return f"{faculty.get('name', 'Faculty')}, there are no pending assignment reviews right now."
            subject_list = ", ".join(subjects) if subjects else "your assigned subjects"
            return f"{faculty.get('name', 'Faculty')}, you have {pending} pending assignment reviews for {subject_list}."

        if any(token in normalized for token in ("low attendance", "attendance alert", "short attendance", "attendance students")):
            if not alert_students:
                return "No low attendance alerts are active right now."
            lines = ["Low attendance alerts:"]
            for row in alert_students:
                lines.append(f"- {row.get('name')} ({row.get('student_id')}) | {row.get('subject')} | {row.get('percentage')}")
            return "\n".join(lines)

        if any(token in normalized for token in ("leave", "leave request", "approval")):
            if not leave_requests:
                return "There are no pending leave requests right now."
            lines = ["Pending leave requests:"]
            for row in leave_requests:
                lines.append(f"- {row.get('student_name')} ({row.get('student_id')}) | {row.get('days')} day(s) | {row.get('reason')}")
            return "\n".join(lines)

        if any(token in normalized for token in ("subject", "teaching load", "assigned subject")):
            subjects = faculty.get("subjects", [])
            department = faculty.get("department", "your department")
            if not subjects:
                return f"{faculty.get('name', 'Faculty')} is mapped to {department}."
            return f"{faculty.get('name', 'Faculty')} is mapped to {department}. Assigned subjects: {', '.join(subjects)}."

        return None

    def _normalize(self, text: str) -> str:
        return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9\s]", " ", str(text).lower())).strip()
