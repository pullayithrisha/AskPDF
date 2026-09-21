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
    """Helper to detect if user query is requesting a document summary or key takeaways."""
    q_clean = query.lower().strip()
    keywords = [
        "summary", "summarize", "summarise", "overview", "main points", "key takeaways",
        "takeaway", "takeaways", "keytaj ways", "keytajways", "brief summary",
        "document summary", "synopsis", "tldr", "tl;dr", "highlights", "recap",
        "breakdown", "core topics", "gist", "what is this document about",
        "what is this pdf about", "abstract", "bullet points", "key points"
    ]
    if any(kw in q_clean for kw in keywords):
        return True
    if "key" in q_clean and ("point" in q_clean or "takeaway" in q_clean or "aspect" in q_clean):
        return True
    return False


# Prompt Template for Full Document Summaries & Key Takeaways
SUMMARY_SYSTEM_PROMPT = """You are AskDoc, an expert document AI assistant.
Your task is to provide a comprehensive, detailed, and complete summary or key takeaways of the uploaded document based ONLY on the document context provided below.

CRITICAL COMPLETENESS RULES:
1. DO NOT SKIP ANY KEY INFORMATION (ABSOLUTE RULE):
   - You MUST thoroughly extract and cover ALL major sections, entities, topics, facts, and key takeaways present in the document.
   - Regardless of the document type (financial, legal, medical, technical, resumes, research, narratives, etc.), you must extract the core essence without leaving anything out.
   - For structured documents (contracts, policies, reports), ensure all major clauses, metrics, findings, and conclusions are captured.
   - If the user asks for a summary or key takeaways, provide a VERY DETAILED response. Do not provide a high-level gloss-over. List every single point and synthesize completely.
2. ACCURACY & CHRONOLOGY:
   - Correctly distinguish current status vs past history, or active vs expired terms.
   - Keep dates, metrics, percentages, names, and facts exactly as stated in the document.
3. INLINE CITATION RULE:
   - Include inline page references using `(pg.no. X)` directly next to each section or bullet point. Example: "(pg.no. 1)".

Document Context:
{context}

User Request:
{question}

Detailed Summary / Key Takeaways:"""


# Strict anti-hallucination & chronological accuracy prompt for Q&A
STRICT_SYSTEM_PROMPT = """You are AskDoc, an intelligent and extremely accurate document AI assistant.
Your job is to answer the user's question with 100% factual correctness based ONLY on the provided document context below.

CRITICAL RULES FOR ACCURACY & TIMELINES:
1. TEMPORAL & CHRONOLOGICAL AWARENESS (CRITICAL):
   - You MUST carefully inspect ALL dates, years, timelines, and status words (e.g., "Present", "Active", "Ongoing", "Expired", "Current") across the ENTIRE document before answering.
   - When answering questions about "current", "latest", or "present" information (whether it's the latest financial quarter, active contract clause, most recent employer, or ongoing project):
     * Look at all listed timelines related to the entity.
     * Compare the dates/years. The one with the highest end date/year or a word like "Present/Ongoing" is the current one.
     * NEVER confuse past/completed/expired items with current/active ones.
2. FACTUAL GROUNDING:
   - Answer directly and factually using the exact names, institutions, metrics, and dates from the text.
   - Do NOT guess, assume, or invent details.
   - If the question cannot be answered from the provided context, state: "I don't have information about that in the uploaded document."
3. INLINE CITATION RULE:
   - Include inline page references using `(pg.no. X)` directly next to each fact. Example: "The current project phase is Alpha (pg.no. 1)."

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

        # Cosine Similarity Retriever (k=8 for deep context retrieval)
        self.retriever = self.vector_store.as_retriever(
            search_type="similarity",
            search_kwargs={"k": 8}
        )

        # Gemini LLM Initialization
        self.llm = ChatGoogleGenerativeAI(
            model=config.LLM_MODEL,
            temperature=0.0
        )

        self.qa_prompt = PromptTemplate.from_template(STRICT_SYSTEM_PROMPT)
        self.summary_prompt = PromptTemplate.from_template(SUMMARY_SYSTEM_PROMPT)

    def get_all_chunks_ordered(self) -> List[Document]:
        """Retrieves all chunks from the vector store sorted by page and chunk index."""
        res = self.vector_store.get()
        raw_docs = res.get("documents", [])
        metadatas = res.get("metadatas", [])
        docs = [
            Document(page_content=doc_str, metadata=meta or {})
            for doc_str, meta in zip(raw_docs, metadatas)
        ]
        docs.sort(key=lambda d: (d.metadata.get("page", 0), d.metadata.get("chunk_index", 0)))
        return docs

    def query(self, question: str) -> Dict[str, Any]:
        """
        Executes a query against the document. Automatically uses full document context
        for documents <= 40 chunks and summary requests, and sorted top-k vector retrieval
        for larger documents.
        """
        start_total = time.perf_counter()
        summary_mode = is_summary_query(question)

        total_chunks = 0
        try:
            total_chunks = self.vector_store._collection.count()
        except Exception:
            total_chunks = 0

        start_retrieval = time.perf_counter()

        # Strictly enforce LangChain RAG vector retrieval for EVERY query.
        raw_retrieved = self.retriever.invoke(question)
        retrieved_docs = sorted(raw_retrieved, key=lambda d: (d.metadata.get("page", 0), d.metadata.get("chunk_index", 0)))

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

