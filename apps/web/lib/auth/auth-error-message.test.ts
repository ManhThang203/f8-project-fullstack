import { describe, expect, it } from 'vitest';

import { getAuthClientErrorMessage } from './auth-error-message';

describe('getAuthClientErrorMessage', () => {
  it('maps USERNAME_IS_ALREADY_TAKEN by code', () => {
    expect(
      getAuthClientErrorMessage(
        { code: 'USERNAME_IS_ALREADY_TAKEN', message: 'Username is already taken. Please try another.' },
        'Không thể đổi username',
      ),
    ).toBe('Username đã được sử dụng. Vui lòng chọn tên khác.');
  });

  it('maps by English message when code is missing', () => {
    expect(
      getAuthClientErrorMessage(
        { message: 'Invalid password' },
        'Không thể đổi mật khẩu',
      ),
    ).toBe('Mật khẩu hiện tại không đúng.');
  });

  it('keeps Vietnamese messages', () => {
    expect(getAuthClientErrorMessage({ message: 'Email không hợp lệ' }, 'fallback')).toBe(
      'Email không hợp lệ',
    );
  });

  it('uses fallback for unmapped English', () => {
    expect(getAuthClientErrorMessage({ message: 'Something went wrong' }, 'Thử lại sau')).toBe(
      'Thử lại sau',
    );
  });

  it('uses fallback when error is empty', () => {
    expect(getAuthClientErrorMessage(null, 'Không thể đổi email')).toBe('Không thể đổi email');
  });
});
