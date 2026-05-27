import type { ApiResponse, PostFeedItemDto } from '@threads/shared';

export type CreatePostWithMediaResult =
  | { ok: true; post: PostFeedItemDto }
  | { ok: false; message: string };

const BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api';
// Chuyển đổi text thành ApiResponse<PostFeedItemDto>
function parseResponse(text: string): ApiResponse<PostFeedItemDto> | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as ApiResponse<PostFeedItemDto>;
  } catch {
    return null;
  }
}

// Tạo bài viết với media
export async function createPostWithMedia(opts: {
  content: string;
  files: File[];
  parentId?: string;
  onUploadProgress?: (fileIndex: number, percent: number, fileName: string) => void;
}): Promise<CreatePostWithMediaResult> {
  const formData = new FormData();
  formData.append('content', opts.content.trim());
  if (opts.parentId) {
    formData.append('parentId', opts.parentId);
  }
  for (const file of opts.files) {
    formData.append('files', file);
  }

  const sizes = opts.files.map((f) => f.size);
  const cumulative: number[] = [];
  let sum = 0;
  for (const size of sizes) {
    sum += size;
    cumulative.push(sum);
  }

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE}/v1/posts`);
    xhr.withCredentials = true;

    xhr.upload.onprogress = (ev) => {
      if (!ev.lengthComputable || !opts.onUploadProgress || opts.files.length === 0) return;

      const percent = Math.min(100, Math.round((ev.loaded / ev.total) * 100));
      let fileIndex = 0;
      for (let i = 0; i < cumulative.length; i++) {
        if (ev.loaded <= cumulative[i]!) {
          fileIndex = i;
          break;
        }
        fileIndex = i;
      }

      const fileName = opts.files[fileIndex]?.name ?? '';
      opts.onUploadProgress(fileIndex, percent, fileName);
    };

    xhr.onload = () => {
      const parsed = parseResponse(xhr.responseText);
      if (!parsed) {
        resolve({
          ok: false,
          message: `Phản hồi không hợp lệ từ server (HTTP ${xhr.status}).`,
        });
        return;
      }
      if (!parsed.success) {
        resolve({
          ok: false,
          message: parsed.error?.message ?? 'Đăng bài thất bại',
        });
        return;
      }
      resolve({ ok: true, post: parsed.data });
    };

    xhr.onerror = () => {
      resolve({
        ok: false,
        message: 'Không gọi được API. Kiểm tra mạng và backend (port 4000).',
      });
    };

    xhr.onabort = () => {
      resolve({ ok: false, message: 'Đã hủy tải lên' });
    };

    xhr.send(formData);
  });
}
