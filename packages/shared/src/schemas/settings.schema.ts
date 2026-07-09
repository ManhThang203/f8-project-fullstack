import { z } from 'zod';

export const notificationPreferenceKeys = [
  'postLiked',
  'postReplied',
  'postCommentedFollowed',
  'userFollowed',
  'friendRequest',
  'friendAccepted',
  'mention',
  'messageReceived',
] as const;

export type NotificationPreferenceKey = (typeof notificationPreferenceKeys)[number];

export const notificationPreferencesSchema = z.object({
  postLiked: z.boolean(),
  postReplied: z.boolean(),
  postCommentedFollowed: z.boolean(),
  userFollowed: z.boolean(),
  friendRequest: z.boolean(),
  friendAccepted: z.boolean(),
  mention: z.boolean(),
  messageReceived: z.boolean(),
});

export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

export const updateUserSettingsSchema = z
  .object({
    showActivityStatus: z.boolean().optional(),
    notificationPreferences: notificationPreferencesSchema.partial().optional(),
  })
  .refine((data) => data.showActivityStatus !== undefined || data.notificationPreferences !== undefined, {
    message: 'Không có thay đổi nào',
  });

export type UpdateUserSettingsBody = z.infer<typeof updateUserSettingsSchema>;

export const changePasswordSettingsSchema = z
  .object({
    currentPassword: z.string().min(1, 'Nhập mật khẩu hiện tại'),
    newPassword: z.string().min(8, 'Mật khẩu ít nhất 8 ký tự').max(128),
    confirmPassword: z.string().min(1, 'Nhập lại mật khẩu'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Mật khẩu nhập lại không khớp',
    path: ['confirmPassword'],
  });

export type ChangePasswordSettingsForm = z.infer<typeof changePasswordSettingsSchema>;

export const changeUsernameSettingsSchema = z.object({
  username: z
    .string()
    .min(3, 'Tối thiểu 3 ký tự')
    .max(30)
    .regex(/^[a-zA-Z0-9_.]+$/, 'Chỉ chữ cái, số, gạch dưới và dấu chấm')
    .transform((s) => s.trim().toLowerCase()),
});

export type ChangeUsernameSettingsForm = z.infer<typeof changeUsernameSettingsSchema>;

export const changeEmailSettingsSchema = z.object({
  email: z
    .string()
    .email('Email không hợp lệ')
    .max(254)
    .transform((s) => s.trim().toLowerCase()),
});

export type ChangeEmailSettingsForm = z.infer<typeof changeEmailSettingsSchema>;
