"""
Omni-RAG Hugging Face Spaces Entry Point.
Serves the 'FastAPI RAG' backend with full CORS support so the GitHub Pages
docs web app can query it directly, while also exposing a clean interactive UI
on Hugging Face at '7860'.
"""

import os
import uvicorn
import gradio as gr
from pydantic import BaseModel
from typing import Optional, List
from rag.rag_pipeline import MultimodalRAGPipeline
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, UploadFile, File, HTTPException


# Initialize pipeline
pipeline = MultimodalRAGPipeline()

# Define FastAPI app
api_app = FastAPI(
    title="Omni-RAG API (Hugging Face Spaces)",
    description="Multimodal RAG Backend of Omni-RAG for Office Use Cases (PDFs, Scanned Files, etc.)"
)

# Enable CORS for GitHub Pages (https://alitourani.github.io) and local testing
api_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    query: str
    model: str = "gemini"  # "gemini" or "llama"
    document_name: Optional[str] = None
    top_k: int = 2

class QueryResponse(BaseModel):
    answer: str
    model_name: str
    tables: List[dict]
    citations: List[dict]
    latency_ms: float

# ----------- Health API ----------------
@api_app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY")),
        "groq_llama_configured": bool(os.getenv("GROQ_API_KEY")),
        "documents_indexed": len(pipeline.documents),
        "platform": "Hugging Face Spaces (Gradio SDK)"
    }

# ----------- Document Check API ----------------
@api_app.get("/api/documents")
def list_documents():
    docs_summary = []
    for name, pages in pipeline.documents.items():
        docs_summary.append({
            "name": name,
            "page_count": len(pages),
            "preview_image": f"data:image/jpeg;base64,{pages[0].image_base64[:100]}..." if pages else None
        })
    return {"documents": docs_summary}

# ----------- Upload API ----------------
@api_app.post("/api/upload")
async def upload_document(file: UploadFile = File(...)):
    try:
        content = await file.read()
        num_pages = pipeline.ingest_document(content, file.filename)
        return {
            "status": "success",
            "filename": file.filename,
            "pages_indexed": num_pages
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to ingest document: {str(e)}")

# ----------- Query API ----------------
@api_app.post("/api/query", response_model=QueryResponse)
def query_rag(request: QueryRequest):
    # Check if any file exists
    if not pipeline.documents:
        raise HTTPException(
            status_code=400,
            detail="No documents have been uploaded yet. Upload a PDF or scanned image first via /api/upload."
        )
    try:
        response = pipeline.query(
            question=request.query,
            model_type=request.model,
            document_name=request.document_name,
            top_k=request.top_k
        )
        return QueryResponse(
            answer=response.answer,
            model_name=response.model_name,
            tables=[{"title": t.title, "markdown": t.markdown} for t in response.tables],
            citations=response.citations,
            latency_ms=response.latency_ms
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Gradio Interface for the Space UI
def gradio_upload(files):
    if not files:
        return "No file selected!"
    messages = []
    for f in files:
        filename = os.path.basename(f.name)
        with open(f.name, "rb") as fp:
            content = fp.read()
        num_pages = pipeline.ingest_document(content, filename)
        messages.append(f"Indexed '{filename}' ({num_pages} pages).")
    return "\n".join(messages)

def gradio_query(question, model_choice):
    if not pipeline.documents:
        return "Please upload at least one document first!", "", "0 ms"
    try:
        model_key = "gemini" if "Gemini" in model_choice else "llama"
        res = pipeline.query(question, model_type=model_key)
        tables_md = "\n\n".join([f"### {t.title}\n{t.markdown}" for t in res.tables])
        latency_str = f"{res.latency_ms:.0f} ms ({res.model_name})"
        return res.answer, tables_md, latency_str
    except Exception as e:
        return f"Error: {str(e)}", "", "Error"

with gr.Blocks() as demo:
    gr.Markdown("""
    # 📑 Omni-RAG Backend (Hugging Face Spaces)
    
    *This Space acts as a standalone UI and the **CORS-enabled REST API backend** for your GitHub Pages!*
    
    **GitHub Pages Endpoint:**
    `https://alitourani.github.io/Omni-RAG/`
    """)
    
    with gr.Row():
        with gr.Column(scale=1):
            file_uploader = gr.File(
                label="Upload PDFs or Scanned Table Images", 
                file_count="multiple",
                file_types=[".pdf", ".png", ".jpg", ".jpeg"]
            )
            upload_status = gr.Textbox(label="Ingestion Status", interactive=False)
            file_uploader.change(gradio_upload, inputs=[file_uploader], outputs=[upload_status])
            
            model_selector = gr.Radio(
                label="Multimodal LLM (Free Versions)",
                choices=["Gemini 2.5 Flash", "Llama 3.2 Vision (Groq)"],
                value="Gemini 2.5 Flash"
            )
        
        with gr.Column(scale=2):
            query_box = gr.Textbox(label="Question or Data Extraction Prompt", placeholder="e.g. Extract Table 2 and calculate YoY growth rate")
            run_btn = gr.Button("🔍 Run Multimodal RAG", variant="primary")
            
            output_answer = gr.Markdown(label="Multimodal Insight & Answer")
            output_tables = gr.Markdown(label="Extracted Tables")
            output_latency = gr.Textbox(label="Latency & Model Cited", interactive=False)
            
            run_btn.click(
                gradio_query, 
                inputs=[query_box, model_selector], 
                outputs=[output_answer, output_tables, output_latency]
            )

# Disable Gradio SSR mode to prevent Node.js port collisions
demo.ssr_mode = False

# Mount FastAPI app onto Gradio
app = gr.mount_gradio_app(api_app, demo, path="/", ssr_mode=False)

if __name__ == "__main__":
    print("[INFO] Launching Omni-RAG ...")
    port = int(os.getenv("PORT", 7860))
    
    # Check if running inside Hugging Face Spaces
    is_hf_space = os.getenv("SPACE_ID") or os.getenv("HF_SPACE_ID")
    print(f"[INFO] Port {port} | On-HF-Space: {is_hf_space}")
    
    if is_hf_space:
        # On HF Spaces: Launch via Gradio to keep process alive on port 7860
        print("[INFO] Launching on Hugging Face Spaces...")
        try:
            demo.launch(server_name="0.0.0.0", server_port=port, ssr_mode=False)
        except Exception as e:
            print(f"\n[FATAL ERROR] Space failed to launch: {str(e)}", file=sys.stderr)
            print("\n[TRACEBACK]:", file=sys.stderr)
            traceback.print_exc()
            # Re-raise so HF registers the crash with a clear error stack
            raise e
    else:
        # On Local Machine: Launch via Uvicorn for live reload and local debugging
        print("[INFO] Launching on Local Machine...")
        uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
