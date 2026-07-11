import { ErrorCode } from '@costy/shared';

import { isApiQueryError } from './api-query';

const DEFAULT_MESSAGE = 'Đã xảy ra lỗi. Vui lòng thử lại sau.';

const MESSAGE_BY_CODE: Partial<Record<string, string>> = {
  [ErrorCode.UNAUTHORIZED]: 'Bạn cần đăng nhập để tiếp tục.',
  [ErrorCode.FORBIDDEN]: 'Bạn không có quyền xem nội dung này.',
  [ErrorCode.NOT_FOUND]: 'Không tìm thấy nội dung.',
  [ErrorCode.RATE_LIMITED]: 'Bạn thao tác quá nhanh. Vui lòng chờ một chút rồi thử lại.',
  [ErrorCode.CONFLICT]: 'Thao tác không thành công. Vui lòng thử lại.',
  [ErrorCode.VALIDATION_ERROR]: 'Thông tin không hợp lệ. Vui lòng kiểm tra lại.',
  [ErrorCode.BAD_REQUEST]: 'Yêu cầu không hợp lệ. Vui lòng thử lại.',
  [ErrorCode.INTERNAL_ERROR]: 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.',
};

const TECHNICAL_MESSAGE =
  /HTTP\s*\d+|Phản hồi rỗng|Không gọi được API|UPSTREAM|port\s*\d+|JSON|Network error|backend|seed/i;

function isTechnicalMessage(message: string): boolean {
  return TECHNICAL_MESSAGE.test(message);
}

/** Message toàn ASCII Latin — thường là tiếng Anh từ thư viện / Better Auth / Express. */
function looksLikeEnglish(message: string): boolean {
  return /^[\x20-\x7E]+$/.test(message) && /[A-Za-z]{3,}/.test(message);
}

/** Chọn câu tiếng Việt từ message + mã lỗi; ẩn câu kỹ thuật / tiếng Anh. */
function localizeMessage(message: string, code: string | undefined, fallback: string): string {
  const trimmed = message.trim();
  if (trimmed && !isTechnicalMessage(trimmed) && !looksLikeEnglish(trimmed)) {
    return trimmed;
  }
  if (code && MESSAGE_BY_CODE[code]) return MESSAGE_BY_CODE[code]!;
  return fallback;
}

/** Chuyển lỗi API hoặc network sang câu dễ hiểu cho người dùng. */
export function getUserFacingErrorMessage(
  error: unknown,
  fallback: string = DEFAULT_MESSAGE,
): string {
  if (typeof error === 'string') {
    return localizeMessage(error, undefined, fallback);
  }

  if (isApiQueryError(error)) {
    return localizeMessage(error.message ?? '', error.code, fallback);
  }

  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    const code =
      'code' in error && typeof (error as { code: unknown }).code === 'string'
        ? (error as { code: string }).code
        : undefined;
    const message = (error as { message: string }).message;

    if (/network|fetch|failed to fetch/i.test(message)) {
      return 'Không thể kết nối. Kiểm tra internet và thử lại.';
    }

    return localizeMessage(message, code, fallback);
  }

  return fallback;
}
