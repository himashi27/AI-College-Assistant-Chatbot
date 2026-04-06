from __future__ import annotations

from app.schemas import AdminUserItem
from app.services.portal_config import get_portal_config


class AdminService:
    def list_users(self) -> list[AdminUserItem]:
        cfg = get_portal_config()
        students = cfg.get("students", {})
        faculty = cfg.get("faculty", {})
        student_email_map = cfg.get("student_email_map", {})
        faculty_email_map = cfg.get("faculty_email_map", {})

        student_email_lookup = {user_id: email for email, user_id in student_email_map.items()}
        faculty_email_lookup = {user_id: email for email, user_id in faculty_email_map.items()}

        items: list[AdminUserItem] = []

        for user_id, details in students.items():
            if not isinstance(details, dict):
                continue
            items.append(
                AdminUserItem(
                    user_id=user_id,
                    name=details.get("name", user_id),
                    email=student_email_lookup.get(user_id, ""),
                    persona="student",
                    semester=details.get("semester"),
                )
            )

        for user_id, details in faculty.items():
            if not isinstance(details, dict):
                continue
            items.append(
                AdminUserItem(
                    user_id=user_id,
                    name=details.get("name", user_id),
                    email=faculty_email_lookup.get(user_id, ""),
                    persona="faculty",
                    semester=None,
                )
            )

        items.sort(key=lambda row: (row.persona, row.name.lower()))
        return items
