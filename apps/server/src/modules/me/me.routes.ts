import { Router } from 'express';
import {
  appealSubmitSchema,
  cursorPageQuerySchema,
  ok,
  updateMyProfileSchema,
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

/** PATCH /me/profile — cập nhật tên / tiểu sử của chính mình. */
meRouter.patch('/profile', validate(updateMyProfileSchema, 'body'), async (req, res, next) => {
  try {
    const profile = await updateMyProfile(req.auth!.userId, req.body);
    res.json(ok(profile));
  } catch (e) {
    next(e);
  }
});

/** POST /me/avatar — cập nhật ảnh đại diện (multipart 'file'). */
meRouter.post('/avatar', uploadSingleImage, async (req, res, next) => {
  try {
    const data = await handleImageUpload(req.auth!.userId, 'image', req.file);
    res.json(ok(data));
  } catch (e) {
    next(e);
  }
});

/** POST /me/cover — cập nhật ảnh bìa (multipart 'file'). */
meRouter.post('/cover', uploadSingleImage, async (req, res, next) => {
  try {
    const data = await handleImageUpload(req.auth!.userId, 'coverImage', req.file);
    res.json(ok(data));
  } catch (e) {
    next(e);
  }
});

/** GET /me/saved — danh sách bài viết mình đã lưu. */
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

/** GET /me/moderation/cases/:id — User xem chi tiết case kiểm duyệt của mình. */
meRouter.get('/moderation/cases/:id', async (req, res, next) => {
  try {
    const data = await getMyModerationCase(req.auth!.userId, paramId(req.params.id));
    res.json(ok(data));
  } catch (e) {
    next(e);
  }
});

/** POST /me/moderation/cases/:id/appeal — User gửi kháng nghị. */
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
