import { GoogleGenerativeAI } from '@google/generative-ai';

export function isRateLimitLikeError(error: unknown): boolean {
  const msg =
    error instanceof Error ? error.message.toLowerCase() : String(error ?? '').toLowerCase();
  return (
    msg.includes('rate') ||
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('exhausted') ||
    msg.includes('resource')
  );
}

export function getRateLimitMessage(error: unknown): string {
  const msg =
    error instanceof Error ? error.message.toLowerCase() : String(error ?? '').toLowerCase();

  if (msg.includes('quota') || msg.includes('exhausted') || msg.includes('resource')) {
    return 'Daily quota exhausted. Try again tomorrow or use a different API key.';
  }
  if (msg.includes('rate') || msg.includes('429')) {
    return 'Rate limit exceeded. Please wait a moment and try again.';
  }
  return 'Rate limit reached. Please try again in a few seconds.';
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (isRateLimitLikeError(err)) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

function getClient(apiKey: string) {
  const key = apiKey.trim();
  if (!key) throw new Error('Missing API key');
  return new GoogleGenerativeAI(key);
}

export async function generateEmbeddingClient(text: string, apiKey: string): Promise<number[]> {
  return withRetry(async () => {
    const model = getClient(apiKey).getGenerativeModel({ model: 'gemini-embedding-001' });
    const result = await model.embedContent(text);
    return result.embedding?.values || [];
  });
}

export async function generateAnswerClient(
  question: string,
  context: string,
  apiKey: string
): Promise<string> {
  return withRetry(async () => {
    const model = getClient(apiKey).getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.1,
        topP: 1,
        topK: 40,
        responseMimeType: 'application/json',
      },
    });

    const prompt = `You are an exact assistant that identifies the precise page numbers where an answer is located.
Based on the following context from uploaded PDF documents, determine which page(s) contain the answer to the user's question.

Context:
${context}

Question: ${question}

Return ONLY a JSON array of integer numbers representing the exact page numbers where the answer is explicitly found in the context.
For example: [1, 4, 5]
If the answer cannot be found in the context, return an empty array: []
Do not include any explanation, conversational text, or formatting outside of the JSON array.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  });
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

