"""
Llama Vision Multimodal Provider for OmniRAG.
Supports free-tier Llama 3.2 Vision via:
1. Groq Cloud (Free API tier: llama-3.2-11b-vision-preview)
2. Local Ollama (100% offline & free: llama3.2-vision:11b)
3. Hugging Face free Inference API
"""

import os
import time
import json
import urllib.error
import urllib.request
from typing import List, Optional
from .base import BaseMultimodalLLM, MultimodalResponse, ExtractedTable

DEFAULT_SYSTEM_PROMPT = """You are an expert Multimodal Document Specialist.
Analyze the provided document page images and table snippets.
Answer the user's question accurately with exact metrics, figures, and calculations.
Reconstruct relevant tabular data in clean Markdown tables and cite specific pages.
"""

class LlamaVisionProvider(BaseMultimodalLLM):
    def __init__(
        self,
        provider_mode: str = "groq",  # "groq" or "ollama"
        model_name: str = "llama-3.2-11b-vision-preview",
        api_key: Optional[str] = None,
        ollama_base_url: str = "http://localhost:11434"
    ):
        self.provider_mode = provider_mode
        self.model_name = model_name
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        self.ollama_base_url = ollama_base_url

    def generate_insight(
        self,
        query: str,
        page_images_base64: List[str],
        table_context: str = "",
        system_prompt: Optional[str] = None,
    ) -> MultimodalResponse:
        start_time = time.time()
        sys_prompt = system_prompt or DEFAULT_SYSTEM_PROMPT

        if self.provider_mode == "ollama":
            return self._generate_ollama(query, page_images_base64, table_context, sys_prompt, start_time)
        else:
            return self._generate_groq(query, page_images_base64, table_context, sys_prompt, start_time)

    def _generate_groq(
        self,
        query: str,
        page_images_base64: List[str],
        table_context: str,
        sys_prompt: str,
        start_time: float
    ) -> MultimodalResponse:
        if not self.api_key:
            raise ValueError(
                "GROQ_API_KEY environment variable is missing for Llama Vision. "
                "You can get a 100 percent free API key from https://console.groq.com/ "
                "or switch to local Ollama by setting provider_mode='ollama'."
            )

        try:
            from groq import Groq
            client = Groq(api_key=self.api_key)
        except ImportError:
            # Fallback to direct HTTP request using urllib
            return self._generate_groq_http(query, page_images_base64, table_context, sys_prompt, start_time)

        # Build messages payload
        content = []
        
        # Add images formatted for Groq / OpenAI Vision schema
        for img_b64 in page_images_base64:
            clean_b64 = img_b64.split(",")[1] if "," in img_b64 else img_b64
            content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{clean_b64}"
                }
            })

        user_text = f"Context from Document:\n{table_context}\n\nQuestion:\n{query}" if table_context else query
        content.append({"type": "text", "text": user_text})

        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": content}
            ],
            model=self.model_name,
            temperature=0.2,
        )

        output_text = chat_completion.choices[0].message.content or ""
        latency_ms = (time.time() - start_time) * 1000

        return self._format_response(output_text, latency_ms)

    def _generate_groq_http(
        self,
        query: str,
        page_images_base64: List[str],
        table_context: str,
        sys_prompt: str,
        start_time: float
    ) -> MultimodalResponse:
        url = "https://api.groq.com/openai/v1/chat/completions"
        content = []
        for img_b64 in page_images_base64:
            clean_b64 = img_b64.split(",")[1] if "," in img_b64 else img_b64
            content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{clean_b64}"}
            })
        
        user_text = f"Context:\n{table_context}\n\nQuestion: {query}" if table_context else query
        content.append({"type": "text", "text": user_text})

        payload = {
            "model": self.model_name,
            "messages": [
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": content}
            ],
            "temperature": 0.2
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}"
            }
        )

        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            output_text = data["choices"][0]["message"]["content"]

        latency_ms = (time.time() - start_time) * 1000
        return self._format_response(output_text, latency_ms)

    def _generate_ollama(
        self,
        query: str,
        page_images_base64: List[str],
        table_context: str,
        sys_prompt: str,
        start_time: float
    ) -> MultimodalResponse:
        url = f"{self.ollama_base_url.rstrip('/')}/api/generate"
        
        images_raw = []
        for img in page_images_base64:
            clean = img.split(",")[1] if "," in img else img
            images_raw.append(clean)

        prompt_text = f"{sys_prompt}\n\nDocument Context:\n{table_context}\n\nQuestion: {query}"

        payload = {
            "model": "llama3.2-vision:11b",
            "prompt": prompt_text,
            "images": images_raw,
            "stream": False,
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )

        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                output_text = data.get("response", "")
        except urllib.error.URLError as e:
            raise ConnectionError(
                f"Failed to connect to local Ollama at {url}. "
                "Ensure Ollama is running (`ollama serve`) and the model is pulled (`ollama pull llama3.2-vision:11b`)."
            ) from e

        latency_ms = (time.time() - start_time) * 1000
        return self._format_response(output_text, latency_ms)

    def _format_response(self, text: str, latency_ms: float) -> MultimodalResponse:
        tables = []
        lines = text.split("\n")
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
            answer=text,
            model_name=f"Llama-Vision ({self.model_name})",
            tables=tables,
            latency_ms=latency_ms,
            raw_text=text
        )
