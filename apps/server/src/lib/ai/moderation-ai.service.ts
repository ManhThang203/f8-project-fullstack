import { createGateway } from '@ai-sdk/gateway';
import { generateObject } from 'ai';
import { z } from 'zod';

import { env } from '../../config/env.js';
import { MODERATION_CONFIG } from '../../config/moderation.config.js';
import { logger } from '../logger.js';

const classificationSchema = z.object({
  flagged: z.boolean().describe('True if content violates community guidelines'),
  label: z
    .enum(['TOXIC', 'SPAM', 'HARASSMENT', 'HATE', 'SEXUAL', 'VIOLENCE', 'SELF_HARM', 'OTHER'])
    .describe('Primary violation category'),
  confidence: z.number().min(0).max(1).describe('Confidence score 0-1'),
  reason: z.string().max(500).describe('Brief explanation in Vietnamese'),
});

export type ContentClassification = z.infer<typeof classificationSchema>;

/** Phân loại nội dung qua Vercel AI Gateway; lỗi → null (không chặn đăng bài). */
export async function classifyContent(text: string): Promise<ContentClassification | null> {
  if (!MODERATION_CONFIG.enabled || !env.AI_GATEWAY_API_KEY) {
    return null;
  }

  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    const gateway = createGateway({ apiKey: env.AI_GATEWAY_API_KEY });
    const { object } = await generateObject({
      model: gateway(MODERATION_CONFIG.aiModel),
      schema: classificationSchema,
      prompt: `You are a content moderation classifier for a Vietnamese social network.
Analyze the following user-generated text and determine if it violates guidelines (spam, harassment, hate speech, sexual content, violence, self-harm, toxic language).
Respond with structured JSON only.

Text to analyze:
"""
${trimmed.slice(0, 4000)}
"""`,
      abortSignal: AbortSignal.timeout(30_000),
    });

    if (!object.flagged) {
      return { ...object, confidence: Math.min(object.confidence, 0.5) };
    }

    return object;
  } catch (err) {
    logger.error({ err }, 'AI moderation classification failed');
    return null;
  }
}
