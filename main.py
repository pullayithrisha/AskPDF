import os
import sys
import config

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from rag_chain import AskDocRAG

def print_banner():
    banner = f"""
====================================================================
               AskDoc - Production RAG Pipeline                     
    Stack: LangChain | {config.LLM_MODEL} | ChromaDB | PyPDF          
====================================================================
  Commands:
    - Type any question and press Enter to query your document.
    - Type 'ingest' to process/re-index the document.
    - Type 'exit' or 'quit' to close.
====================================================================
"""
    print(banner)

def main():
    print_banner()

    # Check vector database existence
    if not os.path.exists(config.CHROMA_PATH):
        print(f"[!] Vector database not found at '{config.CHROMA_PATH}'.")
        print(f"[*] Running document ingestion first...")
        from ingest import ingest_pdf
        if os.path.exists(config.DEFAULT_PDF_PATH):
            ingest_pdf(config.DEFAULT_PDF_PATH)
        else:
            print(f"[ERROR] Sample PDF not found at '{config.DEFAULT_PDF_PATH}'. Please run 'python ingest.py <path_to_pdf>'.")
            sys.exit(1)

    print("[*] Initializing AskDoc RAG engine...")
    try:
        rag = AskDocRAG()
        print("[SUCCESS] RAG Pipeline ready!\n")
    except Exception as e:
        print(f"[ERROR] Failed to initialize RAG pipeline: {e}")
        sys.exit(1)

    while True:
        try:
            query_str = input("\nAskDoc > ").strip()
            if not query_str:
                continue

            if query_str.lower() in ["exit", "quit"]:
                print("Goodbye!")
                break

            if query_str.lower() == "ingest":
                pdf_input = input("Enter PDF path (press Enter for default sample.pdf): ").strip()
                target = pdf_input if pdf_input else config.DEFAULT_PDF_PATH
                from ingest import ingest_pdf
                ingest_pdf(target)
                rag = AskDocRAG()
                continue

            print("\n[*] Retrieving context & synthesizing response...")
            result = rag.query(query_str)

            # Display Answer
            print("\n" + "=" * 60)
            print(" ANSWER:")
            print("=" * 60)
            print(result["answer"])

            # Display Performance Timing Metrics
            ret_ms = result["retrieval_time_ms"]
            gen_ms = result["generation_time_ms"]
            total_ms = result["total_time_ms"]

            sub_500_badge = " [FAST: SUB-500MS TARGET ACHIEVED]" if ret_ms < 500 else ""
            print("\n" + "-" * 60)
            print(f" PERFORMANCE METRICS:")
            print(f"  • Vector Retrieval Time (Cosine Similarity): {ret_ms:.2f} ms{sub_500_badge}")
            print(f"  • LLM Generation Time ({config.LLM_MODEL})  : {gen_ms / 1000.0:.2f} s ({gen_ms:.0f} ms)")
            print(f"  • Total Turnaround Latency                 : {total_ms / 1000.0:.2f} s ({total_ms:.0f} ms)")
            print("-" * 60)

            # Display Source Context Chunks
            print("\n" + "-" * 60)
            print(f" RETRIEVED SOURCE CHUNKS ({len(result['source_documents'])} chunks used):")
            print("-" * 60)
            for idx, doc in enumerate(result["source_documents"], 1):
                page_num = doc.metadata.get("page", "Unknown")
                source_file = doc.metadata.get("source", "PDF")
                snippet = doc.page_content.replace("\n", " ").strip()
                if len(snippet) > 200:
                    snippet = snippet[:200] + "..."
                print(f" Chunk #{idx} | Page: {page_num} | Source: {os.path.basename(source_file)}")
                print(f"   \"{snippet}\"\n")

        except (KeyboardInterrupt, EOFError):
            print("\nSession ended. Goodbye!")
            break
        except Exception as e:
            print(f"\n[ERROR] An error occurred while processing query: {e}")

if __name__ == "__main__":
    main()
