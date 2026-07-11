import { ErrorCode } from '@costy/shared';
import { describe, expect, it } from 'vitest';

import { ApiQueryError } from './api-query';
import { getUserFacingErrorMessage } from './user-facing-error';

describe('getUserFacingErrorMessage', () => {
  it('ẩn thông báo kỹ thuật HTTP 500', () => {
    const error = new ApiQueryError('Phản hồi rỗng từ server (HTTP 500).', ErrorCode.INTERNAL_ERROR);
    expect(getUserFacingErrorMessage(error)).toBe(
      'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.',
    );
  });

  it('giữ thông báo server thân thiện', () => {
    const error = new ApiQueryError('Mật khẩu không đúng.', ErrorCode.UNAUTHORIZED);
    expect(getUserFacingErrorMessage(error)).toBe('Mật khẩu không đúng.');
  });

  it('map lỗi mạng sang câu dễ hiểu', () => {
    expect(getUserFacingErrorMessage(new Error('Failed to fetch'))).toBe(
      'Không thể kết nối. Kiểm tra internet và thử lại.',
    );
  });

  it('ẩn message tiếng Anh và dùng fallback theo code', () => {
    const error = new ApiQueryError('Internal server error', ErrorCode.INTERNAL_ERROR);
    expect(getUserFacingErrorMessage(error)).toBe(
      'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.',
    );
  });

  it('ẩn message tiếng Anh không có code', () => {
    expect(getUserFacingErrorMessage(new Error('Something went wrong'), 'Thử lại sau')).toBe(
      'Thử lại sau',
    );
  });

  it('nhận chuỗi thuần và ẩn tiếng Anh', () => {
    expect(getUserFacingErrorMessage('Reel not found', 'Không tìm thấy nội dung')).toBe(
      'Không tìm thấy nội dung',
    );
  });
});
