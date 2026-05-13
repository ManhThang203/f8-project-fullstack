import type { RequestHandler } from 'express';
import type { ZodSchema } from 'zod';

type Source = 'body' | 'query' | 'params';

/**
 * Express middleware that runs a Zod schema against `req[source]`.
 * Replaces the parsed (and coerced) value back onto the request so downstream
 * handlers see typed, validated data.
 *
 * Errors propagate as ZodError; the global error middleware translates them.
 */
export function validate(schema: ZodSchema, source: Source = 'body'): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) return next(result.error);
    // Re-assign to keep types narrow downstream.
    Object.assign(req, { [source]: result.data });
    next();
  };
}
