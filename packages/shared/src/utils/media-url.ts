/** Sinh URL ảnh JPG từ video Cloudinary (frame đầu) để dùng làm thumbnail grid. */
export function cloudinaryVideoThumbnailUrl(videoUrl: string): string {
  if (
    !videoUrl ||
    !videoUrl.includes('res.cloudinary.com') ||
    !videoUrl.includes('/video/upload/')
  ) {
    return videoUrl;
  }

  return videoUrl
    .replace('/video/upload/', '/video/upload/so_0,w_600,h_600,c_fill,f_jpg,q_auto/')
    .replace(/\.(mp4|mov|webm|mkv)(\?.*)?$/i, '.jpg$2');
}

/** URL preview cho ô grid profile — ảnh giữ nguyên, video đổi sang thumbnail JPG. */
export function profileGridPreviewUrl(url: string, isVideo: boolean): string {
  if (!url) return '';
  return isVideo ? cloudinaryVideoThumbnailUrl(url) : url;
}
