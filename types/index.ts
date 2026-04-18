export interface PDFPage {
  pageNumber: number;
  content: string;
  embedding?: number[];
}

export interface PDFDocument {
  id: string;
  name: string;
  pages: PDFPage[];
  embedding?: number[];
}

export interface SearchResult {
  pageNumber: number;
  documentName: string;
  content: string;
  similarity: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: {
    pageNumber: number;
    documentName: string;
  }[];
}

export interface UploadedFile {
  id: string;
  name: string;
  pages: PDFPage[];
}