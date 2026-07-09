import { prisma } from '@costy/db';
import {
  notificationPreferencesSchema,
  type NotificationPreferences,
  type UpdateUserSettingsBody,
  type UserSettingsDto,
} from '@costy/shared';

import { AppError } from '../../lib/errors.js';

/** Giá trị mặc định khi user chưa lưu preference. */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences =
  notificationPreferencesSchema.parse({
    postLiked: true,
    postReplied: true,
    postCommentedFollowed: true,
    userFollowed: true,
    friendRequest: true,
    friendAccepted: true,
    mention: true,
    messageReceived: true,
  });

/** Chuẩn hoá JSON preference từ DB sang DTO an toàn. */
export function normalizeNotificationPreferences(raw: unknown): NotificationPreferences {
  const parsed = notificationPreferencesSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  return { ...DEFAULT_NOTIFICATION_PREFERENCES };
}

/** Map bản ghi user sang DTO cài đặt. */
function mapUserToSettingsDto(user: {
  showActivityStatus: boolean;
  notificationPreferences: unknown;
}): UserSettingsDto {
  return {
    showActivityStatus: user.showActivityStatus,
    notificationPreferences: normalizeNotificationPreferences(user.notificationPreferences),
  };
}

/** Gộp patch preference với giá trị hiện tại. */
function mergeNotificationPreferences(
  current: NotificationPreferences,
  patch: Partial<NotificationPreferences> | undefined,
): NotificationPreferences {
  if (!patch) return current;
  return notificationPreferencesSchema.parse({ ...current, ...patch });
}

const settingsSelect = {
  showActivityStatus: true,
  notificationPreferences: true,
} as const;

/** Lấy cài đặt hiện tại của user đăng nhập. */
export async function getMySettings(userId: string): Promise<UserSettingsDto> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: settingsSelect,
  });
  if (!user) throw AppError.notFound('Không tìm thấy tài khoản');
  return mapUserToSettingsDto(user);
}

/** Cập nhật cài đặt quyền riêng tư và thông báo của user. */
export async function updateMySettings(
  userId: string,
  body: UpdateUserSettingsBody,
): Promise<UserSettingsDto> {
  const current = await getMySettings(userId);

  const notificationPreferences =
    body.notificationPreferences !== undefined
      ? mergeNotificationPreferences(current.notificationPreferences, body.notificationPreferences)
      : undefined;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(body.showActivityStatus !== undefined
        ? { showActivityStatus: body.showActivityStatus }
        : {}),
      ...(notificationPreferences !== undefined
        ? { notificationPreferences: notificationPreferences }
        : {}),
    },
    select: settingsSelect,
  });

  return mapUserToSettingsDto(user);
}

/** Đọc preference thông báo của user (dùng khi tạo notification). */
export async function getUserNotificationPreferences(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { notificationPreferences: true },
  });
  if (!user) return normalizeNotificationPreferences(null);
  return normalizeNotificationPreferences(user.notificationPreferences);
}

/** Kiểm tra loại thông báo có được bật cho user không. */
export function isNotificationTypeEnabled(
  preferences: NotificationPreferences,
  key: keyof NotificationPreferences,
): boolean {
  return preferences[key];
}
