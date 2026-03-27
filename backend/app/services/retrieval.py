from typing import List

from app.schemas import SourceItem


class RetrievalService:
    """MVP retrieval path: simple keyword matching placeholder until Supabase RAG is connected."""

    def __init__(self) -> None:
        self._faq = {
            "student": {
                "admission": "Admissions usually open each semester. Check the admissions portal for exact deadlines.",
                "fee": "Tuition and fee details are published on the finance office page.",
                "hostel": "Hostel allocation depends on availability and your application status.",
                "exam": "Exam schedules are released by the academic office and department notice boards.",
                "attendance": "Attendance summaries can be checked subject-wise or across all your enrolled subjects.",
                "assignment": "Assignments can be reviewed by subject or as a combined due list across all your subjects.",
            },
            "faculty": {
                "class": "Faculty class schedules are organized by assigned subjects, section, room, and day-wise timetable.",
                "review": "Pending review workload is tracked subject-wise so faculty can clear submissions efficiently.",
                "attendance": "Low attendance alerts highlight students who may need intervention or communication.",
                "leave": "Faculty can review leave requests before approval or escalation to the academic office.",
            },
        }

    def find_sources(self, user_message: str, persona: str = "student") -> List[SourceItem]:
        query = user_message.lower()
        hits: List[SourceItem] = []
        persona_key = "faculty" if (persona or "").strip().lower() == "faculty" else "student"
        active_faq = self._faq.get(persona_key, {})

        for key, value in active_faq.items():
            if key in query:
                hits.append(SourceItem(title=f"FAQ: {key}", snippet=value))

        return hits[:3]
