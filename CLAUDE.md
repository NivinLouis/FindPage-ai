# FindPage.ai Maintenance Guide

## 🎯 Purpose
A student-centric PDF QA tool focused on **source verification**. Always prioritize pointing the user to exact page numbers in their provided documents.

## 🛠 Tech Stack
- **Framework**: Next.js 14 (App Router)
- **AI**: Gemini 2.0 Flash (via `@google/generative-ai`)
- **PDF Parsing**: `pdfjs-dist` (running in a worker)
- **Styling**: Apple-inspired Vanilla CSS / Tailwind components

## 🏗 Key Components
- `AppClient.tsx`: The main monolithic state manager and UI.
- `gemini.ts`: AI logic, embedding generation, and retry logic.
- `PDFUploader.tsx`: Client-side PDF parsing and image extraction.

## 🚀 Development Commands
- `npm run dev`: Start development server.
- `npm run build`: Production build.
- `npm run lint`: Run ESLint.

## 💡 Implementation Notes
- **Embeddings**: Uses `gemini-embedding-001`.
- **Search**: Uses Cosine Similarity for semantic retrieval.
- **Privacy**: All PDFs and embeddings are stored in memory/session. Nothing is persisted on the server.
- **RAG Prompt**: The system prompt in `gemini.ts` is explicitly told to return JSON page numbers to ensure the UI can link back to sources.

## 🎨 Design Rules
(See `DESIGN.md` for full spec)
- Use **Apple Blue** (`#0071e3`) for interaction only.
- Maintain cinematic whitespace.
- Support Dark/Light themes via CSS variables.
