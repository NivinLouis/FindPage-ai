'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import PDFUploader from '@/components/PDFUploader';

interface DocumentChunk {
  text: string;
  pageNumber: number;
  documentName: string;
  embedding: number[];
  image?: string;
}

interface Source {
  pageNumber: number;
  documentName: string;
  similarity: number;
  image?: string;
}

interface ChatHistoryItem {
  question: string;
  answer: { text: string; sources: Source[] };
  timestamp: Date;
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="glass-button px-2 sm:px-3 py-2 text-sm text-[color:var(--fg)] hover:border-white/30"
    >
      {children}
    </button>
  );
}

function ModalShell({
  title,
  onClose,
  children,
  widthClassName,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  widthClassName?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onMouseDown={onClose}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className={`relative w-full ${widthClassName ?? 'max-w-lg'} glass glass-radius p-5`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold tracking-tight">{title}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="glass-button px-3 py-2 text-sm text-[color:var(--muted)] hover:text-[color:var(--fg)]"
          >
            Close
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function formatCount(n: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n);
}

function IconSpinner({ className }: { className?: string }) {
  return (
    <svg className={className ?? 'h-4 w-4'} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCopy({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? 'h-4 w-4'}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconDownload({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? 'h-4 w-4'}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}

function parsePageNumbers(text: string): number[] | null {
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return null;
    const nums = parsed.filter((v) => Number.isFinite(v)).map((v) => Number(v));
    if (nums.length === 0) return [];
    return nums;
  } catch {
    return null;
  }
}

export default function AppClient() {
  const [documents, setDocuments] = useState<
    { name: string; pages: { pageNumber: number; content: string; image?: string }[] }[]
  >([]);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<{ text: string; sources: Source[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [embedLoading, setEmbedLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  // Important: keep initial render deterministic to avoid hydration mismatch.
  // Persisted values are loaded after mount.
  const [hydrated, setHydrated] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [sourcesCount, setSourcesCount] = useState(5);
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showDocBrowser, setShowDocBrowser] = useState(false);
  const [batchQuestions, setBatchQuestions] = useState('');
  const [batchMode, setBatchMode] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [usage, setUsage] = useState({
    pagesIndexed: 0,
    questionsAsked: 0,
    charactersProcessed: 0,
  });
  const openUploaderRef = useRef<(() => void) | null>(null);
  const promptedForApiKeyRef = useRef(false);

  const headerForRequests = useMemo(() => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const key = apiKey.trim();
    if (key) headers['x-api-key'] = key;
    return headers;
  }, [apiKey]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  const trackUsage = useCallback((pages: number, chars: number) => {
    setUsage((prev) => ({
      pagesIndexed: prev.pagesIndexed + pages,
      questionsAsked: prev.questionsAsked + 1,
      charactersProcessed: prev.charactersProcessed + chars,
    }));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);

    // Load persisted settings (client-only).
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true' || savedDarkMode === 'false') {
      setDarkMode(savedDarkMode === 'true');
    }

    const savedApiKey = localStorage.getItem('apiKey');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }

    const savedHistory = localStorage.getItem('chatHistory');
    if (savedHistory) {
      try {
        setChatHistory(JSON.parse(savedHistory));
      } catch {
        // ignore malformed localStorage
      }
    }

    const hasVisited = localStorage.getItem('hasVisited');
    if (hasVisited) {
      setShowLanding(false);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem('darkMode', String(darkMode));
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode, hydrated]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;

      if (e.key === 'k') {
        e.preventDefault();
        setShowSettings(true);
      } else if (e.key === 'd') {
        e.preventDefault();
        setDarkMode((v) => !v);
      } else if (e.key === 'h') {
        e.preventDefault();
        setShowHistory((v) => !v);
      } else if (e.key === 'b') {
        e.preventDefault();
        setShowDocBrowser((v) => !v);
      } else if (e.key === 'l') {
        e.preventDefault();
        setShowLanding(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const saveChatHistory = useCallback((q: string, a: { text: string; sources: Source[] }) => {
    const newItem: ChatHistoryItem = { question: q, answer: a, timestamp: new Date() };
    setChatHistory((prev) => {
      const updated = [newItem, ...prev].slice(0, 50);
      localStorage.setItem('chatHistory', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearChatHistory = useCallback(() => {
    setChatHistory([]);
    localStorage.removeItem('chatHistory');
  }, []);

  const clearWorkspace = useCallback(() => {
    setDocuments([]);
    setChunks([]);
    setAnswer(null);
    setQuestion('');
    setBatchQuestions('');
    setBatchMode(false);
    setExpandedImage(null);
    setShowLanding(true);
    setToast('Cleared.');
  }, []);

  const handleSaveApiKey = useCallback(() => {
    localStorage.setItem('apiKey', apiKey);
    setToast('Saved.');
    setShowSettings(false);
  }, [apiKey]);

  const handleStart = useCallback(() => {
    setShowLanding(false);
    localStorage.setItem('hasVisited', 'true');
  }, []);

  const handleUploadComplete = useCallback(
    async (pages: { pageNumber: number; content: string; image?: string }[], fileName: string) => {
      const newDoc = { name: fileName, pages };
      setDocuments((prev) => [...prev, newDoc]);
      setShowLanding(false);

      setEmbedLoading(true);
      try {
        const textChunks = pages.map((page) => ({
          text: page.content,
          pageNumber: page.pageNumber,
          documentName: fileName,
          image: page.image,
        }));

        const response = await fetch('/api/embed', {
          method: 'POST',
          headers: headerForRequests,
          body: JSON.stringify({ chunks: textChunks }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Failed to process document');
          return;
        }

        if (data.chunks) setChunks((prev) => [...prev, ...data.chunks]);
        if (data.usage) trackUsage(data.usage.pagesIndexed || 0, data.usage.pagesText || 0);
      } catch (err) {
        console.error('Failed to embed document:', err);
        setError('Failed to index PDF.');
      } finally {
        setEmbedLoading(false);
      }
    },
    [headerForRequests, trackUsage]
  );

  const handleAskQuestion = useCallback(
    async (q?: string) => {
      const currentQuestion = (q ?? question).trim();
      if (!currentQuestion || chunks.length === 0) return;

      setLoading(true);
      setAnswer(null);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: headerForRequests,
          body: JSON.stringify({ question: currentQuestion, chunks, sourcesCount }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Failed to get answer');
          return;
        }

        if (data.answer) {
          const answerData = { text: data.answer, sources: data.sources ?? [] };
          setAnswer(answerData);
          saveChatHistory(currentQuestion, answerData);
          setToast('Answer ready.');
        }

        if (data.usage) trackUsage(0, data.usage.charactersProcessed || 0);
      } catch (err) {
        console.error('Failed to get answer:', err);
        setError('Failed to get answer.');
      } finally {
        setLoading(false);
      }
    },
    [chunks, headerForRequests, question, saveChatHistory, sourcesCount, trackUsage]
  );

  const handleBatchQuestions = useCallback(async () => {
    const questions = batchQuestions
      .split('\n')
      .map((q) => q.trim())
      .filter(Boolean);
    if (questions.length === 0 || chunks.length === 0) return;

    setLoading(true);
    setBatchMode(false);

    try {
      for (const q of questions) {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: headerForRequests,
          body: JSON.stringify({ question: q, chunks, sourcesCount }),
        });
        const data = await response.json();
        if (data.answer) {
          const answerData = { text: data.answer, sources: data.sources ?? [] };
          saveChatHistory(q, answerData);
        }
      }
      setBatchQuestions('');
      setToast('Batch complete.');
    } catch (err) {
      console.error('Failed to get batch answers:', err);
      setError('Batch failed.');
    } finally {
      setLoading(false);
    }
  }, [batchQuestions, chunks, headerForRequests, saveChatHistory, sourcesCount]);

  const answerPages = useMemo(() => (answer ? parsePageNumbers(answer.text) : null), [answer]);

  const copyToClipboard = useCallback(async () => {
    if (!answer?.text) return;
    const payload = answerPages ? answerPages.join(', ') : answer.text;
    await navigator.clipboard.writeText(payload);
    setCopied(true);
    setToast('Copied.');
    setTimeout(() => setCopied(false), 1400);
  }, [answer, answerPages]);

  const usageText = useMemo(() => {
    const pages = usage.pagesIndexed;
    const qna = usage.questionsAsked;
    const chars = usage.charactersProcessed;
    return `${formatCount(pages)} pages · ${formatCount(qna)} asks · ${formatCount(chars / 1000)}k chars`;
  }, [usage.charactersProcessed, usage.pagesIndexed, usage.questionsAsked]);

  const hasDocs = documents.length > 0;
  const landingMode = !hasDocs && showLanding;

  const scrollToUpload = useCallback(() => {
    document.getElementById('upload-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (showLanding) return;
    if (apiKey.trim()) return;
    if (promptedForApiKeyRef.current) return;
    setShowSettings(true);
    setToast('Add your API key to continue.');
    promptedForApiKeyRef.current = true;
  }, [apiKey, hydrated, showLanding]);

  const triggerUpload = useCallback(() => {
    if (!apiKey.trim()) {
      setShowSettings(true);
      setToast('Add your API key to upload PDFs.');
      promptedForApiKeyRef.current = true;
      return;
    }
    if (openUploaderRef.current) {
      openUploaderRef.current();
      return;
    }
    scrollToUpload();
  }, [apiKey, scrollToUpload]);

  const handleOpenReady = useCallback((openFn: () => void) => {
    openUploaderRef.current = openFn;
  }, []);

  return (
    <div className="min-h-dvh relative">
      <div className="pointer-events-none absolute inset-0 hero-grid opacity-[0.08]" />

      <header className="sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="glass-chrome glass-radius px-4 py-3 flex items-center justify-between gap-3">
            <Link href="/" className="text-sm font-semibold tracking-tight" title="Home">
              FindPage.ai
            </Link>

            <div className="hidden md:flex items-center gap-2 text-xs text-[color:var(--muted)]">
              {!landingMode && <span className="glass-button px-3 py-2">{usageText}</span>}
              {embedLoading && <span className="glass-button px-3 py-2">Indexing…</span>}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={triggerUpload}
                className="glass-strong glass-radius px-3 sm:px-4 py-2 text-sm font-semibold"
                style={{
                  boxShadow:
                    '0 18px 55px rgba(6, 182, 212, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.45)',
                }}
                title="Upload PDFs"
              >
                Upload
              </button>
              <div className="hidden sm:block">
                <IconButton label="History (Ctrl/⌘ H)" onClick={() => setShowHistory((v) => !v)}>
                  <span className="text-[color:var(--muted)]">History</span>
                </IconButton>
              </div>
              <div className="hidden sm:block">
                <IconButton label="Documents (Ctrl/⌘ B)" onClick={() => setShowDocBrowser((v) => !v)}>
                  <span className="text-[color:var(--muted)]">Docs</span>
                </IconButton>
              </div>
              <IconButton label="Settings (Ctrl/⌘ K)" onClick={() => setShowSettings(true)}>
                <span className="text-[color:var(--muted)]">Settings</span>
              </IconButton>
              <IconButton label="Toggle theme (Ctrl/⌘ D)" onClick={() => setDarkMode((v) => !v)}>
                <span className="text-[color:var(--muted)]">{darkMode ? 'Light' : 'Dark'}</span>
              </IconButton>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-10">
        {error && (
          <div className="mb-5 glass glass-radius px-4 py-3 flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[color:var(--danger)]">Something went wrong</div>
              <div className="text-sm text-[color:var(--muted)]">{error}</div>
            </div>
            <button
              type="button"
              className="glass-button px-3 py-2 text-sm text-[color:var(--muted)]"
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {landingMode ? (
          <section
            className="glass glass-radius p-6 md:p-8"
            style={{ minHeight: 'calc(100dvh - 120px)' }}
          >
            {/* Visually hidden but crawlable SEO content */}
            <div className="sr-only">
              <h2>About FindPage.ai</h2>
              <p>
                FindPage.ai is a premium AI study tool designed for students. It allows users to upload PDF textbooks and study materials to semantically search for answers. Unlike other AI tools, FindPage.ai provides source-verified page references, ensuring that students can double-check every answer against their original study documents.
              </p>
              <h3>Core Features</h3>
              <ul>
                <li>PDF Semantic Search</li>
                <li>Exact Page References</li>
                <li>Handwritten Note Support (OCR planned)</li>
                <li>Batch Assignment Answering</li>
                <li>Privacy-firt Session-based analysis</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <article className="lg:col-span-7 order-last lg:order-first animate-fade-in-up">
                <div className="text-xs font-semibold text-[color:var(--faint)]">Welcome</div>
                <h1 className="mt-3 text-3xl sm:text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
                  Study with confidence.
                  <span className="block text-[color:var(--muted)]">Find exact page numbers from your documents with AI</span>
                </h1>
                <p className="mt-4 max-w-2xl text-base md:text-lg text-[color:var(--muted)]">
                  FindPage.ai helps you bridge the gap between AI answers and your study materials. Ask a question,
                  jump to the <strong>exact page reference</strong>, and verify every answer against your teacher&apos;s PDFs.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      handleStart();
                      triggerUpload();
                    }}
                    className="glass-strong glass-radius px-5 py-3 text-sm font-semibold"
                    style={{
                      boxShadow:
                        '0 18px 55px rgba(6, 182, 212, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.45)',
                    }}
                  >
                    Start by uploading
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBatchMode(true);
                      handleStart();
                    }}
                    className="glass-button px-4 py-3 text-sm text-[color:var(--muted)] hover:text-[color:var(--fg)]"
                  >
                    Use batch mode
                  </button>
                </div>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="glass-border glass-radius p-4">
                    <div className="text-xs font-semibold text-[color:var(--faint)]">1. Upload PDFs</div>
                    <div className="mt-2 text-sm text-[color:var(--muted)]">We index every page.</div>
                  </div>
                  <div className="glass-border glass-radius p-4">
                    <div className="text-xs font-semibold text-[color:var(--faint)]">2. Ask a topic</div>
                    <div className="mt-2 text-sm text-[color:var(--muted)]">Single or batch questions.</div>
                  </div>
                  <div className="glass-border glass-radius p-4">
                    <div className="text-xs font-semibold text-[color:var(--faint)]">3. Copy & paste</div>
                    <div className="mt-2 text-sm text-[color:var(--muted)] underline decoration-cyan-500/30 underline-offset-4">Copy page previews directly into your study notes.</div>
                  </div>
                </div>

                <div className="mt-6 glass-border glass-radius p-4">
                  <div className="text-xs font-semibold text-[color:var(--faint)]">Why FindPage.ai?</div>
                  <div className="mt-2 text-sm text-[color:var(--muted)]">
                    Created for exam revision and complex assignments. We provide <strong>exact page numbers</strong> so you never have to blindly trust an AI&apos;s output.
                  </div>
                </div>
              </article>

              <div className="lg:col-span-5 order-first lg:order-last animate-fade-in-up delay-200">
                <div id="upload-card" className="glass-strong glass-radius p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold tracking-tight">Upload PDFs</div>
                      <div className="mt-1 text-sm text-[color:var(--muted)]">
                        Drag, drop, or click to browse.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDarkMode((v) => !v)}
                      className="glass-button px-3 py-2 text-sm text-[color:var(--muted)] hover:text-[color:var(--fg)]"
                      title="Toggle theme"
                    >
                      {darkMode ? 'Light' : 'Dark'}
                    </button>
                  </div>

                  <div className="mt-4">
                    <PDFUploader
                      onUploadComplete={handleUploadComplete}
                      onOpenReady={handleOpenReady}
                    />
                    {embedLoading && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-[color:var(--muted)] animate-fade-in">
                        <span className="animate-spin">
                          <IconSpinner className="h-4 w-4" />
                        </span>
                        Indexing pages…
                      </div>
                    )}
                  </div>

                  {!apiKey.trim() && (
                    <div className="mt-4 glass-border glass-radius p-4 animate-fade-in">
                      <div className="text-xs font-semibold text-[color:var(--faint)]">Before you start</div>
                      <div className="mt-2 text-sm text-[color:var(--muted)]">
                        FindPage.ai uses Gemini. When you press Upload, we’ll ask for your API key once.
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowSettings(true)}
                          className="glass-strong glass-radius px-4 py-2 text-sm font-semibold"
                          style={{
                            boxShadow:
                              '0 18px 55px rgba(6, 182, 212, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.45)',
                          }}
                        >
                          Add key now
                        </button>
                        <a
                          className="glass-button px-4 py-2 text-sm text-[color:var(--muted)] hover:text-[color:var(--fg)]"
                          href="https://aistudio.google.com/app/apikey"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Get a key
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="glass-button px-3 py-2 text-xs text-[color:var(--muted)]">Faster revision</span>
                    <span className="glass-button px-3 py-2 text-xs text-[color:var(--muted)]">Page previews</span>
                    <span className="glass-button px-3 py-2 text-xs text-[color:var(--muted)]">Copy to notes</span>
                  </div>

                  <div className="mt-5 glass-border glass-radius p-4 text-sm text-[color:var(--muted)]">
                    Shortcuts: Ctrl/⌘ K (settings), Ctrl/⌘ D (theme), Ctrl/⌘ H (history), Ctrl/⌘ B (docs).
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <aside className="lg:col-span-4">
              <div className="glass glass-radius p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold tracking-tight">Workspace</div>
                    <div className="mt-1 text-sm text-[color:var(--muted)]">
                      Upload PDFs, then ask questions with sources.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearWorkspace}
                    className="glass-button px-3 py-2 text-sm text-[color:var(--muted)] hover:text-[color:var(--fg)]"
                  >
                    Clear
                  </button>
                </div>

                <div className="mt-4">
                  <div id="upload-card">
                    <PDFUploader
                      onUploadComplete={handleUploadComplete}
                      onOpenReady={handleOpenReady}
                    />
                  </div>
                  {embedLoading && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-[color:var(--muted)] animate-fade-in">
                      <span className="animate-spin">
                        <IconSpinner className="h-4 w-4" />
                      </span>
                      Indexing pages…
                    </div>
                  )}
                </div>

                {!apiKey.trim() && (
                  <div className="mt-4 glass-border glass-radius p-4 animate-fade-in">
                    <div className="text-xs font-semibold text-[color:var(--faint)]">API key missing</div>
                    <div className="mt-2 text-sm text-[color:var(--muted)]">
                      Add your Gemini API key in Settings to begin.
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowSettings(true)}
                        className="glass-strong glass-radius px-4 py-2 text-sm font-semibold"
                        style={{
                          boxShadow:
                            '0 18px 55px rgba(6, 182, 212, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.45)',
                        }}
                      >
                        Open settings
                      </button>
                      <a
                        className="glass-button px-4 py-2 text-sm text-[color:var(--muted)] hover:text-[color:var(--fg)]"
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Get a key
                      </a>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="glass-button px-3 py-2 text-xs text-[color:var(--muted)]">
                    {chunks.length} pages indexed
                  </span>
                  <span className="glass-button px-3 py-2 text-xs text-[color:var(--muted)]">
                    {documents.length} document(s)
                  </span>
                </div>

                {hasDocs && (
                  <div className="mt-4 space-y-2">
                    <div className="text-xs font-semibold text-[color:var(--faint)]">Documents</div>
                    <div className="flex flex-wrap gap-2">
                      {documents.map((doc) => (
                        <span
                          key={doc.name}
                          className="glass-button px-3 py-2 text-xs text-[color:var(--muted)] max-w-full truncate"
                          title={doc.name}
                        >
                          {doc.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="glass-border glass-radius px-4 py-3">
                    <div className="text-xs font-semibold text-[color:var(--faint)]">Sources</div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        className="glass-button px-3 py-2 text-xs text-[color:var(--muted)]"
                        onClick={() => setSourcesCount((v) => Math.max(1, v - 1))}
                      >
                        -
                      </button>
                      <div className="text-sm font-semibold">{sourcesCount}</div>
                      <button
                        type="button"
                        className="glass-button px-3 py-2 text-xs text-[color:var(--muted)]"
                        onClick={() => setSourcesCount((v) => Math.min(12, v + 1))}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="glass-border glass-radius px-4 py-3">
                    <div className="text-xs font-semibold text-[color:var(--faint)]">Mode</div>
                    <button
                      type="button"
                      className="mt-2 w-full glass-button px-3 py-2 text-xs text-[color:var(--muted)] hover:text-[color:var(--fg)]"
                      onClick={() => setBatchMode((v) => !v)}
                    >
                      {batchMode ? 'Batch' : 'Single'}
                    </button>
                  </div>
                </div>
              </div>
            </aside>

            <section className="lg:col-span-8">
              <div className="glass glass-radius p-5">
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold tracking-tight">Ask</div>
                      <div className="mt-1 text-sm text-[color:var(--muted)]">
                        {chunks.length > 0
                          ? 'Ask anything about your documents.'
                          : 'Upload a PDF first to start.'}
                      </div>
                    </div>
                    {answer && (
                      <button
                        type="button"
                        onClick={copyToClipboard}
                        className="glass-button px-3 py-2 text-sm text-[color:var(--muted)] hover:text-[color:var(--fg)]"
                      >
                        <span className="inline-flex items-center gap-2">
                          <IconCopy className="h-4 w-4" />
                          {copied ? 'Copied' : 'Copy'}
                        </span>
                      </button>
                    )}
                  </div>

                  <div className="mt-4">
                    {!batchMode ? (
                      <div className="flex items-end gap-3">
                        <label className="flex-1">
                          <span className="sr-only">Question</span>
                          <textarea
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="Ask a question…"
                            rows={3}
                            className="w-full glass-input px-4 py-3 text-sm text-[color:var(--fg)] placeholder:text-[color:var(--faint)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => handleAskQuestion()}
                          disabled={loading || chunks.length === 0 || !question.trim()}
                          className="glass-strong glass-radius px-5 py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            boxShadow:
                              '0 18px 55px rgba(6, 182, 212, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.45)',
                          }}
                        >
                          <span className="inline-flex items-center gap-2">
                            {loading && (
                              <span className="animate-spin">
                                <IconSpinner className="h-4 w-4" />
                              </span>
                            )}
                            {loading ? 'Thinking…' : 'Ask'}
                          </span>
                        </button>
                      </div>
                    ) : (
                      <div>
                        <label className="block">
                          <span className="text-xs font-semibold text-[color:var(--faint)]">
                            One question per line
                          </span>
                          <textarea
                            value={batchQuestions}
                            onChange={(e) => setBatchQuestions(e.target.value)}
                            placeholder={'What is the summary?\nList key metrics.\nWhat are the risks?'}
                            rows={6}
                            className="mt-2 w-full glass-input px-4 py-3 text-sm text-[color:var(--fg)] placeholder:text-[color:var(--faint)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
                          />
                        </label>
                        <div className="mt-3 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={handleBatchQuestions}
                            disabled={loading || chunks.length === 0 || !batchQuestions.trim()}
                            className="glass-strong glass-radius px-5 py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                              boxShadow:
                                '0 18px 55px rgba(6, 182, 212, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.45)',
                            }}
                          >
                            <span className="inline-flex items-center gap-2">
                              {loading && (
                                <span className="animate-spin">
                                  <IconSpinner className="h-4 w-4" />
                                </span>
                              )}
                              {loading ? 'Working…' : 'Ask all'}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {loading && !answer && (
                    <div className="mt-6 glass-border glass-radius p-4 animate-fade-in">
                      <div className="text-xs font-semibold text-[color:var(--faint)]">Working</div>
                      <div className="mt-3 space-y-2">
                        <div className="h-3 w-10/12 rounded bg-black/10 dark:bg-white/10" />
                        <div className="h-3 w-9/12 rounded bg-black/10 dark:bg-white/10" />
                        <div className="h-3 w-7/12 rounded bg-black/10 dark:bg-white/10" />
                      </div>
                      <div className="mt-3 text-xs text-[color:var(--muted)]">
                        Finding the most relevant pages…
                      </div>
                    </div>
                  )}

                  {answer && (
                    <div className="mt-6 glass-border glass-radius p-4">
                      <div className="text-xs font-semibold text-[color:var(--faint)]">Pages mentioned</div>
                      {answerPages ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {answerPages.length === 0 ? (
                            <div className="text-sm text-[color:var(--muted)]">
                              Not found in the indexed pages.
                            </div>
                          ) : (
                            answerPages.map((p) => (
                              <span
                                key={p}
                                className="glass-button px-3 py-2 text-sm text-[color:var(--muted)]"
                              >
                                Page {p}
                              </span>
                            ))
                          )}
                        </div>
                      ) : (
                        <div className="mt-2 text-sm whitespace-pre-wrap text-[color:var(--fg)]">
                          {answer.text}
                        </div>
                      )}

                      {answer.sources.length > 0 && (
                        <div className="mt-5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-xs font-semibold text-[color:var(--faint)]">Sources</div>
                            <div className="text-xs text-[color:var(--muted)]">
                              Click a page to preview.
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                            {answer.sources.map((source, idx) => (
                              <div
                                key={`${source.documentName}-${source.pageNumber}-${idx}`}
                                className="glass-border glass-radius overflow-hidden"
                              >
                                <div className="px-3 py-2 flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="text-xs font-semibold truncate">
                                      Page {source.pageNumber}
                                    </div>
                                    <div className="text-xs text-[color:var(--muted)] truncate">
                                      {source.documentName}
                                    </div>
                                  </div>
                                  {source.image && (
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        className="glass-button px-2.5 py-1.5 text-xs text-[color:var(--muted)] hover:text-[color:var(--fg)]"
                                        onClick={async () => {
                                          const response = await fetch(source.image!);
                                          const blob = await response.blob();
                                          await navigator.clipboard.write([
                                            new ClipboardItem({ 'image/png': blob }),
                                          ]);
                                          setToast('Copied page image.');
                                        }}
                                      >
                                        <span className="inline-flex items-center gap-1.5">
                                          <IconCopy className="h-3.5 w-3.5" />
                                          Copy
                                        </span>
                                      </button>
                                      <a
                                        className="glass-button px-2.5 py-1.5 text-xs text-[color:var(--muted)] hover:text-[color:var(--fg)]"
                                        href={source.image}
                                        download={`Page-${source.pageNumber}`}
                                      >
                                        <span className="inline-flex items-center gap-1.5">
                                          <IconDownload className="h-3.5 w-3.5" />
                                          Download
                                        </span>
                                      </a>
                                    </div>
                                  )}
                                </div>

                                {source.image ? (
                                  <button
                                    type="button"
                                    className="block w-full"
                                    onClick={() => setExpandedImage(source.image!)}
                                  >
                                    <img
                                      src={source.image}
                                      alt={`Page ${source.pageNumber}`}
                                      className="w-full h-auto"
                                      loading="lazy"
                                    />
                                  </button>
                                ) : (
                                  <div className="px-3 pb-3 text-xs text-[color:var(--muted)]">
                                    No preview available.
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {chatHistory.length > 0 && (
                    <div className="mt-6">
                      <div className="text-xs font-semibold text-[color:var(--faint)]">Recent</div>
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {chatHistory.slice(0, 4).map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleAskQuestion(item.question)}
                            className="glass-border glass-radius p-4 text-left hover:border-white/30 transition-colors"
                          >
                            <div className="text-sm font-semibold line-clamp-2">{item.question}</div>
                            <div className="mt-2 text-sm text-[color:var(--muted)] line-clamp-2">
                              {item.answer.text}
                            </div>
                            <div className="mt-2 text-xs text-[color:var(--faint)]">
                              {new Date(item.timestamp).toLocaleString()}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              </div>
            </section>
          </div>
        )}
      </main>

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 glass glass-radius px-4 py-3 text-sm text-[color:var(--fg)] animate-scale-in">
          {toast}
        </div>
      )}

      {expandedImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          onMouseDown={() => setExpandedImage(null)}
        >
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
          <div className="relative max-w-[96vw] max-h-[90vh]" onMouseDown={(e) => e.stopPropagation()}>
            <img
              src={expandedImage}
              alt="Page preview"
              className="max-w-[96vw] max-h-[90vh] object-contain glass glass-radius"
            />
            <button
              type="button"
              onClick={() => setExpandedImage(null)}
              className="absolute -top-3 -right-3 glass-button px-3 py-2 text-sm text-[color:var(--muted)] hover:text-[color:var(--fg)]"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-y-0 right-0 z-50 w-[min(420px,92vw)] p-4">
          <div className="h-full glass-chrome glass-radius p-5 overflow-y-auto">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold tracking-tight">History</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearChatHistory}
                  className="glass-button px-3 py-2 text-sm text-[color:var(--muted)] hover:text-[color:var(--fg)]"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setShowHistory(false)}
                  className="glass-button px-3 py-2 text-sm text-[color:var(--muted)] hover:text-[color:var(--fg)]"
                >
                  Close
                </button>
              </div>
            </div>

            {chatHistory.length === 0 ? (
              <div className="mt-6 text-sm text-[color:var(--muted)]">No history yet.</div>
            ) : (
              <div className="mt-4 space-y-3">
                {chatHistory.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setShowHistory(false);
                      handleAskQuestion(item.question);
                    }}
                    className="w-full text-left glass-border glass-radius p-4 hover:border-white/30 transition-colors"
                  >
                    <div className="text-sm font-semibold">{item.question}</div>
                    <div className="mt-2 text-sm text-[color:var(--muted)] line-clamp-2">
                      {item.answer.text}
                    </div>
                    <div className="mt-2 text-xs text-[color:var(--faint)]">
                      {new Date(item.timestamp).toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showDocBrowser && documents.length > 0 && (
        <ModalShell title="Documents" onClose={() => setShowDocBrowser(false)} widthClassName="max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc, docIdx) => (
              <div key={`${doc.name}-${docIdx}`} className="glass-border glass-radius p-4">
                <div className="text-sm font-semibold truncate">{doc.name}</div>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto pr-1">
                  {doc.pages.map((page) => (
                    <button
                      key={`${doc.name}-${page.pageNumber}`}
                      type="button"
                      className="glass-border glass-radius overflow-hidden text-left hover:border-white/30 transition-colors"
                      onClick={() => {
                        if (page.image) setExpandedImage(page.image);
                        setShowDocBrowser(false);
                      }}
                    >
                      {page.image ? (
                        <img
                          src={page.image}
                          alt={`Page ${page.pageNumber}`}
                          className="w-full h-auto"
                          loading="lazy"
                        />
                      ) : (
                        <div className="p-3 text-xs text-[color:var(--muted)]">No preview</div>
                      )}
                      <div className="px-3 py-2 text-xs text-[color:var(--muted)]">
                        Page {page.pageNumber}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ModalShell>
      )}

      {showSettings && (
        <ModalShell title="Settings" onClose={() => setShowSettings(false)} widthClassName="max-w-lg">
          <div className="space-y-4">
            <div className="glass-border glass-radius p-4">
              <label className="block">
                <div className="text-xs font-semibold text-[color:var(--faint)]">Gemini API key</div>
                <div className="mt-1 text-sm text-[color:var(--muted)]">
                  Stored locally. Sent to your own server routes via `x-api-key`.
                </div>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste your key…"
                  className="mt-3 w-full glass-input px-4 py-3 text-sm text-[color:var(--fg)] placeholder:text-[color:var(--faint)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
                />
              </label>
              <div className="mt-3 glass-border glass-radius p-3 text-sm text-[color:var(--muted)]">
                <div className="text-xs font-semibold text-[color:var(--faint)]">Where to get it</div>
                <ol className="mt-2 list-decimal pl-5 space-y-1">
                  <li>
                    Open{' '}
                    <a
                      className="text-[color:var(--fg)] underline underline-offset-4"
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Google AI Studio → API keys
                    </a>
                  </li>
                  <li>Create a new key (or use an existing one).</li>
                  <li>Copy it here and press Save.</li>
                </ol>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  className="glass-strong glass-radius px-5 py-3 text-sm font-semibold"
                  style={{
                    boxShadow:
                      '0 18px 55px rgba(6, 182, 212, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.45)',
                  }}
                >
                  Save
                </button>
              </div>
            </div>

            <div className="glass-border glass-radius p-4 text-sm text-[color:var(--muted)]">
              Shortcuts: Ctrl/⌘ K (settings), Ctrl/⌘ D (theme), Ctrl/⌘ H (history), Ctrl/⌘ B (docs).
            </div>
          </div>
        </ModalShell>
      )}

      <footer className="mx-auto max-w-7xl px-4 py-12 text-center text-xs text-[color:var(--faint)]">
        <div className="flex flex-col items-center gap-4">
          <p>FindPage.ai • Built for students who value accuracy.</p>
          <p className="max-w-md mx-auto opacity-60">
            FindPage.ai uses advanced AI to synthesize answers from your PDF documents. Always verify generated answers against the source page provided.
          </p>
        </div>
      </footer>
    </div>
  );
}
