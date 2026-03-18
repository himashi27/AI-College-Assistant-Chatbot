from __future__ import annotations

from typing import Any, Dict, Optional

from app.config import get_settings
from app.services.portal_config import get_portal_config

try:
    from supabase import Client, create_client
except ImportError:  # pragma: no cover
    Client = None
    create_client = None


class PortalDataService:
    def __init__(self) -> None:
        settings = get_settings()
        self._cfg = get_portal_config()
        self._sections: Dict[str, Any] = self._cfg.get("sections", {})
        self._canonical_subjects: Dict[str, Any] = self._cfg.get("canonical_subjects", {})
        self._students: Dict[str, Any] = self._cfg.get("students", {})
        self._client: Client | None = None
        if settings.supabase_url and settings.supabase_key and create_client:
            self._client = create_client(settings.supabase_url, settings.supabase_key)

    def get_section_data(
        self,
        section_name: str,
        subject: Optional[str] = None,
        student_id: Optional[str] = None,
        semester: Optional[str] = None,
    ) -> Dict[str, Any]:
        section_key = section_name.lower().strip()
        if section_key not in self._sections:
            raise ValueError(f"Unsupported section: {section_name}")

        section = self._sections.get(section_key, {})
        payload: Dict[str, Any] = {
            "section": section_key,
            "requires_auth": bool(section.get("requires_auth", False)),
            "last_updated_at": section.get("last_updated_at"),
            "subject": subject,
            "data": None,
        }

        canonical_subject = self._resolve_subject(subject)

        if section_key == "fees":
            db_pages = self._db_fee_pages(student_id=student_id)
            if db_pages:
                payload["data"] = db_pages
                return payload
            pages = section.get("pages", {})
            payload["data"] = {key: self._resolve_student_template(value, student_id) for key, value in pages.items()}
            return payload

        if section_key == "attendance":
            db_attendance = self._db_attendance(section_subject=canonical_subject, student_id=student_id)
            if db_attendance is not None:
                if canonical_subject:
                    payload["subject"] = canonical_subject
                payload["data"] = db_attendance
                return payload

            courses = section.get("courses", {})
            if canonical_subject:
                payload["subject"] = canonical_subject
                record = courses.get(canonical_subject) or {}
                template = record.get("attendance_template")
                student_attendance = self._student_attendance(student_id=student_id, subject=canonical_subject)
                payload["data"] = {
                    **record,
                    "attendance_url": self._resolve_student_template(template, student_id),
                    "attendance_stats": student_attendance,
                }
            else:
                mapped = {}
                for subject_name, record in courses.items():
                    template = (record or {}).get("attendance_template")
                    student_attendance = self._student_attendance(student_id=student_id, subject=subject_name)
                    mapped[subject_name] = {
                        **(record or {}),
                        "attendance_url": self._resolve_student_template(template, student_id),
                        "attendance_stats": student_attendance,
                    }
                payload["data"] = mapped
            return payload

        if section_key == "syllabus":
            subjects = section.get("subjects", {})
            if canonical_subject:
                payload["subject"] = canonical_subject
                payload["data"] = subjects.get(canonical_subject)
            else:
                payload["data"] = subjects
            return payload

        if section_key == "assignments":
            db_assignments = self._db_assignments(section_subject=canonical_subject)
            if db_assignments is not None:
                if canonical_subject:
                    payload["subject"] = canonical_subject
                payload["data"] = {"assignments": db_assignments}
                return payload

            subjects = section.get("subjects", {})
            if canonical_subject:
                payload["subject"] = canonical_subject
                payload["data"] = subjects.get(canonical_subject)
            else:
                aggregated = []
                for subject_name, details in subjects.items():
                    for item in details.get("assignments", []):
                        if isinstance(item, dict):
                            row = dict(item)
                            row.setdefault("subject", subject_name)
                            aggregated.append(row)
                payload["data"] = {"assignments": aggregated}
            return payload

        if section_key == "performance":
            db_performance = self._db_performance(student_id=student_id, semester=semester)
            if db_performance is not None:
                if semester:
                    payload["subject"] = semester
                payload["data"] = db_performance
                return payload

            semesters = section.get("semesters", {})
            if semester and semester in semesters:
                template = semesters[semester].get("marks_page_template")
                payload["subject"] = semester
                payload["data"] = {
                    **semesters[semester],
                    "marks_page_url": self._resolve_student_template(template, student_id),
                }
            else:
                mapped = {}
                for sem_key, sem_row in semesters.items():
                    template = (sem_row or {}).get("marks_page_template")
                    mapped[sem_key] = {
                        **(sem_row or {}),
                        "marks_page_url": self._resolve_student_template(template, student_id),
                    }
                payload["data"] = mapped
            return payload

        payload["data"] = section
        return payload

    def section_requires_auth(self, section_name: str) -> bool:
        section_key = section_name.lower().strip()
        section = self._sections.get(section_key, {})
        return bool(section.get("requires_auth", False))

    def has_access(
        self,
        section_name: str,
        student_id: Optional[str],
        subject: Optional[str] = None,
        semester: Optional[str] = None,
    ) -> bool:
        # If we cannot resolve student metadata confidently, do not hard-block.
        if not student_id:
            return False
        student = self._students.get(student_id)
        if not isinstance(student, dict):
            return False

        section_key = section_name.lower().strip()
        canonical_subject = self._resolve_subject(subject) if subject else None

        if section_key in {"attendance", "assignments"} and canonical_subject:
            allowed_subjects = self._student_subjects(student)
            if allowed_subjects and canonical_subject not in allowed_subjects:
                return False
        if section_key in {"attendance", "assignments"} and subject and not canonical_subject:
            return False

        if section_key == "performance" and semester:
            requested_sem = self._semester_number(semester)
            student_sem = self._semester_number(str(student.get("semester", "")))
            if requested_sem and student_sem and requested_sem > student_sem:
                return False

        return True

    def _resolve_student_template(self, template: Any, student_id: Optional[str]) -> Any:
        if not isinstance(template, str):
            return template
        if "{student_id}" in template:
            return template.replace("{student_id}", student_id or "")
        return template

    def _student_attendance(self, student_id: Optional[str], subject: str) -> Optional[Dict[str, Any]]:
        if not student_id:
            return None
        student = self._students.get(student_id)
        if not isinstance(student, dict):
            return None
        attendance = student.get("attendance")
        if not isinstance(attendance, dict):
            return None
        row = attendance.get(subject)
        if isinstance(row, dict):
            return row
        if isinstance(row, str):
            return {"percentage": row}
        return None

    def _resolve_subject(self, subject: Optional[str]) -> Optional[str]:
        if not subject:
            return None
        lowered = subject.lower().strip()

        for canonical_name, details in self._canonical_subjects.items():
            slug = str(details.get("slug", "")).lower().strip()
            aliases = [str(item).lower().strip() for item in details.get("aliases", [])]
            if lowered == canonical_name.lower() or lowered == slug or lowered in aliases:
                return canonical_name

        return None

    def _student_subjects(self, student: Dict[str, Any]) -> set[str]:
        subjects = student.get("subjects")
        if isinstance(subjects, list):
            return {str(item) for item in subjects}
        attendance = student.get("attendance")
        if isinstance(attendance, dict):
            return {str(key) for key in attendance.keys()}
        return set()

    def _semester_number(self, raw: str) -> Optional[int]:
        digits = "".join(ch for ch in str(raw) if ch.isdigit())
        if not digits:
            return None
        try:
            return int(digits)
        except ValueError:
            return None

    def _db_attendance(self, section_subject: Optional[str], student_id: Optional[str]) -> Optional[Dict[str, Any]]:
        if not self._client or not student_id:
            return None
        try:
            query = (
                self._client.table("student_attendance")
                .select("attended_classes,total_classes,attendance_percentage,subjects(name)")
                .eq("student_id", student_id)
            )
            if section_subject:
                query = query.eq("subjects.name", section_subject)
            rows = query.execute().data or []

            if section_subject:
                if not rows:
                    return None
                row = rows[0]
                subject_obj = row.get("subjects") or {}
                subject_name = subject_obj.get("name", section_subject)
                return {
                    "attendance_stats": {
                        "percentage": f"{row.get('attendance_percentage', 0)}%",
                        "attended": row.get("attended_classes"),
                        "total": row.get("total_classes"),
                    },
                    "attendance_url": f"/attendance/{self._subject_slug(subject_name)}/{student_id}",
                }

            if not rows:
                return None
            mapped: Dict[str, Any] = {}
            for row in rows:
                subject_obj = row.get("subjects") or {}
                subject_name = subject_obj.get("name", "Unknown")
                mapped[subject_name] = {
                    "attendance_stats": {
                        "percentage": f"{row.get('attendance_percentage', 0)}%",
                        "attended": row.get("attended_classes"),
                        "total": row.get("total_classes"),
                    },
                    "attendance_url": f"/attendance/{self._subject_slug(subject_name)}/{student_id}",
                }
            return mapped
        except Exception:
            return None

    def _db_assignments(self, section_subject: Optional[str]) -> Optional[list[Dict[str, Any]]]:
        if not self._client:
            return None
        try:
            query = (
                self._client.table("assignments")
                .select("title,due_date,status,priority,subjects(name)")
                .in_("status", ["open", "overdue"])
                .order("due_date", desc=False)
                .limit(100)
            )
            if section_subject:
                query = query.eq("subjects.name", section_subject)
            rows = query.execute().data or []
            if not rows:
                return None
            return [
                {
                    "subject": (row.get("subjects") or {}).get("name", section_subject or "Unknown"),
                    "title": row.get("title", ""),
                    "due_date": str(row.get("due_date", "")),
                    "status": row.get("status", "open"),
                    "priority": row.get("priority"),
                }
                for row in rows
            ]
        except Exception:
            return None

    def _db_fee_pages(self, student_id: Optional[str]) -> Optional[Dict[str, Any]]:
        if not self._client:
            return None
        try:
            rows = self._client.table("fee_items").select("fee_type,amount,currency,due_date").order("due_date", desc=False).execute().data or []
            if not rows:
                return None
            formatted = {}
            for row in rows:
                key = str(row.get("fee_type", "fee")).lower().replace(" ", "_")
                formatted[key] = f"{row.get('currency', 'INR')} {row.get('amount')} (due {row.get('due_date')})"
            if student_id:
                formatted["pending"] = f"/fees/pending/{student_id}"
                formatted["receipts"] = f"/fees/receipts/{student_id}"
            return formatted
        except Exception:
            return None

    def _db_performance(self, student_id: Optional[str], semester: Optional[str]) -> Optional[Dict[str, Any]]:
        if not self._client or not student_id:
            return None
        try:
            query = self._client.table("student_performance").select("semester,gpa,marks_page_url").eq("student_id", student_id)
            if semester:
                query = query.eq("semester", semester)
            rows = query.execute().data or []
            if not rows:
                return None
            if semester:
                row = rows[0]
                return {
                    "semester": row.get("semester"),
                    "gpa": row.get("gpa"),
                    "marks_page_url": row.get("marks_page_url"),
                }
            mapped = {}
            for row in rows:
                sem_key = row.get("semester", "unknown")
                mapped[sem_key] = {
                    "gpa": row.get("gpa"),
                    "marks_page_url": row.get("marks_page_url"),
                }
            return mapped
        except Exception:
            return None

    def _subject_slug(self, subject_name: str) -> str:
        for canonical_name, details in self._canonical_subjects.items():
            if canonical_name == subject_name:
                return str(details.get("slug", canonical_name.lower()))
        return str(subject_name).lower().replace(" ", "_")
