import { describe, expect, it } from 'vitest';

import {
  ASSIGNABLE_PERMISSION_KEYS,
  isAssignablePermissionKey,
} from './permission-catalog.js';

describe('isAssignablePermissionKey', () => {
  it('cho phép các key đang enforce trên admin routes', () => {
    for (const key of ASSIGNABLE_PERMISSION_KEYS) {
      expect(isAssignablePermissionKey(key)).toBe(true);
    }
  });

  it('từ chối key trang trí / app-user / ban tách nhỏ', () => {
    expect(isAssignablePermissionKey('post:create')).toBe(false);
    expect(isAssignablePermissionKey('user:ban')).toBe(false);
    expect(isAssignablePermissionKey('user:ban:temp')).toBe(false);
    expect(isAssignablePermissionKey('user:unlock')).toBe(false);
    expect(isAssignablePermissionKey('post:hide')).toBe(false);
    expect(isAssignablePermissionKey('post:delete:any')).toBe(false);
    expect(isAssignablePermissionKey('chat')).toBe(false);
  });
});
