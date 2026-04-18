import { GoogleGenerativeAI, GoogleGenerativeAIError } from '@google/generative-ai';

const clientCache = new Map<string, GoogleGenerativeAI>();

function getClient(apiKey?: string) {
  const key = (apiKey?.trim() || process.env.GEMINI_API_KEY || '').trim();
  if (!key) throw new Error('Missing GEMINI_API_KEY (or x-api-key header)');

  const cached = clientCache.get(key);
  if (cached) return cached;

  const client = new GoogleGenerativeAI(key);
  clientCache.set(key, client);
  return client;
}

export function isRateLimitError(error: unknown): boolean {
  let msg = '';
  
  if (error instanceof GoogleGenerativeAIError) {
    msg = error.message?.toLowerCase() || '';
  } else if (error instanceof Error) {
    msg = error.message?.toLowerCase() || '';
  }
  
  return msg.includes('rate') || msg.includes('429') || msg.includes('quota') || msg.includes('exhausted') || msg.includes('resource');
}

export function getRateLimitMessage(error: unknown): string {
  let msg = '';
  
  if (error instanceof Error) {
    msg = error.message?.toLowerCase() || '';
  }
  
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
    } catch (error: unknown) {
      lastError = error;
      
      if (isRateLimitError(error)) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export async function generateEmbedding(text: string, apiKey?: string): Promise<number[]> {
  return withRetry(async () => {
    const model = getClient(apiKey).getGenerativeModel({ model: 'gemini-embedding-001' });
    const result = await model.embedContent(text);
    return result.embedding?.values || [];
  });
}

export async function generateAnswer(
  question: string,
  context: string,
  apiKey?: string
): Promise<string> {
  return withRetry(async () => {
    const model = getClient(apiKey).getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.1,
        topP: 1,
        topK: 40,
        responseMimeType: 'application/json',
      }
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
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
