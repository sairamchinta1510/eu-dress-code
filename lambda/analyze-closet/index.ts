import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

const ssmClient = new SSMClient({ region: 'us-east-1' });
let cachedApiKey: string | null = null;

async function getGeminiApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey;
  const result = await ssmClient.send(
    new GetParameterCommand({ Name: '/eu-dress-code/GEMINI_API_KEY', WithDecryption: true })
  );
  cachedApiKey = result.Parameter?.Value ?? '';
  return cachedApiKey;
}

const DRESS_CODE_ITEMS: Record<string, string[]> = {
  'white-tie': ['black tailcoat', 'white waistcoat', 'white dress shirt', 'black dress trousers with silk braid', 'patent leather Oxford shoes'],
  'black-tie': ['tuxedo jacket', 'white dress shirt', 'black trousers with silk braid', 'black bow tie', 'black patent leather dress shoes'],
  'black-tie-optional': ['dark suit jacket', 'white dress shirt', 'matching trousers', 'Oxford dress shoes'],
  'morning-dress': ['morning coat or tailcoat', 'waistcoat', 'striped morning trousers', 'cravat or formal tie', 'Oxford shoes'],
  'creative-black-tie': ['tuxedo or statement dinner jacket', 'dress shirt', 'formal trousers', 'statement accessories', 'dress shoes'],
  'cocktail': ['dark suit jacket', 'white dress shirt', 'matching suit trousers', 'tie', 'Oxford shoes'],
  'lounge-suit': ['suit jacket', 'dress shirt', 'matching suit trousers', 'belt', 'Oxford or Derby shoes'],
  'business-formal': ['dark conservative suit jacket', 'white dress shirt', 'matching trousers', 'conservative tie', 'black Oxford shoes'],
  'business-casual': ['blazer or smart jacket', 'polo or button-down shirt', 'chinos or smart trousers', 'smart brogue or loafer'],
  'smart-casual': ['blazer', 'quality shirt or t-shirt', 'dark jeans or chinos', 'smart trainer or Chelsea boot'],
  'resort-casual': ['linen shirt or casual shirt', 'linen or cotton trousers', 'loafers or leather sandals'],
  'casual': ['t-shirt or casual shirt', 'jeans or casual trousers', 'trainers or casual shoes'],
};

const ALLOWED_ORIGIN = 'https://eudresscode.tadpoleindustries.com';

const respond = (statusCode: number, body: unknown): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  },
  body: JSON.stringify(body),
});

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;

  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': ALLOWED_ORIGIN, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' };
  }

  if (method !== 'POST') {
    return respond(405, { error: 'Method not allowed' });
  }

  const body = JSON.parse(event.body ?? '{}') as { imageBase64?: string; dressCodeId?: string };
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
    if (!apiKey) return respond(500, { error: 'GEMINI_API_KEY not configured' });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const mimeType = imageBase64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';

    const prompt = `You are a fashion expert analysing a wardrobe photo.
The person needs clothing suitable for: ${dressCodeId.replace(/-/g, ' ')}.

Required items for this dress code:
${requiredItems.map((item) => `- ${item}`).join('\n')}

Look carefully at the wardrobe photo and determine:
1. Which of the required items you can see clearly
2. Which required items are missing
3. One shopping suggestion for each missing item (concise, e.g. "Buy charcoal slim-fit suit trousers")

Respond ONLY with valid JSON — no markdown, no explanation — in exactly this format:
{"found": ["item1", "item2"], "missing": ["item3"], "suggestions": ["Buy item3 suggestion"]}`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType, data: base64Data } },
    ]);

    const text = result.response.text().trim();
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) throw new Error('Gemini did not return valid JSON');

    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as { found: string[]; missing: string[]; suggestions: string[] };
    return respond(200, parsed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Analysis failed';
    return respond(500, { error: message });
  }
};
