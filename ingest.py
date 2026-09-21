import os
import sys
import time
import warnings
from pathlib import Path
from dotenv import load_dotenv

# Suppress minor library warnings for clean CLI output
warnings.filterwarnings("ignore")

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma

import config

# Load environment variables
load_dotenv()

def ingest_pdf(pdf_path: str, original_filename: str = None):
    """
    Loads a PDF document, splits it into chunks with overlap,
    generates embeddings using Google Generative AI Embeddings, and persists them to ChromaDB.
    """
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("[ERROR] GOOGLE_API_KEY environment variable is missing. Please set it in your .env file.")

    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"[ERROR] PDF file not found at path: {pdf_path}")

    doc_display_name = original_filename or os.path.basename(pdf_path)
    print(f"[*] Starting ingestion for document: {doc_display_name} ({pdf_path})")
    start_time = time.perf_counter()

    # Step 1: Document Extraction
    loader = PyPDFLoader(pdf_path)
    documents = loader.load()
    for doc in documents:
        doc.metadata["source"] = doc_display_name
    print(f"[+] Loaded {len(documents)} page(s) from PDF.")

    # Step 2: Chunking & Text Splitting
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=config.CHUNK_SIZE,
        chunk_overlap=config.CHUNK_OVERLAP,
        separators=["\n\n", "\n", " ", ""]
    )
    chunks = text_splitter.split_documents(documents)
    print(f"[+] Split document into {len(chunks)} text chunk(s) (size: {config.CHUNK_SIZE}, overlap: {config.CHUNK_OVERLAP}).")

    # Step 3: Embeddings Initialization & Chroma Storage
    print(f"[*] Initializing embeddings model: {config.EMBEDDING_MODEL}")
    embeddings = GoogleGenerativeAIEmbeddings(model=config.EMBEDDING_MODEL)

    print(f"[*] Building and persisting ChromaDB vector store at: {config.CHROMA_PATH}")
    # Reset existing collection if present to avoid cross-document contamination
    try:
        import chromadb
        client = chromadb.PersistentClient(path=config.CHROMA_PATH)
        client.delete_collection(config.COLLECTION_NAME)
        print(f"[*] Cleared previous collection '{config.COLLECTION_NAME}' for fresh ingestion.")
    except Exception:
        pass

    vector_store = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=config.CHROMA_PATH,
        collection_name=config.COLLECTION_NAME,
        collection_metadata={"hnsw:space": "cosine"}
    )

    elapsed_time = time.perf_counter() - start_time
    print(f"\n[SUCCESS] Document ingestion completed in {elapsed_time:.2f} seconds!")
    print(f"[*] Chunks indexed in collection '{config.COLLECTION_NAME}' inside '{config.CHROMA_PATH}'.")
    return vector_store

if __name__ == "__main__":
    target_pdf = sys.argv[1] if len(sys.argv) > 1 else config.DEFAULT_PDF_PATH
    ingest_pdf(target_pdf)
