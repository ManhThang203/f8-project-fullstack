/**
 * OpenAPI paths cho Admin API — tách khỏi admin.routes.ts để giữ file routes ≤ 500 dòng.
 * swagger-jsdoc scan file này qua glob `*.openapi.ts`.
 */

/**
 * @openapi
 * /admin/me/permissions:
 *   get:
 *     summary: Quyền admin của session hiện tại
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: '{ id, permissions, role }'
 */

/**
 * @openapi
 * /admin/stats/overview:
 *   get:
 *     summary: Thống kê tổng quan
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: range
 *         schema: { type: string, enum: [24h, 7d, 30d, 90d], default: 30d }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Overview stats
 */

/**
 * @openapi
 * /admin/stats/posts-per-day:
 *   get:
 *     summary: Số bài viết theo ngày
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: range
 *         schema: { type: string, enum: [24h, 7d, 30d, 90d], default: 30d }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Time series
 */

/**
 * @openapi
 * /admin/stats/active-users:
 *   get:
 *     summary: User hoạt động theo ngày
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: range
 *         schema: { type: string, enum: [24h, 7d, 30d, 90d], default: 30d }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Time series
 */

/**
 * @openapi
 * /admin/stats/top-hashtags:
 *   get:
 *     summary: Hashtag phổ biến
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: range
 *         schema: { type: string, enum: [24h, 7d, 30d, 90d], default: 30d }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Top hashtags
 */

/**
 * @openapi
 * /admin/users:
 *   get:
 *     summary: Danh sách user (admin)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CursorQuery'
 *       - $ref: '#/components/parameters/LimitQuery'
 *       - in: query
 *         name: q
 *         schema: { type: string, maxLength: 100 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [ACTIVE, LOCKED, BANNED] }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [USER, MODERATOR, ADMIN, SUPER_ADMIN] }
 *     responses:
 *       200:
 *         description: items + nextCursor
 */

/**
 * @openapi
 * /admin/users/{id}:
 *   get:
 *     summary: Chi tiết user (admin)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/UserIdPath'
 *     responses:
 *       200:
 *         description: User detail
 */

/**
 * @openapi
 * /admin/users/{id}/status:
 *   patch:
 *     summary: Khóa / cấm / mở khóa user
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/UserIdPath'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action, reason]
 *             properties:
 *               action: { type: string, enum: [lock, unlock, ban_temp, ban_perm, unban] }
 *               reason: { type: string, minLength: 1, maxLength: 500 }
 *               bannedUntil: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: OK
 */

/**
 * @openapi
 * /admin/users/{id}/role:
 *   patch:
 *     summary: Đổi role user
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/UserIdPath'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [USER, MODERATOR, ADMIN] }
 *               reason: { type: string, maxLength: 500 }
 *     responses:
 *       200:
 *         description: OK
 */

/**
 * @openapi
 * /admin/users/{id}/permissions:
 *   get:
 *     summary: Quyền của một user
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/UserIdPath'
 *     responses:
 *       200:
 *         description: Permissions list
 *   put:
 *     summary: Grant / revoke permissions
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/UserIdPath'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               grants: { type: array, items: { type: string }, default: [] }
 *               revokes: { type: array, items: { type: string }, default: [] }
 *     responses:
 *       200:
 *         description: OK
 */

export {};
