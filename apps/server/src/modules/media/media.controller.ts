import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@costy/db';
import { AppError } from '../../lib/errors.js';
import { env } from '../../config/env.js';

export const handleUploadMedia = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      throw AppError.unauthorized('Vui lòng đăng nhập');
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      throw AppError.badRequest('Không có file nào được tải lên');
    }

    const uploadedMedia = [];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Hết hạn sau 7 ngày

    for (const file of files) {
      // Vì là file mã hóa E2EE, chúng ta có thể gán tạm kind là IMAGE hoặc file (tùy mime)
      // Dù mã hóa, nhưng ta cứ set kind chung là IMAGE hoặc kiểm tra từ client
      const isVideo = file.mimetype.startsWith('video');
      const kind = isVideo ? 'VIDEO' : 'IMAGE';

      const mediaRecord = await prisma.media.create({
        data: {
          ownerId: userId,
          kind,
          status: 'READY',
          mimeType: file.mimetype || 'application/octet-stream',
          sizeBytes: file.size,
          storagePath: file.filename, // Chỉ lưu filename, thư mục là uploads/
          expiresAt, 
        },
      });

      uploadedMedia.push({
        mediaId: mediaRecord.id,
        // Cung cấp URL tĩnh (phải mount static folder trong app.ts)
        url: `/api/v1/media/uploads/${file.filename}`,
        expiresAt,
      });
    }

    res.status(201).json({
      message: 'Upload thành công',
      data: uploadedMedia,
    });
  } catch (error) {
    next(error);
  }
};
