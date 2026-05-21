import { MediaKind, MediaStatus, prisma } from '@threads/db';
import type { CreatePostBody, CursorPageQuery, PostFeedItemDto } from '@threads/shared';

import {
  destroyMany,
  isCloudinaryConfigured,
  uploadBuffer,
  type CloudinaryUploadResult,
} from '../../lib/cloudinary.js';
import { AppError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';

import { mapPostToFeedItemDto, postFeedInclude } from './posts.mapper.js';

const IMAGE_MAX_BYTES = 10 * 1024 * 1024; // 10MB
const VIDEO_MAX_BYTES = 500 * 1024 * 1024; // 500MB
const MAX_IMAGES = 10; // 10 ảnh
const MAX_VIDEOS = 1; // 1 video

// MIME types cho ảnh
const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
// MIME types cho video
const VIDEO_MIMES = new Set(['video/mp4', 'video/quicktime']);

// Mã base64url → một chuỗi an toàn đưa lên URL/query (?cursor=...).
function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ t: createdAt.toISOString(), id }), 'utf8').toString(
    'base64url',
  );
}

// base64url → { createdAt: Date, id: string }
function decodeCursor(cursor: string): { createdAt: Date; id: string } {
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
function isImageMime(mime: string): boolean {
  return IMAGE_MIMES.has(mime);
}

// Kiểm tra xem MIME type có phải là video không
function isVideoMime(mime: string): boolean {
  return VIDEO_MIMES.has(mime);
}

// Kiểm tra xem file có hợp lệ không
function validatePostFiles(files: Express.Multer.File[], content: string): void {
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

// Lấy danh sách bài viết + phân trang khi cuộn xuống
export async function listFeed(query: CursorPageQuery): Promise<{
  items: PostFeedItemDto[];
  nextCursor: string | null;
}> {
  const take = query.limit + 1;
  const cursorData = query.cursor ? decodeCursor(query.cursor) : null;

  const where = cursorData
    ? {
        deletedAt: null,
        parentId: null,
        OR: [
          { createdAt: { lt: cursorData.createdAt } },
          { AND: [{ createdAt: { equals: cursorData.createdAt } }, { id: { lt: cursorData.id } }] },
        ],
      }
    : {
        deletedAt: null,
        parentId: null,
      };

  const rows = await prisma.post.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
    include: postFeedInclude,
  });

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;

  const items = page.map((p) => mapPostToFeedItemDto(p));

  const tail = page[page.length - 1];
  const nextCursor = hasMore && tail ? encodeCursor(tail.createdAt, tail.id) : null;

  return { items, nextCursor };
}

// Tạo bài viết
export async function createPost(opts: {
  authorId: string;
  body: CreatePostBody;
  files: Express.Multer.File[];
}): Promise<PostFeedItemDto> {
  const content = opts.body.content?.trim() ?? '';
  validatePostFiles(opts.files, content);

  if (opts.files.length > 0 && !isCloudinaryConfigured()) {
    throw AppError.badRequest('Cloudinary chưa được cấu hình trên server');
  }

  const uploaded: CloudinaryUploadResult[] = [];

  if (opts.files.length > 0) {
    const settled = await Promise.allSettled(
      opts.files.map((file) => uploadBuffer(file.buffer, file.mimetype)),
    );

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        uploaded.push(result.value);
        continue;
      }

      await destroyMany(
        uploaded.map((u) => ({ publicId: u.publicId, resourceType: u.resourceType })),
      );
      const message = result.reason instanceof Error ? result.reason.message : 'Upload thất bại';
      logger.error({ err: result.reason }, 'Cloudinary upload failed during createPost');
      throw AppError.badRequest(`Không tải được media: ${message}`);
    }
  }

  try {
    const postId = await prisma.$transaction(async (tx) => {
      const post = await tx.post.create({
        data: {
          authorId: opts.authorId,
          content: content || '',
          parentId: opts.body.parentId ?? null,
        },
      });

      if (uploaded.length > 0) {
        await tx.media.createMany({
          data: uploaded.map((result, index) => {
            const file = opts.files[index]!;
            const isVideo = isVideoMime(file.mimetype);
            return {
              ownerId: opts.authorId,
              postId: post.id,
              kind: isVideo ? MediaKind.VIDEO : MediaKind.IMAGE,
              status: MediaStatus.READY,
              mimeType: file.mimetype,
              sizeBytes: result.bytes,
              storageKey: result.publicId,
              publicUrl: result.secureUrl,
              width: result.width,
              height: result.height,
              durationMs: result.durationMs,
            };
          }),
        });
      }

      return post.id;
    });

    const row = await prisma.post.findUniqueOrThrow({
      where: { id: postId },
      include: postFeedInclude,
    });

    return mapPostToFeedItemDto(row);
  } catch (error) {
    if (uploaded.length > 0) {
      await destroyMany(
        uploaded.map((u) => ({ publicId: u.publicId, resourceType: u.resourceType })),
      );
    }
    throw error;
  }
}
