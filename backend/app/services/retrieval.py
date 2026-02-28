from typing import List

from app.schemas import SourceItem


class RetrievalService:
    """MVP retrieval path: simple keyword matching placeholder until Supabase RAG is connected."""

    def __init__(self) -> None:
        self._faq = {
            "admission": "Admissions usually open each semester. Check the admissions portal for exact deadlines.",
            "fee": "Tuition and fee details are published on the finance office page.",
            "hostel": "Hostel allocation depends on availability and your application status.",
            "exam": "Exam schedules are released by the academic office and department notice boards.",
        }

    def find_sources(self, user_message: str) -> List[SourceItem]:
        query = user_message.lower()
        hits: List[SourceItem] = []

        for key, value in self._faq.items():
            if key in query:
                hits.append(SourceItem(title=f"FAQ: {key}", snippet=value))

        return hits[:3]
