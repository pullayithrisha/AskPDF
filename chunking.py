import os
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
load=PyPDFLoader("C:\\Users\\pulla\\Desktop\\projects\\AskPDF\\sample.pdf")
docs=load.load()
text_splitter=RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=100,
    separators=["\n\n", "\n", " ", ""]
)
chunks=text_splitter.split_documents(docs)
print("pdf length",len(docs))
print("chunks len:",len(chunks))
print("1st chunk",chunks[0].page_content)