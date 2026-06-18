import { AppError } from '../../lib/errors.js';

export const IMAGE_MAX_BYTES = 10 * 1024 * 1024; // 10MB
export const VIDEO_MAX_BYTES = 500 * 1024 * 1024; // 500MB
export const MAX_IMAGES = 10; // 10 ảnh
export const MAX_VIDEOS = 1; // 1 video

// MIME types cho ảnh
const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
// MIME types cho video
const VIDEO_MIMES = new Set(['video/mp4', 'video/quicktime']);

// Mã base64url → một chuỗi an toàn đưa lên URL/query (?cursor=...).
export function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ t: createdAt.toISOString(), id }), 'utf8').toString(
    'base64url',
  );
}

// base64url → { createdAt: Date, id: string }
export function decodeCursor(cursor: string): { createdAt: Date; id: string } {
  try {
    const raw = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
      t?: string;
      id?: string;
    };
    if (!raw.t || !raw.id) throw new Error('invalid cursor shape');
    return { createdAt: new Date(raw.t), id: raw.id };
  } catch {
    throw AppError.badRequest('Invalid cursor');
  }
}

// Kiểm tra xem MIME type có phải là ảnh không
export function isImageMime(mime: string): boolean {
  return IMAGE_MIMES.has(mime);
}

// Kiểm tra xem MIME type có phải là video không
export function isVideoMime(mime: string): boolean {
  return VIDEO_MIMES.has(mime);
}

// Kiểm tra xem file có hợp lệ không
export function validatePostFiles(files: Express.Multer.File[], content: string): void {
  const text = content.trim();
  if (!text && files.length === 0) {
    throw AppError.badRequest('Bài viết trống');
  }

  let imageCount = 0;
  let videoCount = 0;

  for (const file of files) {
    const isImage = isImageMime(file.mimetype);
    const isVideo = isVideoMime(file.mimetype);

    if (!isImage && !isVideo) {
      throw AppError.badRequest('Chỉ hỗ trợ JPG, PNG, WebP, GIF, MP4, MOV');
    }

    if (isImage) {
      if (file.size > IMAGE_MAX_BYTES) {
        throw AppError.badRequest('Ảnh tối đa 10MB, video tối đa 500MB');
      }
      if (imageCount >= MAX_IMAGES) {
        throw AppError.badRequest(`Tối đa ${MAX_IMAGES} ảnh mỗi bài`);
      }
      if (videoCount > 0) {
        throw AppError.badRequest('Không thể đính kèm ảnh khi đã có video');
      }
      imageCount += 1;
      continue;
    }

    if (file.size > VIDEO_MAX_BYTES) {
      throw AppError.badRequest('Ảnh tối đa 10MB, video tối đa 500MB');
    }
    if (videoCount >= MAX_VIDEOS) {
      throw AppError.badRequest('Chỉ được đính kèm tối đa 1 video');
    }
    if (imageCount > 0) {
      throw AppError.badRequest('Không thể đính kèm video khi đã có ảnh');
    }
    videoCount += 1;
  }
}

/** Fisher-Yates shuffle (in-place). */
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/** Lấy id bài gốc từ parent trực tiếp (comment hoặc nested reply). */
export function resolveRootPostId(parent: { id: string; parentId: string | null }): string {
  return parent.parentId ?? parent.id;
}

/** Trích các @username từ nội dung (tối đa 10) để tạo notification mention. */
export function parseMentions(content: string): string[] {
  const matches = content.match(/@([a-zA-Z0-9_.]+)/g) ?? [];
  const usernames = matches.map((m) => m.slice(1).toLowerCase());
  return [...new Set(usernames)].slice(0, 10);
}
