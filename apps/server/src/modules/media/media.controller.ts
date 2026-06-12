import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@costy/db';
import { AppError } from '../../lib/errors.js';

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
      const isVideo = file.mimetype.startsWith('video');
      const kind = isVideo ? 'VIDEO' : 'IMAGE';
      const publicUrl = `/api/v1/media/uploads/${file.filename}`;

      const mediaRecord = await prisma.media.create({
        data: {
          ownerId: userId,
          kind,
          status: 'READY',
          mimeType: file.mimetype || 'application/octet-stream',
          sizeBytes: file.size,
          storagePath: file.filename, // Chỉ lưu filename, thư mục là uploads/
          publicUrl, // URL tĩnh để client render trực tiếp (mount static folder trong app.ts)
          expiresAt,
        },
      });

      uploadedMedia.push({
        mediaId: mediaRecord.id,
        url: publicUrl,
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
