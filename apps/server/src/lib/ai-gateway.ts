import OpenAI from 'openai';

import { env } from '../config/env.js';

const GATEWAY_BASE_URL = 'https://ai-gateway.vercel.sh/v1';

/** Model embedding qua Vercel AI Gateway — 1536 dims, khớp post_embeddings schema. */
export const EMBEDDING_MODEL = 'openai/text-embedding-3-small';

let client: OpenAI | null = null;

/** Có cấu hình Vercel AI Gateway API key. */
export function isEmbeddingConfigured(): boolean {
  return Boolean(env.AI_GATEWAY_API_KEY?.trim());
}

/** Client OpenAI-compatible singleton — luôn route qua Vercel AI Gateway. */
export function getGatewayClient(): OpenAI {
  const apiKey = env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    throw new Error('AI_GATEWAY_API_KEY is not configured');
  }
  if (!client) {
    client = new OpenAI({ apiKey, baseURL: GATEWAY_BASE_URL });
  }
  return client;
}
