import type { NotificationPreferences } from '../schemas/settings.schema.js';

export interface UserSettingsDto {
  showActivityStatus: boolean;
  notificationPreferences: NotificationPreferences;
}

export interface BlockedUserDto {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  blockedAt: string;
}

export interface BlockedUsersMeta {
  nextCursor: string | null;
}
