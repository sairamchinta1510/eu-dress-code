import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getGeminiApiKey, getPexelsApiKey, respond } from '../shared/utils';

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

export interface AiRecommendation {
  name: string;
  description: string;
  occasions: string[];
  formality: 1 | 2 | 3 | 4 | 5;
  formalityLabel: string;
  menOutfit: string;
  womenOutfit: string;
  menPhoto?: string;
  womenPhoto?: string;
}

/** Search Pexels for a portrait-oriented fashion photo; returns URL or null */
async function pexelsPhoto(query: string, apiKey: string): Promise<string | null> {
  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=portrait`;
    const res = await fetch(url, { headers: { Authorization: apiKey } });
    if (res.status === 429 || res.status === 401 || !res.ok) return null; // quota exceeded or invalid key
    const data = await res.json() as { photos: Array<{ src: { large: string } }> };
    return data.photos?.[0]?.src?.large ?? null;
  } catch {
    return null;
  }
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

  try {
    const [apiKey, pexelsKey] = await Promise.all([getGeminiApiKey(), getPexelsApiKey()]);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const safeQuery = query.replace(/"""/g, "'''");
    const prompt = `You are a European dress code expert. Given the user query, do two things:

1. From the list below, find dress codes with relevance >= 2 (sorted by descending relevance).
2. If the query does NOT match any existing dress code (empty results), create a CUSTOM AI recommendation.

User query: """${safeQuery}"""

Known dress codes:
${JSON.stringify(dressCodes, null, 2)}

Respond ONLY with valid JSON in exactly this format (no markdown):
{
  "results": [{ "id": "string", "relevance": number_1_to_5, "reason": "one sentence" }],
  "recommendation": null
}

If results is empty, replace null with:
{
  "name": "string",
  "description": "string",
  "occasions": ["string"],
  "formality": number_1_to_5,
  "formalityLabel": "string",
  "menOutfit": "concise men outfit description",
  "womenOutfit": "concise women outfit description",
  "menPhotoSearch": "2-4 word Pexels photo search term for men (e.g. sherwani groom)",
  "womenPhotoSearch": "2-4 word Pexels photo search term for women (e.g. lehenga bride)"
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) throw new Error('Gemini did not return valid JSON');

    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as {
      results: SearchResultItem[];
      recommendation: (AiRecommendation & { menPhotoSearch?: string; womenPhotoSearch?: string }) | null;
    };

    if (!Array.isArray(parsed.results)) {
      throw new Error('Invalid response format from Gemini');
    }

    // Filter to valid results that reference known dress code IDs
    const knownIds = new Set(dressCodes.map((d) => d.id));
    const validResults = parsed.results.filter(
      (item) => item.id && knownIds.has(item.id) && typeof item.relevance === 'number'
    );

    let recommendation: AiRecommendation | null = null;
    if (validResults.length === 0 && parsed.recommendation) {
      const rec = parsed.recommendation;
      if (pexelsKey) {
        const menSearch   = rec.menPhotoSearch   ?? `${rec.name} men fashion`;
        const womenSearch = rec.womenPhotoSearch ?? `${rec.name} women fashion`;
        const [menPhoto, womenPhoto] = await Promise.all([
          pexelsPhoto(menSearch, pexelsKey),
          pexelsPhoto(womenSearch, pexelsKey),
        ]);
        recommendation = { ...rec, menPhoto: menPhoto ?? undefined, womenPhoto: womenPhoto ?? undefined };
      } else {
        recommendation = rec;
      }
    }

    return respond(200, {
      results: validResults,
      recommendation,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Search failed';
    return respond(500, { error: message });
  }
};
