import { Router } from 'express';

import { handleUploadMedia } from './media.controller.js';
import { attachWebAuthSession } from '../../middleware/better-auth-session.middleware.js';
import { uploadLocalMedia } from '../../middleware/local-upload.middleware.js';

export const mediaRouter = Router();

// Endpoint upload media cho Chat (lưu tại VPS)
mediaRouter.post(
  '/upload',
  attachWebAuthSession, // Đảm bảo user đã đăng nhập
  uploadLocalMedia, // Xử lý multipart/form-data lưu vào đĩa
  handleUploadMedia,
);
