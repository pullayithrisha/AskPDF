import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Base Paths
BASE_DIR = Path(__file__).resolve().parent
CHROMA_PATH = os.path.join(BASE_DIR, "chroma_db")
DEFAULT_PDF_PATH = os.path.join(BASE_DIR, "sample.pdf")

# Model Configuration
EMBEDDING_MODEL = "models/gemini-embedding-001"
LLM_MODEL = "gemini-2.5-flash"

# Ingestion & Chunking Configuration
CHUNK_SIZE = 1500     # 1500-character blocks for rapid ingestion & rich context
CHUNK_OVERLAP = 150   # 10% overlap preserving document context

# Retrieval Configuration
RETRIEVAL_K = 4
COLLECTION_NAME = "askdoc_collection"
