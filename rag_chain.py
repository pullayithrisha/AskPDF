import os
import time
import warnings
from typing import Dict, Any, List
from dotenv import load_dotenv

import logging
# Suppress deprecation and minor API notices for clean CLI output
warnings.filterwarnings("ignore")
logging.getLogger("google.genai").setLevel(logging.ERROR)
try:
    from google.genai import models as genai_models
    genai_models.Models._logged_afc_warning = True
except Exception:
    pass

from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_chroma import Chroma
from langchain_core.prompts import PromptTemplate
from langchain_core.documents import Document

import config

load_dotenv()

def is_summary_query(query: str) -> bool:
    """Helper to detect if user query is requesting a document summary."""
    q_clean = query.lower().strip()
    keywords = [
        "summary", "summarize", "overview", "main points", "key takeaways",
        "brief summary", "document summary", "synopsis", "tldr", "tl;dr",
        "what is this document about", "what is this pdf about", "abstract"
    ]
    return any(kw in q_clean for kw in keywords)


# Prompt Template for Full Document Summaries
SUMMARY_SYSTEM_PROMPT = """You are AskDoc, an expert document AI assistant.
Your task is to provide a comprehensive, clear, and perfectly structured summary of the uploaded document based ONLY on the full document context provided below.

CRITICAL INLINE CITATION RULE:
Every section, bullet point, or statement MUST include its page reference inline directly next to the content using the format `(pg.no. X)` or `(pg.no. X, Y)`.
Example:
- **Feedforward Neural Networks (FNNs):** Structure, information flow, and layers (pg.no. 1).
- **Backpropagation:** Minimizes the cost function through weight adjustments (pg.no. 1, 2).
Do NOT group all page numbers at the end of the text. Place `(pg.no. X)` directly next to each relevant topic or statement!

INSTRUCTIONS FOR THE SUMMARY STRUCTURE:
1. Executive Overview: Provide a clear 2-3 sentence overview of the document with inline page citations.
2. Key Concepts & Core Topics: Bullet points listing main topics/algorithms with inline page citations `(pg.no. X)`.
3. Important Details & Highlights: Detailed technical highlights with inline page citations `(pg.no. X)`.
4. Summary Conclusion: Brief conclusion with inline page citations.

CRITICAL RULE:
Strictly ground your summary in the provided document text below. Do NOT hallucinate, extrapolate, or bring in outside knowledge not present in the text.

Document Context:
{context}

User Request:
{question}

Summary:"""


# Strict anti-hallucination prompt template for Q&A
STRICT_SYSTEM_PROMPT = """You are AskDoc, an intelligent document AI assistant.
Your job is to answer the user's question accurately based ONLY on the provided document context below.

CRITICAL INLINE CITATION RULE:
Include inline page references directly next to each statement or fact using `(pg.no. X)`. Example: "Backpropagation computes gradients using the chain rule (pg.no. 2)."
Do NOT put citations at the end. Place them directly next to the relevant text!

CRITICAL INSTRUCTIONS:
1. Answer strictly using only the factual information directly stated in the Context section below.
2. If the question cannot be answered directly from the provided context, state clearly and politely: "I don't have information about that in the uploaded document."
3. Do NOT invent, assume, extrapolate, or use external knowledge outside of the document context.
4. Keep your response concise, accurate, well-formatted, and direct.

Context:
{context}

Question:
{question}

Answer:"""


class AskDocRAG:
    """
    RAG Pipeline synthesizer loading existing ChromaDB vector store
    and running generation using Gemini 2.5 Flash.
    """
    def __init__(self):
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("[ERROR] GOOGLE_API_KEY environment variable is not set. Please set it in your .env file.")

        if not os.path.exists(config.CHROMA_PATH):
            raise FileNotFoundError(
                f"[ERROR] Vector database directory '{config.CHROMA_PATH}' does not exist. "
                f"Please run 'python ingest.py' first to build the vector index."
            )

        # Initialize Embeddings & Vector Store
        self.embeddings = GoogleGenerativeAIEmbeddings(model=config.EMBEDDING_MODEL)
        self.vector_store = Chroma(
            persist_directory=config.CHROMA_PATH,
            embedding_function=self.embeddings,
            collection_name=config.COLLECTION_NAME,
            collection_metadata={"hnsw:space": "cosine"}
        )

        # Cosine Similarity Retriever (k=6 for rich context retrieval)
        self.retriever = self.vector_store.as_retriever(
            search_type="similarity",
            search_kwargs={"k": 6}
        )

        # Gemini LLM Initialization
        self.llm = ChatGoogleGenerativeAI(
            model=config.LLM_MODEL,
            temperature=0.0
        )

        self.qa_prompt = PromptTemplate.from_template(STRICT_SYSTEM_PROMPT)
        self.summary_prompt = PromptTemplate.from_template(SUMMARY_SYSTEM_PROMPT)

    def query(self, question: str) -> Dict[str, Any]:
        """
        Executes a query against the document. Automatically uses full document context
        for summary requests, and top-k vector retrieval for specific Q&A questions.
        """
        start_total = time.perf_counter()
        summary_mode = is_summary_query(question)

        start_retrieval = time.perf_counter()
        if summary_mode:
            # For summary, retrieve all chunks in the collection for a complete view
            res = self.vector_store.get()
            raw_docs = res.get("documents", [])
            metadatas = res.get("metadatas", [])
            retrieved_docs: List[Document] = [
                Document(page_content=doc_str, metadata=meta or {})
                for doc_str, meta in zip(raw_docs, metadatas)
            ]
            # Cap at 80 chunks if extremely large (~40,000 characters) to ensure swift execution
            retrieved_docs = retrieved_docs[:80]
        else:
            retrieved_docs: List[Document] = self.retriever.invoke(question)

        retrieval_time_ms = (time.perf_counter() - start_retrieval) * 1000.0

        # Format context from retrieved document chunks with explicit [Page X] tags
        context_blocks = []
        for doc in retrieved_docs:
            page_num = doc.metadata.get("page", 0) + 1
            context_blocks.append(f"[Page {page_num}]:\n{doc.page_content}")
        context_str = "\n\n---\n\n".join(context_blocks)

        # LLM synthesis & generation timing with automatic 429 Rate Limit retry
        start_gen = time.perf_counter()
        active_prompt = self.summary_prompt if summary_mode else self.qa_prompt
        formatted_prompt = active_prompt.format(context=context_str, question=question)

        max_retries = 5
        response = None
        for attempt in range(max_retries):
            try:
                response = self.llm.invoke(formatted_prompt)
                break
            except Exception as e:
                if ("429" in str(e) or "RESOURCE_EXHAUSTED" in str(e) or "Quota" in str(e)) and attempt < max_retries - 1:
                    wait_sec = (attempt + 1) * 4
                    print(f"[*] Rate limit encountered, retrying in {wait_sec} seconds...")
                    time.sleep(wait_sec)
                    continue
                raise e

        generation_time_ms = (time.perf_counter() - start_gen) * 1000.0

        total_time_ms = (time.perf_counter() - start_total) * 1000.0

        return {
            "answer": response.content.strip() if response else "No response generated.",
            "source_documents": retrieved_docs[:4] if summary_mode else retrieved_docs,
            "retrieval_time_ms": retrieval_time_ms,
            "generation_time_ms": generation_time_ms,
            "total_time_ms": total_time_ms
        }

