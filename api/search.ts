import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface DressCodeSummary {
  id: string;
  name: string;
  description: string;
  occasions: string[];
  keywords: string[];
}

interface SearchRequestBody {
  query: string;
  dressCodes: DressCodeSummary[];
}

export interface SearchResultItem {
  id: string;
  relevance: number;
  reason: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, dressCodes } = req.body as SearchRequestBody;

  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'query is required' });
  }

  if (!Array.isArray(dressCodes) || dressCodes.length === 0) {
    return res.status(400).json({ error: 'dressCodes array is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are a dress code assistant. Given the user's query, rank the following dress codes by relevance.
Return ONLY valid JSON: an array of { "id": string, "relevance": number (1-5), "reason": string (one sentence) }.
Only include dress codes with relevance >= 2. Sort by descending relevance.

User query: """${query}"""

Dress codes:
${JSON.stringify(dressCodes, null, 2)}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const jsonStart = text.indexOf('[');
    const jsonEnd = text.lastIndexOf(']');
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('Gemini did not return a valid JSON array');
    }

    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as SearchResultItem[];
    if (!Array.isArray(parsed) || parsed.some((item) => !item.id || typeof item.relevance !== 'number' || typeof item.reason !== 'string')) {
      throw new Error('Invalid response format from Gemini');
    }
    return res.status(200).json({ results: parsed });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Search failed';
    return res.status(500).json({ error: message });
  }
}
