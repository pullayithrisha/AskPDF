# AskPDF / AskDoc - Production RAG Pipeline & Web Application

A modular, production-ready Retrieval-Augmented Generation (RAG) pipeline and full-stack web application built with **Python 3.10+**, **LangChain**, **Google Gemini API**, **ChromaDB**, **PyPDF**, **FastAPI**, and **React (Vite + Tailwind CSS)**.

---

## Technical Highlights
- **LangChain RAG Pipeline**: High-accuracy PDF extraction with character-based chunking and 10% overlap preserving context boundaries.
- **ChromaDB Vector Store**: Local persistence with Google Generative AI Embeddings (`models/gemini-embedding-001`) and cosine similarity search retrieving relevant document chunks in **sub-500ms**.
- **Context-Grounded LLM Generation**: Synthesizes answers strictly from retrieved document chunks using `gemini-2.5-flash` with anti-hallucination safeguards and inline citations `(pg.no. X)`.
- **Full-Stack Web Interface**: Modern glassmorphic React interface featuring dynamic document upload, collapsible engine sidebar, cited document source drawers with page numbers, and real-time latency performance badges.
- **Interactive CLI**: Terminal-based query loop with real-time vector search & LLM generation turnaround metrics.

---

## Tech Stack & Dependencies
- **Backend Framework**: FastAPI & Uvicorn
- **RAG & Orchestration**: LangChain (`langchain-core`, `langchain-chroma`, `langchain-google-genai`, `langchain-community`, `langchain-text-splitters`)
- **LLM**: Google Gemini (`gemini-2.5-flash`)
- **Embeddings**: Google Generative AI Embeddings (`models/gemini-embedding-001`)
- **Vector Database**: ChromaDB (`./chroma_db` with cosine similarity)
- **Document Parser**: PyPDF (`PyPDFLoader`)
- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide React, React Markdown

---

## Project Directory Layout

```
AskPDF/
├── .env.example              # Template for API key configuration
├── .gitignore                # Gitignore ignoring .env, venv/, chroma_db/, etc.
├── requirements.txt          # Python package dependencies
├── config.py                 # Central configuration (chunk size, overlap, models, paths)
├── ingest.py                 # PDF loader, splitter & ChromaDB vector store builder
├── rag_chain.py              # Cosine retriever, anti-hallucination Gemini prompt & timing
├── main.py                   # Interactive CLI loop with performance metrics & sources
├── app.py                    # FastAPI backend providing REST endpoints
├── sample.pdf                # Sample document for initial testing
└── frontend/                 # Modern React web application
    ├── package.json          # Frontend dependencies & scripts
    ├── vite.config.js        # Vite configuration with Tailwind CSS plugin
    └── src/
        ├── components/
        │   ├── Header.jsx       # Top navigation with document status badge & reset
        │   ├── ChatBox.jsx      # Conversational interface with markdown rendering
        │   ├── MetricsBadge.jsx # Sub-500ms retrieval & generation latency badge
        │   └── SourceDrawer.jsx # Expandable accordion for cited text excerpts
        ├── App.jsx           # Main application state orchestrator
        └── index.css         # Glassmorphism dark-theme styling
```

---

## Getting Started

### 1. Prerequisites
- Python 3.10 or higher
- Node.js 18 or higher (for the web interface)
- Google Gemini API Key (obtain free from [Google AI Studio](https://aistudio.google.com/))

### 2. Environment Setup
Clone the repository and enter the directory:
```bash
git clone https://github.com/pullayithrisha/AskPDF.git
cd AskPDF
```

Create and activate a Python virtual environment:
```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

Install backend dependencies:
```bash
pip install -r requirements.txt
```

### 3. API Key Configuration
Create a `.env` file in the root directory (based on `.env.example`):
```bash
# Windows PowerShell
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

Edit `.env` and insert your Gemini API Key:
```env
GOOGLE_API_KEY=your_actual_gemini_api_key_here
```

---

## How to Run

You can run AskPDF in either **Web Application Mode** or **Interactive Terminal Mode**:

### Option A: Modern Web Application (Recommended)

1. **Start the FastAPI Backend Server**:
   ```bash
   python app.py
   ```
   *The API server starts on `http://127.0.0.1:8000` (API documentation available at `http://127.0.0.1:8000/docs`).*

2. **Start the React Frontend**:
   In a new terminal window:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   *Open [http://localhost:5173](http://localhost:5173) in your browser.*

   **Features in the Web App**:
   - **Document Ingestion**: Drag & drop or upload any PDF to index it into ChromaDB in seconds.
   - **Context Q&A**: Ask any question and receive context-grounded answers with inline citations `(pg.no. X)`.
   - **Metrics Badges**: View vector search time (with `⚡ SUB-500MS` badge), generation time, and total latency.
   - **Source Drawers**: Click "Cited Sources" beneath each response to view exact excerpts and page numbers.

---

### Option B: Interactive Terminal CLI

1. **Ingest a Document (Optional if sample.pdf already indexed)**:
   ```bash
   python ingest.py
   # Or ingest a custom PDF:
   python ingest.py path/to/document.pdf
   ```

2. **Launch the CLI**:
   ```bash
   python main.py
   ```

3. **Example Terminal Session**:
   ```text
   ====================================================================
                  AskDoc - Production RAG Pipeline                     
       Stack: LangChain | gemini-2.5-flash | ChromaDB | PyPDF          
   ====================================================================
     Commands:
       - Type any question and press Enter to query your document.
       - Type 'ingest' to process/re-index the document.
       - Type 'exit' or 'quit' to close.
   ====================================================================

   AskDoc > What is TeleMedAI?

   [*] Retrieving context & synthesizing response...

   ============================================================
    ANSWER:
   ============================================================
   TeleMedAI is an Intelligent Automated Platform for Tele-Medical Underwriting for Health Insurance Applications (pg.no. 1).

   ------------------------------------------------------------
    PERFORMANCE METRICS:
     • Vector Retrieval Time (Cosine Similarity): 182.40 ms [FAST: SUB-500MS TARGET ACHIEVED]
     • LLM Generation Time (gemini-2.5-flash)  : 1.12 s (1120 ms)
     • Total Turnaround Latency                 : 1.30 s (1302 ms)
   ------------------------------------------------------------

   ------------------------------------------------------------
    RETRIEVED SOURCE CHUNKS (2 chunks used):
   ------------------------------------------------------------
    Chunk #1 | Page: 1 | Source: sample.pdf
      "TeleMedAI: An Intelligent Automated Platform for Tele-Medical Underwriting..."
   ```

---

## Anti-Hallucination Safeguards
AskPDF enforces strict prompt grounding rules:
1. Answers are synthesized strictly from retrieved document chunks.
2. If the document does not contain the required facts (e.g. asking *"What is the capital of France?"* on a medical insurance paper), the assistant answers with:
   > *"I don't have information about that in the uploaded document."*

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/status` | Current vector collection status, active document, and model info |
| `POST` | `/api/upload` | Upload and chunk-embed a new PDF document into ChromaDB |
| `POST` | `/api/query` | Query the RAG engine with anti-hallucination synthesis & latency metrics |
| `POST` | `/api/reset` | Reset active document and session state |
