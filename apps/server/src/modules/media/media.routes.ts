import { Router } from 'express';

import { handleUploadMedia } from './media.controller.js';
import { attachBetterAuthSession } from '../../middleware/better-auth-session.middleware.js';
import { uploadLocalMedia } from '../../middleware/local-upload.middleware.js';

export const mediaRouter = Router();

// Endpoint upload dành riêng cho E2EE Chat (lưu tại VPS)
mediaRouter.post(
  '/upload',
  attachBetterAuthSession, // Đảm bảo user đã đăng nhập
  uploadLocalMedia,        // Xử lý multipart/form-data lưu vào đĩa
  handleUploadMedia,
);
