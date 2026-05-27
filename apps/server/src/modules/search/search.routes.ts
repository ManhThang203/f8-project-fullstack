import type { SearchMode } from '@threads/shared';
import { ok, searchQuerySchema, type SearchQuery } from '@threads/shared';
import { Router } from 'express';

import { validate } from '../../middleware/validate.middleware.js';

import { hybridSearch } from './search.service.js';

const router = Router();

/**
 * @openapi
 * /search:
 *   get:
 *     summary: Hybrid post search (FTS + semantic RRF)
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/', validate(searchQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { q, limit } = req.query as unknown as SearchQuery;
    const { results, searchMode } = await hybridSearch(q, { limit });
    res.json(
      ok(results, {
        total: results.length,
        query: q,
        searchMode,
      } satisfies { total: number; query: string; searchMode: SearchMode }),
    );
  } catch (e) {
    next(e);
  }
});

export { router as searchRouter };
