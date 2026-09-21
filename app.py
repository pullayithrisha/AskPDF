import os
import shutil
import warnings
from pathlib import Path
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import config
from ingest import ingest_pdf
from rag_chain import AskDocRAG

warnings.filterwarnings("ignore")

app = FastAPI(
    title="AskDoc RAG API",
    description="Production RAG pipeline powered by LangChain, Gemini 2.5 Flash, ChromaDB, and PyPDF",
    version="1.0.0"
)

# Enable CORS for local React development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global RAG Instance & Active PDF tracking
rag_instance = None
active_document_name = None

UPLOAD_DIR = os.path.join(config.BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

def ensure_rag_instance():
    """Attempts to initialize RAG instance from existing ChromaDB or sample.pdf."""
    global rag_instance, active_document_name
    if rag_instance is not None:
        return

    if os.path.exists(config.CHROMA_PATH):
        try:
            candidate = AskDocRAG()
            count = candidate.vector_store._collection.count()
            if count > 0:
                rag_instance = candidate
                sample = candidate.vector_store._collection.get(limit=1)
                if sample and sample.get("metadatas") and len(sample["metadatas"]) > 0:
                    src = sample["metadatas"][0].get("source", "sample.pdf")
                    active_document_name = os.path.basename(src)
                else:
                    active_document_name = "sample.pdf"
                return
        except Exception:
            pass

    if os.path.exists(config.DEFAULT_PDF_PATH):
        try:
            ingest_pdf(config.DEFAULT_PDF_PATH, original_filename="sample.pdf")
            rag_instance = AskDocRAG()
            active_document_name = "sample.pdf"
        except Exception:
            pass

class QueryRequest(BaseModel):
    question: str

@app.get("/api/status")
def get_status():
    """Returns vector database status and current document info."""
    ensure_rag_instance()
    total_chunks = 0
    if rag_instance and rag_instance.vector_store:
        try:
            total_chunks = rag_instance.vector_store._collection.count()
        except Exception:
            total_chunks = 0

    return {
        "status": "ready" if (rag_instance and total_chunks > 0) else "no_document",
        "active_document": active_document_name,
        "total_chunks": total_chunks,
        "embedding_model": config.EMBEDDING_MODEL,
        "llm_model": config.LLM_MODEL
    }

@app.post("/api/reset")
def reset_session():
    """Resets session state."""
    global rag_instance, active_document_name
    rag_instance = None
    active_document_name = None
    return {"message": "Session reset successfully."}

import tempfile

@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """Uploads a PDF document, chunking and embedding it into ChromaDB."""
    global rag_instance, active_document_name

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    # Save to a temporary file for ingestion
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        # Ingest PDF into ChromaDB preserving the original filename
        ingest_pdf(tmp_path, original_filename=file.filename)
        active_document_name = file.filename
        
        # Initialize RAG instance
        rag_instance = AskDocRAG()
        chunk_count = rag_instance.vector_store._collection.count()

        return {
            "message": f"Successfully indexed '{file.filename}'",
            "filename": file.filename,
            "total_chunks": chunk_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to ingest PDF: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception:
                pass

@app.post("/api/query")
def query_rag(request: QueryRequest):
    """Executes a query against the RAG pipeline."""
    global rag_instance, active_document_name

    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    ensure_rag_instance()
    if rag_instance is None:
        raise HTTPException(status_code=400, detail="Please upload a PDF document first.")

    try:
        result = rag_instance.query(request.question)

        # Format source docs for response
        formatted_sources = []
        for doc in result["source_documents"]:
            src = doc.metadata.get("source", active_document_name or "PDF")
            formatted_sources.append({
                "page": doc.metadata.get("page", 0) + 1,
                "source": os.path.basename(src),
                "snippet": doc.page_content.strip()
            })

        return {
            "answer": result["answer"],
            "retrieval_time_ms": result["retrieval_time_ms"],
            "generation_time_ms": result["generation_time_ms"],
            "total_time_ms": result["total_time_ms"],
            "source_documents": formatted_sources,
            "active_document": active_document_name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
