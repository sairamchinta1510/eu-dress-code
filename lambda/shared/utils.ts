import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { APIGatewayProxyResultV2 } from 'aws-lambda';

const ssmClient = new SSMClient({});
let cachedApiKey: string | null = null;

export async function getGeminiApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey;
  const paramName = process.env.GEMINI_SSM_PARAM;
  if (!paramName) throw new Error('GEMINI_SSM_PARAM environment variable is not set');
  try {
    const result = await ssmClient.send(
      new GetParameterCommand({ Name: paramName, WithDecryption: true })
    );
    const value = result.Parameter?.Value;
    if (!value) throw new Error('API key parameter exists but has no value');
    cachedApiKey = value;
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
