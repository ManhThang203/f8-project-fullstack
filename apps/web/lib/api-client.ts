import type { ApiResponse } from '@threads/shared';
import { ErrorCode } from '@threads/shared';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api';

function parseJsonBody<TData>(text: string, status: number): ApiResponse<TData> {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message:
          status === 502 || status === 503 || status === 504
            ? 'API không phản hồi — hãy kiểm tra server đang chạy và UPSTREAM_API_URL.'
            : `Phản hồi rỗng từ server (HTTP ${status}).`,
      },
    };
  }

  try {
    return JSON.parse(trimmed) as ApiResponse<TData>;
  } catch {
    return {
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: `Phản hồi không phải JSON (HTTP ${status}).`,
        details: trimmed.length > 400 ? `${trimmed.slice(0, 400)}…` : trimmed,
      },
    };
  }
}

/**
 * Client-side fetch wrapper. Always hits the Next.js BFF (`/api/v1/*`),
 * which proxies to Express. Returns the parsed API envelope.
 */
export async function apiFetch<TData>(
  path: string,
  init?: RequestInit,
): Promise<ApiResponse<TData>> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/v1${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      credentials: 'include',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    return {
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: `Không gọi được API: ${message}. Kiểm tra mạng và backend (port 4000).`,
      },
    };
  }

  const text = await res.text();
  return parseJsonBody<TData>(text, res.status);
}
