import type { SearchMode } from '@costy/shared';
import { ok, searchQuerySchema, type SearchQuery } from '@costy/shared';
import { Router } from 'express';

import { validate } from '../../middleware/validate.middleware.js';

import { searchHashtags, searchUsers } from './search.extra.js';
import { hybridSearch } from './search.service.js';

const router = Router();

/**
 * @openapi
 * /search:
 *   get:
 *     summary: Hybrid post search (FTS + semantic RRF)
 *     tags: [Search]
 *     security:
 *       - {}
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string, minLength: 2, maxLength: 200 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 20 }
 *     responses:
 *       200:
 *         description: Search results with meta total, query, searchMode
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

/**
 * @openapi
 * /search/users:
 *   get:
 *     summary: Tìm người dùng theo tên / username
 *     tags: [Search]
 *     security:
 *       - {}
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string, minLength: 2, maxLength: 200 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 20 }
 *     responses:
 *       200:
 *         description: Danh sách user với meta total, query
 */
router.get('/users', validate(searchQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { q, limit } = req.query as unknown as SearchQuery;
    const viewerId = req.auth?.userId ?? null;
    const results = await searchUsers(q, limit, viewerId);
    res.json(ok(results, { total: results.length, query: q }));
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /search/hashtags:
 *   get:
 *     summary: Tìm hashtag theo chuỗi
 *     tags: [Search]
 *     security:
 *       - {}
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string, minLength: 2, maxLength: 200 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 20 }
 *     responses:
 *       200:
 *         description: Danh sách hashtag với meta total, query
 */
router.get('/hashtags', validate(searchQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { q, limit } = req.query as unknown as SearchQuery;
    const results = await searchHashtags(q, limit);
    res.json(ok(results, { total: results.length, query: q }));
  } catch (e) {
    next(e);
  }
});

export { router as searchRouter };
