import { env } from './env.js';

/** Cấu hình AI content moderation — ngưỡng và model từ env. */
export const MODERATION_CONFIG = {
  enabled:
    env.MODERATION_ENABLED ?? Boolean(env.AI_GATEWAY_API_KEY && env.AI_GATEWAY_API_KEY.length > 0),
  aiModel: env.MODERATION_AI_MODEL,
  autoHideThreshold: env.MODERATION_AUTO_HIDE_THRESHOLD,
  reviewThreshold: env.MODERATION_REVIEW_THRESHOLD,
} as const;
