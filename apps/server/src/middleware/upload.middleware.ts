import type { RequestHandler } from 'express';
import multer from 'multer';

import { AppError } from '../lib/errors.js';

// Upload media lên server
const upload = multer({
  storage: multer.memoryStorage(), // lưu lại file trong memory
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
    files: 10, // 10 file
  },
});

// Upload nhiều media lên server
const rawUpload = upload.array('files', 10);

// Middleware upload media lên server
export const uploadPostMedia: RequestHandler = (req, res, next) => {
  rawUpload(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(AppError.badRequest('File quá lớn (ảnh tối đa 10MB, video tối đa 500MB)'));
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return next(AppError.badRequest('Tối đa 10 file mỗi bài'));
      }
      return next(AppError.badRequest(err.message));
    }
    return next(err);
  });
};
