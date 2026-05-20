import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { DRESS_CODE_ITEMS, DRESS_CODE_NAMES } from '../shared/dressCodes';
import { getGeminiApiKey, respond } from '../shared/utils';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;

  if (method !== 'POST') {
    return respond(405, { error: 'Method not allowed' });
  }

  let body: { imageBase64?: string; dressCodeId?: string };
  try {
    body = JSON.parse(event.body ?? '{}') as { imageBase64?: string; dressCodeId?: string };
  } catch {
    return respond(400, { error: 'Invalid JSON body' });
  }

  const { imageBase64, dressCodeId } = body;

  if (!imageBase64 || !dressCodeId) {
    return respond(400, { error: 'imageBase64 and dressCodeId are required' });
  }

  const requiredItems = DRESS_CODE_ITEMS[dressCodeId];
  if (!requiredItems) {
    return respond(400, { error: `Unknown dressCodeId: ${dressCodeId}` });
  }

  try {
    const apiKey = await getGeminiApiKey();

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const mimeType = imageBase64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';

    const dressCodeList = Object.entries(DRESS_CODE_NAMES)
      .map(([id, name]) => `${id}: ${name}`)
      .join('\n');

    const prompt = `You are a fashion expert analysing a wardrobe photo.
The person needs clothing suitable for: ${dressCodeId.replace(/-/g, ' ')}.

Required items for this dress code:
${requiredItems.map((item) => `- ${item}`).join('\n')}

Look carefully at the wardrobe photo and determine:
1. Which of the required items you can see clearly
2. Which required items are missing
3. One shopping suggestion for each missing item (concise, e.g. "Buy charcoal slim-fit suit trousers")
4. Which dress codes from this list the overall outfit in the photo would be SUITABLE for (can be zero or more):
${dressCodeList}

Respond ONLY with valid JSON — no markdown, no explanation — in exactly this format:
{"found": ["item1", "item2"], "missing": ["item3"], "suggestions": ["Buy item3 suggestion"], "suitableFor": [{"id": "smart-casual", "name": "Smart Casual"}]}`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType, data: base64Data } },
    ]);

    const text = result.response.text().trim();
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) throw new Error('Gemini did not return valid JSON');

    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as {
      found: string[];
      missing: string[];
      suggestions: string[];
      suitableFor?: Array<{ id: string; name: string }>;
    };
    return respond(200, parsed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Analysis failed';
    return respond(500, { error: message });
  }
};
