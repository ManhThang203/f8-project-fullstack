import { Router } from 'express';
import {
  appealSubmitSchema,
  cursorPageQuerySchema,
  ok,
  updateMyProfileSchema,
  updateUserSettingsSchema,
  type CursorPageQuery,
} from '@costy/shared';

import { AppError } from '../../lib/errors.js';
import { isCloudinaryConfigured, uploadBuffer } from '../../lib/cloudinary.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireActiveAccount } from '../../middleware/auth-context.middleware.js';
import { uploadSingleImage } from '../../middleware/upload.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { getMyModerationCase, submitAppeal } from '../moderation/moderation.service.js';
import { listSavedPosts } from '../posts/posts.service.js';
import { setProfileImage, updateMyProfile } from '../users/users.service.js';
import { getMySettings, updateMySettings } from './me.settings.service.js';

export const meRouter = Router();

/** Upload 1 ảnh lên Cloudinary và set vào field image/coverImage của user. */
async function handleImageUpload(
  userId: string,
  field: 'image' | 'coverImage',
  file: Express.Multer.File | undefined,
): Promise<{ url: string }> {
  if (!file) throw AppError.badRequest('Thiếu file ảnh');
  if (!file.mimetype.startsWith('image/')) {
    throw AppError.badRequest('Chỉ chấp nhận file ảnh');
  }
  if (!isCloudinaryConfigured()) {
    throw AppError.badRequest('Chưa cấu hình lưu trữ ảnh');
  }
  const result = await uploadBuffer(file.buffer, file.mimetype, 'avatars');
  return setProfileImage(userId, field, result.secureUrl);
}

function paramId(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0]! : value!;
}

meRouter.use(requireAuth, requireActiveAccount);

/**
 * @openapi
 * /me/profile:
 *   patch:
 *     summary: Cập nhật tên / tiểu sử của chính mình
 *     tags: [Me]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateMyProfileBody'
 *     responses:
 *       200:
 *         description: Profile đã cập nhật
 */
meRouter.patch('/profile', validate(updateMyProfileSchema, 'body'), async (req, res, next) => {
  try {
    const profile = await updateMyProfile(req.auth!.userId, req.body);
    res.json(ok(profile));
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /me/settings:
 *   get:
 *     summary: Lấy cài đặt quyền riêng tư và thông báo
 *     tags: [Me]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Settings
 */
meRouter.get('/settings', async (req, res, next) => {
  try {
    const data = await getMySettings(req.auth!.userId);
    res.json(ok(data));
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /me/settings:
 *   patch:
 *     summary: Cập nhật cài đặt quyền riêng tư và thông báo
 *     tags: [Me]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserSettingsBody'
 *     responses:
 *       200:
 *         description: Settings đã cập nhật
 */
meRouter.patch('/settings', validate(updateUserSettingsSchema, 'body'), async (req, res, next) => {
  try {
    const data = await updateMySettings(req.auth!.userId, req.body);
    res.json(ok(data));
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /me/avatar:
 *   post:
 *     summary: Cập nhật ảnh đại diện
 *     tags: [Me]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: '{ url }'
 */
meRouter.post('/avatar', uploadSingleImage, async (req, res, next) => {
  try {
    const data = await handleImageUpload(req.auth!.userId, 'image', req.file);
    res.json(ok(data));
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /me/cover:
 *   post:
 *     summary: Cập nhật ảnh bìa
 *     tags: [Me]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: '{ url }'
 */
meRouter.post('/cover', uploadSingleImage, async (req, res, next) => {
  try {
    const data = await handleImageUpload(req.auth!.userId, 'coverImage', req.file);
    res.json(ok(data));
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /me/saved:
 *   get:
 *     summary: Danh sách bài viết mình đã lưu
 *     tags: [Me]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CursorQuery'
 *       - $ref: '#/components/parameters/LimitQuery'
 *     responses:
 *       200:
 *         description: items + nextCursor
 */
meRouter.get('/saved', validate(cursorPageQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { items, nextCursor } = await listSavedPosts(
      req.auth!.userId,
      req.query as unknown as CursorPageQuery,
    );
    res.json(ok(items, { nextCursor }));
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /me/moderation/cases/{id}:
 *   get:
 *     summary: Xem chi tiết case kiểm duyệt của mình
 *     tags: [Me]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/UserIdPath'
 *     responses:
 *       200:
 *         description: Moderation case
 */
meRouter.get('/moderation/cases/:id', async (req, res, next) => {
  try {
    const data = await getMyModerationCase(req.auth!.userId, paramId(req.params.id));
    res.json(ok(data));
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /me/moderation/cases/{id}/appeal:
 *   post:
 *     summary: Gửi kháng nghị case kiểm duyệt
 *     tags: [Me]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/UserIdPath'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AppealSubmitBody'
 *     responses:
 *       201:
 *         description: Appeal đã tạo
 */
meRouter.post(
  '/moderation/cases/:id/appeal',
  validate(appealSubmitSchema, 'body'),
  async (req, res, next) => {
    try {
      const data = await submitAppeal(req.auth!.userId, paramId(req.params.id), req.body);
      res.status(201).json(ok(data));
    } catch (e) {
      next(e);
    }
  },
);
