from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

from app.schemas import NavigationTarget, QueryRouteData, QueryRouteRequest, QueryRouteResponse
from app.services.portal_config import get_portal_config


@dataclass
class SubjectDef:
    name: str
    slug: str
    aliases: List[str]


class QueryRouterService:
    """Deterministic query router backed by portal_config.json."""

    def __init__(self) -> None:
        self._cfg = get_portal_config()
        self._fallback = self._cfg.get("fallback_templates", {})
        self._subjects = self._load_subjects()
        self._intent_config: Dict[str, Dict] = self._cfg.get("intent_config", {})

    def route_query(self, req: QueryRouteRequest) -> QueryRouteResponse:
        normalized = self._normalize(req.message)
        if not normalized:
            return QueryRouteResponse(
                action="clarify",
                intent="unknown",
                confidence=0.0,
                clarification="Please enter a valid query.",
            )

        matched_subjects = self._detect_subjects(normalized)
        if len(matched_subjects) > 1:
            return QueryRouteResponse(
                action="clarify",
                intent="unknown",
                confidence=0.3,
                clarification=self._fallback.get(
                    "multiple_subject_match",
                    "Multiple subjects matched. Please specify one subject.",
                ),
            )

        detected_subject = matched_subjects[0] if matched_subjects else None
        session_subject = self._subject_from_current_page(req.current_page)
        effective_subject = detected_subject or session_subject

        intent, matched_keyword, confidence = self._detect_intent(normalized)

        if intent == "fees":
            label = "Fees Summary" if self._is_all_subjects_request(normalized) else "Fees Overview"
            return QueryRouteResponse(
                action="navigate",
                intent="fees",
                confidence=confidence,
                matched_keyword=matched_keyword,
                navigation=NavigationTarget(url="/fees/overview", label=label),
                data=QueryRouteData(subject=effective_subject.name if effective_subject else None),
            )

        if intent == "attendance":
            if self._is_all_subjects_request(normalized):
                return QueryRouteResponse(
                    action="navigate",
                    intent="attendance",
                    confidence=max(confidence, 0.93),
                    matched_keyword=matched_keyword or "attendance all subjects",
                    navigation=NavigationTarget(url="/attendance", label="All Subjects Attendance"),
                    data=QueryRouteData(filters={"scope": "all_subjects"}),
                )
            if not effective_subject:
                return self._clarify_subject("attendance")
            return self._subject_navigation_response(effective_subject, "attendance", "Attendance", confidence, matched_keyword)

        if intent == "syllabus":
            if self._is_all_subjects_request(normalized):
                return QueryRouteResponse(
                    action="navigate",
                    intent="syllabus",
                    confidence=max(confidence, 0.92),
                    matched_keyword=matched_keyword or "syllabus all subjects",
                    navigation=NavigationTarget(url="/syllabus", label="All Subjects Syllabus"),
                    data=QueryRouteData(filters={"scope": "all_subjects"}),
                )
            if not effective_subject:
                return self._clarify_subject("syllabus")
            return self._subject_navigation_response(effective_subject, "syllabus", "Syllabus", confidence, matched_keyword)

        if intent == "assignments":
            if effective_subject:
                return QueryRouteResponse(
                    action="assignment_summary",
                    intent="assignment_due",
                    confidence=confidence,
                    matched_keyword=matched_keyword,
                    navigation=NavigationTarget(
                        url=f"/assignments/{effective_subject.slug}",
                        label=f"{effective_subject.name} Assignments",
                    ),
                    data=QueryRouteData(subject=effective_subject.name, filters={"status": "open", "sort_by": "due_date"}),
                )

            return QueryRouteResponse(
                action="assignment_summary",
                intent="assignment_due",
                confidence=max(0.7, confidence - 0.1),
                matched_keyword=matched_keyword,
                navigation=NavigationTarget(url="/assignments", label="All Assignments"),
                data=QueryRouteData(filters={"status": "open", "sort_by": "due_date"}),
            )

        if intent == "performance":
            semester = self._detect_semester(normalized)
            if semester:
                return QueryRouteResponse(
                    action="navigate",
                    intent="performance",
                    confidence=max(confidence, 0.9),
                    matched_keyword=matched_keyword,
                    navigation=NavigationTarget(url=f"/performance/{semester}", label=f"{semester.upper()} Performance"),
                    data=QueryRouteData(filters={"semester": semester}),
                )
            return QueryRouteResponse(
                action="navigate",
                intent="performance",
                confidence=max(confidence, 0.88),
                matched_keyword=matched_keyword,
                navigation=NavigationTarget(url="/performance", label="Performance Summary"),
                data=QueryRouteData(filters={"scope": "all_semesters"}),
            )

        return QueryRouteResponse(
            action="fallback_llm",
            intent="unknown",
            confidence=0.4,
            clarification="No direct route found. Use LLM fallback for explanation.",
        )

    def _subject_navigation_response(
        self,
        subject: SubjectDef,
        page_type: str,
        label_suffix: str,
        confidence: float,
        matched_keyword: Optional[str],
    ) -> QueryRouteResponse:
        return QueryRouteResponse(
            action="navigate",
            intent=page_type,
            confidence=confidence,
            matched_keyword=matched_keyword or f"{page_type} {subject.name.lower()}",
            navigation=NavigationTarget(url=f"/{page_type}/{subject.slug}", label=f"{subject.name} {label_suffix}"),
            data=QueryRouteData(subject=subject.name),
        )

    def _clarify_subject(self, requested_section: str) -> QueryRouteResponse:
        return QueryRouteResponse(
            action="clarify",
            intent=requested_section,
            confidence=0.35,
            clarification=f"Please specify a subject for {requested_section}.",
            data=QueryRouteData(suggestions=[subject.name for subject in self._subjects[:5]]),
        )

    def _load_subjects(self) -> List[SubjectDef]:
        canonical = self._cfg.get("canonical_subjects", {})
        subjects: List[SubjectDef] = []
        for name, details in canonical.items():
            slug = details.get("slug") or self._normalize(name).replace(" ", "_")
            aliases = [self._normalize(item) for item in (details.get("aliases") or []) if isinstance(item, str)]
            aliases.append(self._normalize(name))
            subjects.append(SubjectDef(name=name, slug=slug, aliases=sorted(set(aliases))))

        if subjects:
            return subjects

        return [
            SubjectDef(name="DBMS", slug="dbms", aliases=["dbms", "database"]),
            SubjectDef(name="GEN_AI", slug="gen_ai", aliases=["gen ai", "generative ai"]),
            SubjectDef(name="NEURAL_NETWORKS", slug="neural_networks", aliases=["neural networks", "nn"]),
        ]

    def _detect_intent(self, normalized: str) -> Tuple[str, Optional[str], float]:
        best_intent = "unknown"
        best_score = -1
        best_keyword: Optional[str] = None

        for intent_name, details in self._intent_config.items():
            priority = int(details.get("intent_priority", 1))
            strong = [k.lower() for k in details.get("route_confidence_keywords", []) if isinstance(k, str)]
            weak = [k.lower() for k in details.get("weak_keywords", []) if isinstance(k, str)]

            matched_strong = next((k for k in strong if k in normalized), None)
            matched_weak = next((k for k in weak if k in normalized), None)
            if not matched_strong and not matched_weak:
                continue

            base = 100 if matched_strong else 40
            score = priority * 1000 + base
            if score > best_score:
                best_score = score
                best_intent = intent_name
                best_keyword = matched_strong or matched_weak

        if best_intent == "unknown":
            if "due assignment" in normalized or ("assignment" in normalized and "due" in normalized):
                return "assignments", "due assignment", 0.92
            if "attendance" in normalized:
                return "attendance", "attendance", 0.9
            if "syllabus" in normalized:
                return "syllabus", "syllabus", 0.88
            if "fee" in normalized or "fees" in normalized:
                return "fees", "fees", 0.94
            return "unknown", None, 0.4

        confidence = 0.95 if best_keyword and best_keyword in [k.lower() for k in self._intent_config[best_intent].get("route_confidence_keywords", [])] else 0.75
        return best_intent, best_keyword, confidence

    def _detect_subjects(self, normalized: str) -> List[SubjectDef]:
        matches: List[SubjectDef] = []
        for subject in self._subjects:
            if any(re.search(r"\b" + re.escape(alias) + r"\b", normalized) for alias in subject.aliases):
                matches.append(subject)
        return matches

    def _subject_from_current_page(self, current_page: Optional[str]) -> Optional[SubjectDef]:
        if not current_page:
            return None
        normalized = self._normalize(current_page)
        matches = self._detect_subjects(normalized)
        return matches[0] if matches else None

    def _normalize(self, text: str) -> str:
        return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9\s]", " ", text.lower())).strip()

    def _is_all_subjects_request(self, normalized: str) -> bool:
        all_markers = (
            "all subjects",
            "all subject",
            "every subject",
            "all courses",
            "all my subjects",
        )
        if any(marker in normalized for marker in all_markers):
            return True
        return "attendance" in normalized and "all" in normalized

    def _detect_semester(self, normalized: str) -> Optional[str]:
        if "sem3" in normalized or "sem 3" in normalized:
            return "sem3"
        if "sem5" in normalized or "sem 5" in normalized:
            return "sem5"
        return None
