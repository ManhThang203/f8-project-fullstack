type AuthClientError = {
  code?: string | null;
  message?: string | null;
};

/** Map mã / message tiếng Anh từ Better Auth sang câu tiếng Việt. */
const BY_CODE: Record<string, string> = {
  USERNAME_IS_ALREADY_TAKEN: 'Username đã được sử dụng. Vui lòng chọn tên khác.',
  USERNAME_TOO_SHORT: 'Username quá ngắn.',
  USERNAME_TOO_LONG: 'Username quá dài.',
  INVALID_USERNAME: 'Username không hợp lệ.',
  INVALID_DISPLAY_USERNAME: 'Tên hiển thị không hợp lệ.',
  INVALID_PASSWORD: 'Mật khẩu hiện tại không đúng.',
  PASSWORD_TOO_SHORT: 'Mật khẩu quá ngắn.',
  PASSWORD_TOO_LONG: 'Mật khẩu quá dài.',
  INVALID_EMAIL: 'Email không hợp lệ.',
  USER_ALREADY_EXISTS: 'Tài khoản đã tồn tại.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Email đã được sử dụng. Vui lòng dùng email khác.',
  EMAIL_CAN_NOT_BE_UPDATED: 'Không thể cập nhật email.',
  CHANGE_EMAIL_DISABLED: 'Tính năng đổi email đang tắt.',
  EMAIL_NOT_VERIFIED: 'Email chưa được xác minh.',
  SESSION_EXPIRED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  CREDENTIAL_ACCOUNT_NOT_FOUND: 'Không tìm thấy tài khoản mật khẩu.',
  USER_NOT_FOUND: 'Không tìm thấy người dùng.',
  FAILED_TO_UPDATE_USER: 'Không thể cập nhật thông tin người dùng.',
  INVALID_TOKEN: 'Mã xác thực không hợp lệ hoặc đã hết hạn.',
  TOKEN_EXPIRED: 'Mã xác thực đã hết hạn. Vui lòng yêu cầu lại.',
  INVALID_EMAIL_OR_PASSWORD: 'Email hoặc mật khẩu không đúng.',
  INVALID_USERNAME_OR_PASSWORD: 'Username hoặc mật khẩu không đúng.',
  FAILED_TO_CREATE_USER: 'Không thể tạo tài khoản.',
  FAILED_TO_GET_SESSION: 'Không lấy được phiên đăng nhập.',
  PASSWORD_ALREADY_SET: 'Tài khoản đã có mật khẩu.',
  EMAIL_ALREADY_VERIFIED: 'Email đã được xác minh.',
  EMAIL_MISMATCH: 'Email không khớp.',
};

/** Map theo message gốc (khi không có code hoặc code lạ). */
const BY_MESSAGE: Record<string, string> = {
  'Username is already taken. Please try another.': BY_CODE.USERNAME_IS_ALREADY_TAKEN!,
  'Username is too short': BY_CODE.USERNAME_TOO_SHORT!,
  'Username is too long': BY_CODE.USERNAME_TOO_LONG!,
  'Username is invalid': BY_CODE.INVALID_USERNAME!,
  'Display username is invalid': BY_CODE.INVALID_DISPLAY_USERNAME!,
  'Invalid password': BY_CODE.INVALID_PASSWORD!,
  'Password too short': BY_CODE.PASSWORD_TOO_SHORT!,
  'Password too long': BY_CODE.PASSWORD_TOO_LONG!,
  'Invalid email': BY_CODE.INVALID_EMAIL!,
  'User already exists.': BY_CODE.USER_ALREADY_EXISTS!,
  'User already exists. Use another email.': BY_CODE.USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL!,
  'Email can not be updated': BY_CODE.EMAIL_CAN_NOT_BE_UPDATED!,
  'Change email is disabled': BY_CODE.CHANGE_EMAIL_DISABLED!,
  'Email is the same': 'Email không thay đổi.',
  'Email not verified': BY_CODE.EMAIL_NOT_VERIFIED!,
  'Session expired. Re-authenticate to perform this action.': BY_CODE.SESSION_EXPIRED!,
  'Credential account not found': BY_CODE.CREDENTIAL_ACCOUNT_NOT_FOUND!,
  'User not found': BY_CODE.USER_NOT_FOUND!,
  'Failed to update user': BY_CODE.FAILED_TO_UPDATE_USER!,
  "Verification email isn't enabled": 'Chưa bật gửi email xác minh.',
  'Invalid token': BY_CODE.INVALID_TOKEN!,
  'Token expired': BY_CODE.TOKEN_EXPIRED!,
  'Invalid email or password': BY_CODE.INVALID_EMAIL_OR_PASSWORD!,
  'Invalid username or password': BY_CODE.INVALID_USERNAME_OR_PASSWORD!,
  'Failed to create user': BY_CODE.FAILED_TO_CREATE_USER!,
  'Failed to get session': BY_CODE.FAILED_TO_GET_SESSION!,
  'User already has a password set': BY_CODE.PASSWORD_ALREADY_SET!,
  'Email is already verified': BY_CODE.EMAIL_ALREADY_VERIFIED!,
  'Email mismatch': BY_CODE.EMAIL_MISMATCH!,
  'Internal server error': 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.',
};

/** Phát hiện message còn toàn ASCII tiếng Anh (Better Auth mặc định). */
function looksLikeEnglish(message: string): boolean {
  return /^[\x20-\x7E]+$/.test(message) && /[A-Za-z]{3,}/.test(message);
}

/**
 * Chuyển lỗi từ authClient (Better Auth) sang tiếng Việt cho toast / form.
 * Ưu tiên map theo `code`, sau đó theo `message` gốc.
 */
export function getAuthClientErrorMessage(
  error: AuthClientError | null | undefined,
  fallback: string,
): string {
  if (!error) return fallback;

  const code = typeof error.code === 'string' ? error.code.trim() : '';
  if (code && BY_CODE[code]) return BY_CODE[code];

  const message = typeof error.message === 'string' ? error.message.trim() : '';
  if (!message) return fallback;

  const byMessage = BY_MESSAGE[message];
  if (byMessage) return byMessage;

  // Giữ message đã Việt hóa; chỉ thay fallback khi còn tiếng Anh chưa map.
  if (looksLikeEnglish(message)) return fallback;
  return message;
}
