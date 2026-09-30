"""
Multimodal RAG Pipeline for Office Use Cases in Omni-RAG.

Covers:
1. Document Ingestion & Page Rendering
2. Visual & Tabular Chunk Indexing
3. Hybrid Retrieval (Top-k visual pages + table snippets)
4. Model Dispatcher (Gemini 2.5 Flash / Llama 3.2 Vision)
"""
import re
from dataclasses import dataclass
from typing import List, Dict, Any, Optional, Tuple

from .models.gemini_provider import GeminiProvider
from .models.llama_provider import LlamaVisionProvider
from .parsers.doc_parser import DocumentParser, DocumentPage
from .models.base import BaseMultimodalLLM, MultimodalResponse

@dataclass
class RetrievalResult:
    pages: List[DocumentPage]
    table_context: str
    page_numbers: List[int]
    scores: List[float]

class MultimodalRAGPipeline:
    def __init__(
        self,
        gemini_model: str = "gemini-2.5-flash",
        llama_model: str = "llama-3.2-11b-vision-preview",
        dpi: int = 150
    ):
        self.parser = DocumentParser(dpi=dpi)
        self.documents: Dict[str, List[DocumentPage]] = {}
        
        # Initialize providers lazily
        self._gemini_model_name = gemini_model
        self._llama_model_name = llama_model
        self._gemini_provider: Optional[GeminiProvider] = None
        self._llama_provider: Optional[LlamaVisionProvider] = None

    @property
    def gemini_provider(self) -> GeminiProvider:
        if self._gemini_provider is None:
            self._gemini_provider = GeminiProvider(model_name=self._gemini_model_name)
        return self._gemini_provider

    @property
    def llama_provider(self) -> LlamaVisionProvider:
        if self._llama_provider is None:
            self._llama_provider = LlamaVisionProvider(model_name=self._llama_model_name)
        return self._llama_provider

    def ingest_document(self, file_source: Any, filename: str) -> int:
        """
        Parses a document (PDF or image) and adds its pages to the index.
        Returns the number of pages indexed.
        """
        pages = self.parser.parse_file(file_source, filename)
        self.documents[filename] = pages
        return len(pages)

    def retrieve_relevant_pages(
        self,
        query: str,
        document_name: Optional[str] = None,
        top_k: int = 2
    ) -> RetrievalResult:
        """
        Retrieves the most relevant page images and table snippets for a query.
        Uses hybrid term-overlap & table-density scoring.
        """
        candidate_pages: List[Tuple[DocumentPage, float]] = []
        
        # Target specific doc or all docs
        docs_to_search = (
            {document_name: self.documents[document_name]}
            if document_name and document_name in self.documents
            else self.documents
        )

        query_terms = set(re.findall(r"\w+", query.lower()))

        for doc_id, pages in docs_to_search.items():
            for page in pages:
                score = 0.0
                content = (page.text_content + " " + " ".join(page.tables_found)).lower()
                
                # Check keyword overlap
                for term in query_terms:
                    if len(term) > 2 and term in content:
                        score += 1.5
                
                # Boost if page contains detected tables and query asks for table/data/metrics
                table_intent = any(w in query.lower() for w in ["table", "revenue", "cost", "total", "margin", "row", "column", "compare", "%", "$", "number"])
                if table_intent and (page.tables_found or "|" in page.text_content):
                    score += 2.0

                # Default baseline score to ensure pages are passed if sparse text
                score += 0.1

                candidate_pages.append((page, score))

        # Sort by score descending
        candidate_pages.sort(key=lambda x: x[1], reverse=True)
        top_candidates = candidate_pages[:top_k]

        selected_pages = [p for p, _ in top_candidates]
        scores = [s for _, s in top_candidates]
        page_numbers = [p.page_number for p in selected_pages]

        # Aggregate table context
        table_snippets = []
        for p in selected_pages:
            if p.tables_found:
                table_snippets.extend(p.tables_found)
            elif "|" in p.text_content:
                # Include lines with tables
                table_snippets.append("\n".join([line for line in p.text_content.split("\n") if "|" in line]))

        table_context_str = "\n\n".join(table_snippets)

        return RetrievalResult(
            pages=selected_pages,
            table_context=table_context_str,
            page_numbers=page_numbers,
            scores=scores
        )

    def query(
        self,
        question: str,
        model_type: str = "gemini",  # "gemini" or "llama"
        document_name: Optional[str] = None,
        top_k: int = 2
    ) -> MultimodalResponse:
        """
        Executes end-to-end Multimodal RAG:
        
        1. Retrieval of visual pages & table crops
        2. Prompt formatting
        3. Multimodal LLM synthesis
        """
        if not self.documents:
            raise ValueError("No documents have been ingested yet. Call ingest_document() first.")

        # 1. Retrieve
        retrieval = self.retrieve_relevant_pages(question, document_name=document_name, top_k=top_k)
        
        # 2. Extract base64 images
        page_images = [p.image_base64 for p in retrieval.pages]

        # 3. Dispatch to selected model
        if model_type.lower() == "gemini":
            provider = self.gemini_provider
        elif model_type.lower() == "llama":
            provider = self.llama_provider
        else:
            raise ValueError(f"Unknown model_type '{model_type}'. Choose 'gemini' or 'llama'.")

        response = provider.generate_insight(
            query=question,
            page_images_base64=page_images,
            table_context=retrieval.table_context
        )

        # Add citation metadata
        response.citations = [
            {"page": p_num, "score": round(score, 2)}
            for p_num, score in zip(retrieval.page_numbers, retrieval.scores)
        ]

        return response
