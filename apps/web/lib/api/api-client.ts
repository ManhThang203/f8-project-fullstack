import type { ApiResponse } from '@costy/shared';
import { ErrorCode } from '@costy/shared';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api';

// Chuyển đổi text thành ApiResponse<TData, TMeta>
function parseJsonBody<TData, TMeta = undefined>(
  text: string,
  status: number,
): ApiResponse<TData, TMeta> {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message:
          status === 502 || status === 503 || status === 504
            ? 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại sau.'
            : status >= 500
              ? 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.'
              : 'Không tải được dữ liệu. Vui lòng thử lại sau.',
      },
    };
  }

  try {
    return JSON.parse(trimmed) as ApiResponse<TData, TMeta>;
  } catch {
    return {
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Hệ thống phản hồi không đúng. Vui lòng thử lại sau.',
        details: trimmed.length > 400 ? `${trimmed.slice(0, 400)}…` : trimmed,
      },
    };
  }
}

/**
 * Client-side fetch wrapper. Always hits the Next.js BFF (`/api/v1/*`),
 * which proxies to Express. Returns the parsed API envelope.
 */
export async function apiFetch<TData, TMeta = undefined>(
  path: string,
  init?: RequestInit,
): Promise<ApiResponse<TData, TMeta>> {
  let res: Response;
  const headers = { 'Content-Type': 'application/json', ...init?.headers } as Record<
    string,
    string
  >;
  if (init?.body instanceof FormData) {
    // Let browser set the content type with boundary automatically
    delete headers['Content-Type'];
  }

  try {
    res = await fetch(`${BASE}/v1${path}`, {
      ...init,
      headers,
      credentials: 'include',
    });
  } catch {
    return {
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Không thể kết nối. Kiểm tra internet và thử lại.',
      },
    };
  }

  const text = await res.text();
  return parseJsonBody<TData>(text, res.status);
}
