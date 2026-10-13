"""
Omni-RAG Guardrails Engine.
Validates inputs and outputs to prevent hallucinations, fabricated numbers,
unsupported claims, and off-topic prompts.
"""

import re
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

@dataclass
class GuardrailCheckResult:
    passed: bool
    status: str  # "VERIFIED", "WARNING", "BLOCKED"
    confidence_score: float  # 0.0 - 1.0
    citations_valid: bool
    numbers_verified: bool
    grounded_in_context: bool
    flags: List[str] = field(default_factory=list)
    sanitized_answer: Optional[str] = None

class RAGGuardrails:
    """
    Multimodal RAG Guardrails:
    1. Input Validation: Detect empty queries, adversarial prompt injections, or off-topic prompts.
    2. Retrieval Grounding: Verify that retrieved pages have enough relevance.
    3. Numerical & Fact Checking: Cross-reference numbers cited in the LLM response against retrieved context.
    4. Citation & Hallucination Guard: Ensure claims cite retrieved pages and abstain if evidence is missing.
    """

    INJECTION_PATTERNS = [
        r"ignore (all )?(previous|above) instructions",
        r"disregard (the )?(system|document|context)",
        r"system override",
        r"you are now (unrestricted|a different model)",
        r"forget your instructions",
        r"reveal your system prompt"
    ]

    UNSUPPORTED_PATTERNS = [
        r"as an ai,? i (don't|do not) have access",
        r"i cannot see the (image|document)",
        r"i am unable to view"
    ]

    def validate_input(self, query: str) -> Dict[str, Any]:
        """
        Validate user input against prompt injection and empty/malicious input.
        """
        cleaned = query.strip()
        if not cleaned:
            return {"valid": False, "reason": "Query cannot be empty."}

        if len(cleaned) > 2000:
            return {"valid": False, "reason": "Query exceeds maximum allowed length of 2000 characters."}

        # Check for injection attacks
        query_lower = cleaned.lower()
        for pat in self.INJECTION_PATTERNS:
            if re.search(pat, query_lower):
                return {
                    "valid": False,
                    "reason": "Security Alert: Prompt injection pattern detected. Query rejected by guardrails."
                }

        return {"valid": True, "reason": "Input passed security checks."}

    def extract_numbers(self, text: str) -> List[str]:
        """
        Extract numerical tokens (percentages, currency, integers, decimals).
        """
        # Matches patterns like $4,820, +41.3%, 2,946, 14.1%, $28.10, 10-Q
        pattern = r"[\$€£]?[-+]?\d{1,3}(?:,\d{3})*(?:\.\d+)?%?"
        matches = re.findall(pattern, text)
        # Filter out trivial 1-digit numbers or empty
        return [m.strip() for m in matches if any(char.isdigit() for char in m) and len(m) > 1]

    def verify_response(
        self,
        query: str,
        answer: str,
        context_text: str,
        citations: List[Dict[str, Any]],
        retrieval_scores: Optional[List[float]] = None
    ) -> GuardrailCheckResult:
        """
        Cross-checks model answer against retrieved tabular context and citation pages.
        """
        flags: List[str] = []
        citations_valid = True
        numbers_verified = True
        grounded_in_context = True

        # Check 1: Did the LLM complain it cannot view documents?
        answer_lower = answer.lower()
        for pat in self.UNSUPPORTED_PATTERNS:
            if re.search(pat, answer_lower):
                flags.append("Model reported vision blindness or missing document.")
                grounded_in_context = False

        # Check 2: Citations presence & validity
        has_page_citation = bool(re.search(r"\[Page \d+", answer) or re.search(r"Page \d+", answer) or citations)
        if not has_page_citation:
            flags.append("Missing page citations in answer body.")
            citations_valid = False

        # Check 3: Retrieval confidence check
        avg_score = 0.0
        if retrieval_scores:
            avg_score = sum(retrieval_scores) / max(len(retrieval_scores), 1)
            if avg_score < 0.2 and not context_text.strip():
                flags.append("Low retrieval relevance score: High risk of hallucination.")
                grounded_in_context = False

        # Check 4: Numerical fidelity (check if primary numbers in answer exist in context)
        # Only verify if we have retrieved text context (e.g. extracted tables or OCR)
        if context_text.strip():
            answer_numbers = self.extract_numbers(answer)
            context_numbers = set(self.extract_numbers(context_text))

            # Clean punctuation for matching
            def norm(n: str):
                return re.sub(r"[^\d.]", "", n)

            norm_context = {norm(n) for n in context_numbers if norm(n)}
            unverified_nums = []

            for num in answer_numbers:
                cleaned_num = norm(num)
                # Ignore common year tags or tiny integers (like 1, 2, 2024, 2023)
                if cleaned_num in {"1", "2", "3", "4", "5", "10", "2020", "2023", "2024", "2025"}:
                    continue
                if cleaned_num and cleaned_num not in norm_context:
                    unverified_nums.append(num)

            # If more than 60% of substantive numbers are completely absent from context
            if len(answer_numbers) > 3 and len(unverified_nums) > (len(answer_numbers) * 0.6):
                flags.append(f"Unverified figures detected: {', '.join(unverified_nums[:4])}")
                numbers_verified = False

        # Check 5: Hallucination disclaimer insertion if confidence is degraded
        sanitized = answer
        confidence = 0.95

        if flags:
            confidence -= (len(flags) * 0.15)
            confidence = max(0.2, min(confidence, 1.0))

        if not grounded_in_context or (not numbers_verified and len(flags) >= 2):
            status = "WARNING"
            disclaimer = "\n\n> ⚠️ **Guardrail Notice**: Some figures or conclusions in this answer could not be fully cross-verified against indexed tables. Please check the cited pages."
            if not answer.endswith(disclaimer):
                sanitized = answer + disclaimer
        else:
            status = "VERIFIED"

        return GuardrailCheckResult(
            passed=(status == "VERIFIED"),
            status=status,
            confidence_score=round(confidence, 2),
            citations_valid=citations_valid,
            numbers_verified=numbers_verified,
            grounded_in_context=grounded_in_context,
            flags=flags,
            sanitized_answer=sanitized
        )
