# Omni-RAG

A modular, lightweight **Multimodal RAG** framework with a Python back-end and a graphical interface, mainly designed for the office domain. You can ingest PDF documents, scanned images, and complex tabular data to extract structured insights using free-tier **LLMs** (*Google Gemini* or *Meta Llama*).

It contains a Python framework with a multimodal RAG pipeline, document parser, and Gemini/Llama provider, along with a *FastAPI REST API* for communication. It also has a live RAG workspace to handle files, a model switcher, and some benchmarks.

## 🚀 Getting Started

Omni-RAG contains a user interface **front-end** (HTML, CSS, JS) and a RAG **back-end** (Python).
The simplest way to run the system is as below:

1. Run a *health check* ([link](https://omni-rag-api.onrender.com/api/health)) on the server to wake it up (if it is in the idle mode).
2. Run the GUI web-page ([link](https://alitourani.github.io/Omni-RAG/)).
3. Upload some documents and start querying!

## 🔗 Links

### **UI-based:**

- **With Google Pages:** [https://alitourani.github.io/Omni-RAG/](https://alitourani.github.io/Omni-RAG/)
- **With Gradio:** [https://omni-rag-api.onrender.com/ui/](https://omni-rag-api.onrender.com/ui/)

### **System APIs:**

- **Health:** [https://omni-rag-api.onrender.com/api/health](https://omni-rag-api.onrender.com/api/health)
- **Docs:** [https://omni-rag-api.onrender.com/api/documents](https://omni-rag-api.onrender.com/api/documents)
- **Upload:** [https://omni-rag-api.onrender.com/api/upload](https://omni-rag-api.onrender.com/api/upload)
- **Query:** [https://omni-rag-api.onrender.com/api/query](https://omni-rag-api.onrender.com/api/query)
