import type { RequestHandler } from 'express';
import sanitizeHtml from 'sanitize-html';

const SANITIZE_OPTS: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: 'discard',
};

/**
 * Strip HTML from every string value in `req.body` recursively.
 * Use on routes accepting user-generated text content. Other routes can skip.
 */
export const sanitizeBody: RequestHandler = (req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeDeep(req.body);
  }
  next();
};

function sanitizeDeep<T>(value: T): T {
  if (typeof value === 'string') {
    return sanitizeHtml(value, SANITIZE_OPTS) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeDeep) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = sanitizeDeep(v);
    return out as T;
  }
  return value;
}
