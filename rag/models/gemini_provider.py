"""
Gemini Multimodal LLM Provider for Omni-RAG.
Uses the modern Google GenAI SDK (google-genai).
Compatible with gemini-3.8-flash.
"""

import os
import time
import base64
from google import genai
from google.genai import types
from typing import List, Optional
from .base import BaseMultimodalLLM, MultimodalResponse, ExtractedTable

DEFAULT_SYSTEM_PROMPT = """You are an expert Multimodal Document and Table Extraction Specialist.
Analyze the provided document page images and table snippets carefully.
When answering:
1. Provide a direct, precise answer to the user's question with exact figures, percentages, and metrics.
2. If tables are present, reconstruct the relevant data in clean Markdown table format with exact row and column names.
3. Explicitly cite which page number and table/section each key fact was retrieved from (e.g. [Page 1, Table 2]).
4. Maintain financial/scientific numerical precision and note any footnotes or units (e.g., Millions, USD, %, mg/dL).
"""

class GeminiProvider(BaseMultimodalLLM):
    def __init__(self, model_name: str = "gemini-3.8-flash", api_key: Optional[str] = None):
        self.model_name = model_name
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            # Fallback check for Google Cloud default credentials or prompt
            print("[Warning] GEMINI_API_KEY environment variable is not set.")
        
        self.client = genai.Client(api_key=self.api_key) if self.api_key else None

    def generate_insight(
        self,
        query: str,
        page_images_base64: List[str],
        table_context: str = "",
        system_prompt: Optional[str] = None,
    ) -> MultimodalResponse:
        start_time = time.time()
        
        if not self.client:
            raise ValueError(
                "Gemini Client is not initialized. Please set the GEMINI_API_KEY environment variable. "
                "You can get a free key from https://aistudio.google.com/"
            )

        contents = []
        
        # Add base64 image parts
        for idx, img_b64 in enumerate(page_images_base64):
            # Clean header if present
            if "," in img_b64:
                img_b64 = img_b64.split(",")[1]
            image_bytes = base64.b64decode(img_b64)
            contents.append(
                types.Part.from_bytes(
                    data=image_bytes,
                    mime_type="image/jpeg",
                )
            )

        # Build prompt text
        prompt_parts = []
        if table_context:
            prompt_parts.append(f"Pre-extracted Table & Document Context:\n{table_context}\n")
        prompt_parts.append(f"User Query:\n{query}")
        
        contents.append("\n".join(prompt_parts))

        sys_prompt = system_prompt or DEFAULT_SYSTEM_PROMPT

        response = self.client.models.generate_content(
            model=self.model_name,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=sys_prompt,
                temperature=0.2,
            )
        )

        latency_ms = (time.time() - start_time) * 1000
        output_text = response.text or ""

        # Extract markdown tables from response
        tables = []
        lines = output_text.split("\n")
        table_lines = []
        in_table = False

        for line in lines:
            if "|" in line:
                in_table = True
                table_lines.append(line)
            else:
                if in_table and len(table_lines) >= 2:
                    tables.append(ExtractedTable(
                        title="Extracted Table Insight",
                        markdown="\n".join(table_lines)
                    ))
                    table_lines = []
                in_table = False

        if in_table and len(table_lines) >= 2:
            tables.append(ExtractedTable(
                title="Extracted Table Insight",
                markdown="\n".join(table_lines)
            ))

        return MultimodalResponse(
            answer=output_text,
            model_name=self.model_name,
            tables=tables,
            latency_ms=latency_ms,
            raw_text=output_text
        )
