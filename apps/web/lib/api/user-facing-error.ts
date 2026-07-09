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

/** Chuyển lỗi API hoặc network sang câu dễ hiểu cho người dùng. */
export function getUserFacingErrorMessage(
  error: unknown,
  fallback: string = DEFAULT_MESSAGE,
): string {
  if (isApiQueryError(error)) {
    const mapped = MESSAGE_BY_CODE[error.code];
    if (mapped && (error.code === ErrorCode.INTERNAL_ERROR || isTechnicalMessage(error.message))) {
      return mapped;
    }
    if (error.message && !isTechnicalMessage(error.message)) {
      return error.message;
    }
    return mapped ?? fallback;
  }

  if (error instanceof Error && error.message) {
    if (/network|fetch|failed to fetch/i.test(error.message)) {
      return 'Không thể kết nối. Kiểm tra internet và thử lại.';
    }
    if (isTechnicalMessage(error.message)) {
      return fallback;
    }
    return error.message;
  }

  return fallback;
}
