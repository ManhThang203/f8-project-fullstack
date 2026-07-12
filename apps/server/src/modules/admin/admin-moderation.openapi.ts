/**
 * OpenAPI paths Admin — reports, moderation, hashtags, moderators, audit.
 */

/**
 * @openapi
 * /admin/reports:
 *   get:
 *     summary: Danh sách báo cáo
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CursorQuery'
 *       - $ref: '#/components/parameters/LimitQuery'
 *       - in: query
 *         name: queue
 *         schema: { type: string, enum: [open] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, UNDER_REVIEW, RESOLVED, DISMISSED, AUTO_HIDDEN] }
 *       - in: query
 *         name: targetType
 *         schema: { type: string, enum: [POST, USER, COMMENT] }
 *       - in: query
 *         name: reason
 *         schema:
 *           type: string
 *           enum: [SPAM, BULLYING, MINOR_SAFETY, SELF_HARM, VIOLENCE, RESTRICTED_GOODS, ADULT_CONTENT, MISINFORMATION, IP_VIOLATION, NOT_INTERESTED]
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: items + nextCursor
 */

/**
 * @openapi
 * /admin/reports/{id}:
 *   get:
 *     summary: Chi tiết báo cáo
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/UserIdPath'
 *     responses:
 *       200:
 *         description: Report detail
 *   patch:
 *     summary: Cập nhật status báo cáo (review / dismiss)
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
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [UNDER_REVIEW, RESOLVED, DISMISSED] }
 *               resolutionNote: { type: string, maxLength: 1000 }
 *     responses:
 *       200:
 *         description: OK
 */

/**
 * @openapi
 * /admin/reports/{id}/action:
 *   patch:
 *     summary: Thực thi hành động kiểm duyệt trên báo cáo
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
 *             required: [action, resolutionNote]
 *             properties:
 *               action: { type: string, enum: [DISMISS, HIDE_POST, DELETE_POST, WARN_USER, BAN_ACCOUNT] }
 *               resolutionNote: { type: string, minLength: 1, maxLength: 1000 }
 *               bannedUntil: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: OK
 */

/**
 * @openapi
 * /admin/moderation/cases:
 *   get:
 *     summary: Danh sách case AI phát hiện
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CursorQuery'
 *       - $ref: '#/components/parameters/LimitQuery'
 *       - in: query
 *         name: queue
 *         schema: { type: string, enum: [open] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, AUTO_HIDDEN, RESOLVED_KEPT, RESOLVED_REMOVED, DISMISSED] }
 *       - in: query
 *         name: label
 *         schema: { type: string, enum: [TOXIC, SPAM, HARASSMENT, HATE, SEXUAL, VIOLENCE, SELF_HARM, OTHER] }
 *       - in: query
 *         name: targetType
 *         schema: { type: string, enum: [POST, COMMENT] }
 *     responses:
 *       200:
 *         description: items + nextCursor
 */

/**
 * @openapi
 * /admin/moderation/cases/{id}:
 *   get:
 *     summary: Chi tiết moderation case
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/UserIdPath'
 *     responses:
 *       200:
 *         description: Case detail
 */

/**
 * @openapi
 * /admin/moderation/cases/{id}/action:
 *   patch:
 *     summary: Resolve moderation case
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
 *             required: [action, resolutionNote]
 *             properties:
 *               action: { type: string, enum: [KEEP, REMOVE, DISMISS] }
 *               resolutionNote: { type: string, minLength: 1, maxLength: 1000 }
 *     responses:
 *       200:
 *         description: OK
 */

/**
 * @openapi
 * /admin/moderation/cases/{id}/appeal:
 *   patch:
 *     summary: Duyệt kháng nghị
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
 *             required: [decision, decisionNote]
 *             properties:
 *               decision: { type: string, enum: [APPROVED, REJECTED] }
 *               decisionNote: { type: string, minLength: 1, maxLength: 1000 }
 *     responses:
 *       200:
 *         description: OK
 */

/**
 * @openapi
 * /admin/hashtags:
 *   get:
 *     summary: Danh sách hashtag (admin)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: range
 *         schema: { type: string, enum: [24h, 7d, 30d], default: 7d }
 *       - in: query
 *         name: q
 *         schema: { type: string, maxLength: 50 }
 *       - $ref: '#/components/parameters/CursorQuery'
 *       - $ref: '#/components/parameters/LimitQuery'
 *     responses:
 *       200:
 *         description: items + nextCursor
 */

/**
 * @openapi
 * /admin/hashtags/{id}:
 *   patch:
 *     summary: Feature / hide / block hashtag
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
 *             required: [action]
 *             properties:
 *               action: { type: string, enum: [feature, unfeature, hide, block, activate] }
 *     responses:
 *       200:
 *         description: OK
 */

/**
 * @openapi
 * /admin/moderators:
 *   get:
 *     summary: Danh sách moderator
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CursorQuery'
 *       - $ref: '#/components/parameters/LimitQuery'
 *     responses:
 *       200:
 *         description: items + nextCursor
 *   post:
 *     summary: Promote user thành moderator
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */

/**
 * @openapi
 * /admin/permissions:
 *   get:
 *     summary: Danh sách toàn bộ permission keys
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Permission catalog
 */

/**
 * @openapi
 * /admin/audit-logs:
 *   get:
 *     summary: Audit log
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CursorQuery'
 *       - $ref: '#/components/parameters/LimitQuery'
 *       - in: query
 *         name: actorId
 *         schema: { type: string }
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: items + nextCursor
 */

export {};
