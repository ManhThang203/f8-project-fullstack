/**
 * Client-side media processing for E2EE chat
 */

export type ProcessedMedia = {
  width: number;
  height: number;
  blurDataUrl: string; // tiny base64 image
};

export async function processImageForEncryption(file: File): Promise<ProcessedMedia> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      URL.revokeObjectURL(url);

      // Create a tiny canvas for the blur placeholder
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 16;
      let w = width;
      let h = height;
      if (w > h) {
        h = Math.round((h * MAX_SIZE) / w);
        w = MAX_SIZE;
      } else {
        w = Math.round((w * MAX_SIZE) / h);
        h = MAX_SIZE;
      }
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
      }

      // Convert to webp/jpeg data url
      const blurDataUrl = canvas.toDataURL('image/jpeg', 0.5);

      resolve({ width, height, blurDataUrl });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Lỗi đọc ảnh'));
    };
    img.src = url;
  });
}
