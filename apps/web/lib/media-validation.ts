export const IMAGE_MAX_BYTES = 10 * 1024 * 1024; // 10MB
export const VIDEO_MAX_BYTES = 500 * 1024 * 1024; // 500MB
export const MAX_IMAGES = 10; // 10 ảnh
export const MAX_VIDEOS = 1; // 1 video

export const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']); // MIME types cho ảnh
export const VIDEO_MIMES = new Set(['video/mp4', 'video/quicktime']);

export const ACCEPT_MEDIA = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime';

export function isImageMime(mime: string): boolean {
  return IMAGE_MIMES.has(mime);
}

export function isVideoMime(mime: string): boolean {
  return VIDEO_MIMES.has(mime);
}

export function validateFiles(
  files: File[],
  existing: { images: number; videos: number },
): { ok: File[]; errors: string[] } {
  const errors: string[] = [];
  const ok: File[] = [];
  let imageCount = existing.images;
  let videoCount = existing.videos;

  for (const file of files) {
    const isImage = isImageMime(file.type);
    const isVideo = isVideoMime(file.type);

    if (!isImage && !isVideo) {
      errors.push('Chỉ hỗ trợ JPG, PNG, WebP, GIF, MP4, MOV');
      continue;
    }

    if (isImage) {
      if (file.size > IMAGE_MAX_BYTES) {
        errors.push('Ảnh tối đa 10MB, video tối đa 500MB');
        continue;
      }
      if (imageCount >= MAX_IMAGES) {
        errors.push(`Tối đa ${MAX_IMAGES} ảnh mỗi bài`);
        continue;
      }
      if (videoCount > 0) {
        errors.push('Không thể đính kèm ảnh khi đã có video');
        continue;
      }
      imageCount += 1;
      ok.push(file);
      continue;
    }

    if (file.size > VIDEO_MAX_BYTES) {
      errors.push('Ảnh tối đa 10MB, video tối đa 500MB');
      continue;
    }
    if (videoCount >= MAX_VIDEOS) {
      errors.push('Chỉ được đính kèm tối đa 1 video');
      continue;
    }
    if (imageCount > 0) {
      errors.push('Không thể đính kèm video khi đã có ảnh');
      continue;
    }
    videoCount += 1;
    ok.push(file);
  }

  return { ok, errors: [...new Set(errors)] };
}
