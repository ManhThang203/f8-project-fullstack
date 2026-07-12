import { Router } from 'express';

import { handleUploadMedia } from './media.controller.js';
import { attachWebAuthSession } from '../../middleware/better-auth-session.middleware.js';
import { uploadLocalMedia } from '../../middleware/local-upload.middleware.js';

export const mediaRouter = Router();

/**
 * @openapi
 * /media/upload:
 *   post:
 *     summary: Upload media cho Chat (lưu local VPS)
 *     tags: [Media]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [files]
 *             properties:
 *               files:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Custom envelope — message + data[{ mediaId, url, expiresAt }] (not ok())
 */
mediaRouter.post(
  '/upload',
  attachWebAuthSession,
  uploadLocalMedia,
  handleUploadMedia,
);
