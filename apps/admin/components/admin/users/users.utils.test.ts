import { describe, expect, it } from 'vitest';

import type { AdminUserListItemDto } from '@costy/shared';

import {
  isBanTargetDisabled,
  isRoleChangeDisabled,
  isStatusChangeDisabled,
} from './users.utils';

const user = (overrides: Partial<AdminUserListItemDto> = {}): AdminUserListItemDto => ({
  id: 'u1',
  username: 'alice',
  name: 'Alice',
  email: 'a@x.com',
  image: null,
  role: 'USER',
  status: 'ACTIVE',
  bannedUntil: null,
  statusReason: null,
  createdAt: new Date().toISOString(),
  postCount: 0,
  ...overrides,
});

describe('isRoleChangeDisabled', () => {
  it('chặn SUPER_ADMIN và self', () => {
    expect(isRoleChangeDisabled(user({ role: 'SUPER_ADMIN' }), 'actor')).toBe(true);
    expect(isRoleChangeDisabled(user({ id: 'me' }), 'me', 'ADMIN')).toBe(true);
  });

  it('chặn ADMIN khi actor không phải SUPER_ADMIN', () => {
    expect(isRoleChangeDisabled(user({ role: 'ADMIN' }), 'actor', 'ADMIN')).toBe(true);
    expect(isRoleChangeDisabled(user({ role: 'ADMIN' }), 'actor', 'SUPER_ADMIN')).toBe(false);
  });
});

describe('isStatusChangeDisabled', () => {
  it('mirror hierarchy giống role change', () => {
    expect(isStatusChangeDisabled(user({ role: 'SUPER_ADMIN' }), 'actor')).toBe(true);
    expect(isStatusChangeDisabled(user({ id: 'me' }), 'me', 'ADMIN')).toBe(true);
    expect(isStatusChangeDisabled(user({ role: 'ADMIN' }), 'actor', 'ADMIN')).toBe(true);
    expect(isStatusChangeDisabled(user({ role: 'ADMIN' }), 'actor', 'SUPER_ADMIN')).toBe(false);
    expect(isStatusChangeDisabled(user({ role: 'USER' }), 'actor', 'ADMIN')).toBe(false);
  });
});

describe('isBanTargetDisabled', () => {
  it('chặn ban Super-admin / Admin (nếu actor ≠ Super-admin)', () => {
    expect(isBanTargetDisabled('SUPER_ADMIN', 'ADMIN')).toBe(true);
    expect(isBanTargetDisabled('ADMIN', 'ADMIN')).toBe(true);
    expect(isBanTargetDisabled('ADMIN', 'SUPER_ADMIN')).toBe(false);
    expect(isBanTargetDisabled('USER', 'ADMIN')).toBe(false);
    expect(isBanTargetDisabled(undefined, 'ADMIN')).toBe(false);
  });
});
