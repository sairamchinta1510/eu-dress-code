import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { APIGatewayProxyResultV2 } from 'aws-lambda';

const ssmClient = new SSMClient({});
let cachedApiKey: string | null = null;

export async function getGeminiApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey;
  try {
    const result = await ssmClient.send(
      new GetParameterCommand({ Name: '/eu-dress-code/GEMINI_API_KEY', WithDecryption: true })
    );
    cachedApiKey = result.Parameter?.Value ?? '';
    return cachedApiKey;
  } catch {
    throw new Error('Failed to retrieve API key from configuration');
  }
}

export const respond = (statusCode: number, body: unknown): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
