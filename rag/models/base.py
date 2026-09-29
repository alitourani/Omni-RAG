"""
Base interface for Multimodal LLM providers in Omni-RAG.
Supports image inputs (PDF page renders, scanned tables) alongside text prompts.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any

@dataclass
class ExtractedTable:
    title: str
    markdown: str
    raw_data: Optional[List[List[str]]] = None
    page_number: int = 1

@dataclass
class MultimodalResponse:
    answer: str
    model_name: str
    tables: List[ExtractedTable] = field(default_factory=list)
    citations: List[Dict[str, Any]] = field(default_factory=list)
    latency_ms: float = 0.0
    raw_text: str = ""

class BaseMultimodalLLM(ABC):
    """
    Abstract base class for Multimodal LLM providers.
    """

    @abstractmethod
    def generate_insight(
        self,
        query: str,
        page_images_base64: List[str],
        table_context: str = "",
        system_prompt: Optional[str] = None,
    ) -> MultimodalResponse:
        """
        Send query and document page images/table context to the multimodal model.
        
        Args:
            query: User's question or extraction instruction.
            page_images_base64: List of base64-encoded JPEG/PNG images of pages/tables.
            table_context: Pre-extracted table text or OCR text (optional).
            system_prompt: Guiding system prompt.
            
        Returns:
            MultimodalResponse with answer, markdown tables, and citations.
        """
        pass
