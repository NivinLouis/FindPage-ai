# FindPage.ai 📚

FindPage.ai is a study assistant built for one job: help you quickly find the exact pages where a topic is mentioned in your PDFs, so you can verify, copy, and paste into your notes with confidence.

Live: `https://findpage-ai.vercel.app`

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Gemini AI](https://img.shields.io/badge/Gemini AI-3.0+-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-blue)

---

## Why It Exists

In an era of AI hallucinations, **trust is everything**. FindPage.ai helps you bridge the gap between AI outputs and your actual study material by always showing the most relevant source pages.

- **Don't just believe the AI**: FindPage.ai points you to the **exact page numbers** in your source material.
- **Save Hours**: Instantly "riffle" through hundreds of pages of textbooks or lecture notes to find a specific concept.
- **Study with Context**: Seeing the answer in the original PDF gives you the surrounding context needed for true understanding and exam preparation.

---

## Key Features

- **🎯 Page referencing**: Quickly narrow down the pages that mention your topic.
- **📦 Batch Processing**: Have a list of 20 questions for an assignment? Drop them in and let the AI find the page references for all of them at once.
- **📸 Source previews**: Preview the actual page image and copy/download it for your notes.
- **🔒 Privacy-first**: Your PDFs stay in your browser session (no cloud storage).

---

## Getting Started

### 1. Prerequisites
- **Node.js 20+**
- **Google Gemini API Key** (Get one at `https://aistudio.google.com/app/apikey`)

### 2. Quick Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/findpage-ai.git
cd findpage-ai

# Install dependencies
npm install

# Run the dev server
npm run dev
```

### 3. Open your browser
Navigate to `http://localhost:3000` and start uploading your textbooks!

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| **Core** | Next.js 16 (App Router) |
| **Logic** | TypeScript |
| **Styling** | Vanilla CSS + Tailwind (Apple-inspired Design System) |
| **AI Engine**| Google Gemini (Embeddings + Flash Model) |
| **Parsing** | pdfjs-dist |

---

## How To Use

1. **Upload**: Drag & drop your teacher's PDF or your textbook.
2. **Index**: Wait a few seconds for FindPage.ai to semantically index the text.
3. **Ask**: Type your assignment question.
4. **Verify**: Click the generated page numbers to view the source text and confirm the answer.
5. **Copy**: Use the copy button to grab the reference for your citations.

## Deploying To Vercel

1. Push this repo to GitHub.
2. Import the project into Vercel.
3. Set `NEXT_PUBLIC_SITE_URL` to `https://findpage-ai.vercel.app` (or your custom domain).
4. (Optional) If you want a shared server-side key instead of user-provided keys, set `GEMINI_API_KEY`.
5. Deploy.

---

## 🤝 Contributing

This tool was created to help students level up their studying game. If you have ideas for features (like OCR for handwritten notes!), feel free to open a PR!

## 📄 License

MIT License - Built with ❤️ for students everywhere.
