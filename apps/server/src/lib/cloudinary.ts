import { v2 as cloudinary } from 'cloudinary';

import { env } from '../config/env.js';

// Khởi tạo Cloudinary
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Type cho kết quả upload Cloudinary
export type CloudinaryUploadResult = {
  secureUrl: string;
  publicId: string;
  width: number | null;
  height: number | null;
  bytes: number;
  durationMs: number | null;
  resourceType: 'image' | 'video';
};

// Kiểm tra xem Cloudinary có được cấu hình không
export function isCloudinaryConfigured(): boolean {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}

// Chuyển đổi lỗi Cloudinary thành Error
function toUploadError(error: unknown): Error {
  if (error && typeof error === 'object') {
    const e = error as { message?: string; http_code?: number };
    const msg = e.message?.trim() || 'Cloudinary upload failed';
    const suffix = e.http_code != null ? ` (HTTP ${e.http_code})` : '';
    return new Error(`${msg}${suffix}`);
  }
  return error instanceof Error ? error : new Error(String(error));
}

// Upload buffer lên Cloudinary
export function uploadBuffer(
  buffer: Buffer,
  mimeType: string,
  folder = 'posts',
): Promise<CloudinaryUploadResult> {
  // Xác định loại resource (image hoặc video)
  const resourceType: 'image' | 'video' = mimeType.startsWith('video/') ? 'video' : 'image';

  return new Promise((resolve, reject) => {
    // Tạo stream upload lên Cloudinary
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result) => {
        if (error) return reject(toUploadError(error));
        // Nếu kết quả không hợp lệ, trả về lỗi
        if (!result?.secure_url || !result.public_id) {
          return reject(new Error('Cloudinary returned an empty result'));
        }
        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
          width: result.width ?? null,
          height: result.height ?? null,
          bytes: result.bytes ?? buffer.length,
          durationMs: result.duration != null ? Math.round(result.duration * 1000) : null,
          resourceType,
        });
      },
    );
    stream.end(buffer);
  });
}

// Xóa nhiều media lên Cloudinary
export async function destroyMany(
  items: Array<{ publicId: string; resourceType: 'image' | 'video' }>,
): Promise<void> {
  if (items.length === 0) return;
  await Promise.allSettled(
    items.map(({ publicId, resourceType }) =>
      cloudinary.uploader.destroy(publicId, { resource_type: resourceType }),
    ),
  );
}
