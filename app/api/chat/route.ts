import { NextRequest, NextResponse } from 'next/server';
import { generateEmbedding, generateAnswer, cosineSimilarity, isRateLimitError, getRateLimitMessage } from '@/lib/gemini';

interface Chunk {
  text: string;
  pageNumber: number;
  documentName: string;
  embedding: number[];
  image?: string;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key') || undefined;
    const { question, chunks, sourcesCount = 5 } = await request.json();

    if (!question || !chunks || !Array.isArray(chunks)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const questionEmbedding = await generateEmbedding(question, apiKey);

    const resultsWithSimilarity = chunks
      .map((chunk: Chunk) => ({
        ...chunk,
        similarity: cosineSimilarity(questionEmbedding, chunk.embedding),
      }))
      .sort((a: Chunk & { similarity: number }, b: Chunk & { similarity: number }) => b.similarity - a.similarity)
      .slice(0, sourcesCount);

    const context = resultsWithSimilarity
      .map((r: Chunk & { similarity: number }) => `[Page ${r.pageNumber} from ${r.documentName}]\n${r.text}`)
      .join('\n\n');

    const answer = await generateAnswer(question, context, apiKey);

    const sources = resultsWithSimilarity.map((r: Chunk & { similarity: number }) => ({
      pageNumber: r.pageNumber,
      documentName: r.documentName,
      similarity: r.similarity,
      image: r.image,
    }));

    return NextResponse.json({ 
      answer, 
      sources,
      usage: {
        charactersProcessed: context.length + question.length
      }
    });
  } catch (error) {
    console.error('Chat error:', error);
    
    if (isRateLimitError(error)) {
      return NextResponse.json({ 
        error: getRateLimitMessage(error),
        isRateLimit: true 
      }, { status: 429 });
    }
    
    return NextResponse.json({ error: 'Failed to process question' }, { status: 500 });
  }
}
