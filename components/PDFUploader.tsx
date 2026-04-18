'use client';

import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import type { RenderParameters } from 'pdfjs-dist/types/src/display/api';

interface PDFPage {
  pageNumber: number;
  content: string;
  image: string;
}

interface PDFUploaderProps {
  onUploadComplete: (pages: PDFPage[], fileName: string) => void;
  onOpenReady?: (open: () => void) => void;
}

async function extractTextFromPDF(file: File): Promise<PDFPage[]> {
  const pdfjs = await import('pdfjs-dist');
  
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  
  const pages: PDFPage[] = [];
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    const pageText = textContent.items
      .map((item) => (item as { str: string }).str)
      .join(' ')
      .trim();

    const viewport = await page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    if (context) {
      const renderParams: RenderParameters = {
        canvas: null,
        canvasContext: context,
        viewport,
      };
      await page.render(renderParams).promise;
      const image = canvas.toDataURL('image/png');
      
      pages.push({
        pageNumber: i,
        content: pageText,
        image,
      });
    }
  }
  
  return pages;
}

export default function PDFUploader({ onUploadComplete, onOpenReady }: PDFUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);
    setError(null);

    try {
      for (const file of acceptedFiles) {
        if (file.type !== 'application/pdf') {
          setError('Only PDF files are supported');
          continue;
        }

        const pages = await extractTextFromPDF(file);
        onUploadComplete(pages, file.name);
      }
    } catch (err) {
      setError('Failed to process PDF. Please try again.');
      console.error(err);
    } finally {
      setUploading(false);
    }
  }, [onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
  });

  // Expose the file-picker "open" function to parent UIs.
  useEffect(() => {
    onOpenReady?.(open);
  }, [onOpenReady, open]);

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={[
          'relative overflow-hidden cursor-pointer glass-border glass-radius px-5 py-6',
          'transition-colors duration-200',
          isDragActive ? 'border-white/40' : 'hover:border-white/30',
        ].join(' ')}
      >
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div
            className="absolute -inset-12 blur-2xl"
            style={{
              background:
                'radial-gradient(600px 220px at 20% 25%, rgba(6,182,212,0.35), transparent 60%), radial-gradient(540px 220px at 80% 20%, rgba(245,158,11,0.26), transparent 60%)',
            }}
          />
        </div>

        <input {...getInputProps()} />

        <div className="relative flex items-center gap-4">
          <div className="h-11 w-11 rounded-2xl glass flex items-center justify-center">
            <svg
              className="h-5 w-5 text-[color:var(--fg)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M8 13h8" />
              <path d="M8 17h8" />
            </svg>
          </div>

          <div className="min-w-0 text-left">
            {uploading ? (
              <>
                <div className="text-sm font-semibold tracking-tight">Processing PDF…</div>
                <div className="mt-1 text-xs text-[color:var(--muted)]">
                  Extracting text and page previews.
                </div>
              </>
            ) : isDragActive ? (
              <>
                <div className="text-sm font-semibold tracking-tight">Drop to upload</div>
                <div className="mt-1 text-xs text-[color:var(--muted)]">
                  Release to start indexing.
                </div>
              </>
            ) : (
              <>
                <div className="text-sm font-semibold tracking-tight">Upload PDFs</div>
                <div className="mt-1 text-xs text-[color:var(--muted)]">
                  Drag & drop, or click to browse. Multiple PDFs supported.
                </div>
              </>
            )}
          </div>
        </div>

        <div className="relative mt-4 flex items-center justify-between gap-2">
          <div className="text-xs text-[color:var(--faint)]">PDF only</div>
          <div className="glass-button px-3 py-2 text-xs text-[color:var(--muted)]">
            {uploading ? 'Working…' : 'Choose files'}
          </div>
        </div>
      </div>
      {error && <p className="mt-2 text-red-500 text-sm">{error}</p>}
    </div>
  );
}
