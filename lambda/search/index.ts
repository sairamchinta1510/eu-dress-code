import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getGeminiApiKey, respond } from '../shared/utils';

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

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;

  if (method !== 'POST') {
    return respond(405, { error: 'Method not allowed' });
  }

  let body: SearchRequestBody;
  try {
    body = JSON.parse(event.body ?? '{}') as SearchRequestBody;
  } catch {
    return respond(400, { error: 'Invalid JSON body' });
  }

  const { query, dressCodes } = body;

  if (!query || !query.trim()) {
    return respond(400, { error: 'query is required' });
  }

  if (!Array.isArray(dressCodes) || dressCodes.length === 0) {
    return respond(400, { error: 'dressCodes array is required' });
  }

  const invalidItem = dressCodes.find(
    (dc) => !dc.id || !dc.name || !dc.description || !Array.isArray(dc.occasions) || !Array.isArray(dc.keywords)
  );
  if (invalidItem) {
    return respond(400, { error: 'Each dress code must have id, name, description, occasions, and keywords' });
  }

  try {
    const apiKey = await getGeminiApiKey();
    if (!apiKey) return respond(500, { error: 'GEMINI_API_KEY not configured' });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const safeQuery = query.replace(/"""/g, "'''");
    const prompt = `You are a dress code assistant. Given the user's query, rank the following dress codes by relevance.
Return ONLY valid JSON: an array of { "id": string, "relevance": number (1-5), "reason": string (one sentence) }.
Only include dress codes with relevance >= 2. Sort by descending relevance.

User query: """${safeQuery}"""

Dress codes:
${JSON.stringify(dressCodes, null, 2)}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const jsonStart = text.indexOf('[');
    const jsonEnd = text.lastIndexOf(']');
    if (jsonStart === -1 || jsonEnd === -1) throw new Error('Gemini did not return a valid JSON array');

    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as SearchResultItem[];
    if (!Array.isArray(parsed) || parsed.some((item) => !item.id || typeof item.relevance !== 'number' || typeof item.reason !== 'string')) {
      throw new Error('Invalid response format from Gemini');
    }
    return respond(200, { results: parsed });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Search failed';
    return respond(500, { error: message });
  }
};
