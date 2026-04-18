import { NextRequest, NextResponse } from 'next/server';
import { generateEmbedding, isRateLimitError, getRateLimitMessage } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key') || undefined;
    const { chunks } = await request.json();

    if (!chunks || !Array.isArray(chunks)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const embeddingsWithChunks = await Promise.all(
      chunks.map(async (chunk: { text: string; pageNumber: number; documentName: string }) => {
        const embedding = await generateEmbedding(chunk.text, apiKey);
        return {
          ...chunk,
          embedding,
        };
      })
    );

    return NextResponse.json({ 
      chunks: embeddingsWithChunks,
      usage: {
        pagesIndexed: chunks.length,
        pagesText: chunks.map((c: { text: string }) => c.text).join('').length
      }
    });
  } catch (error) {
    console.error('Embedding error:', error);
    
    if (isRateLimitError(error)) {
      return NextResponse.json({ 
        error: getRateLimitMessage(error),
        isRateLimit: true 
      }, { status: 429 });
    }
    
    return NextResponse.json({ error: 'Failed to generate embeddings' }, { status: 500 });
  }
}
