import { z } from 'zod';

const authEmailSchema = z
  .string()
  .min(1, 'Nhập email')
  .email('Email không hợp lệ')
  .max(254)
  .transform((s) => s.trim().toLowerCase());

const authPasswordSchema = z
  .string()
  .min(1, 'Nhập mật khẩu')
  .min(8, 'Mật khẩu ít nhất 8 ký tự')
  .max(128);

export const registerBodySchema = z.object({
  email: authEmailSchema,
  username: z
    .string()
    .min(1, 'Nhập tên đăng nhập')
    .min(3, 'Tối thiểu 3 ký tự')
    .max(30)
    .regex(/^[a-zA-Z0-9_.]+$/, 'Chỉ chữ cái, số, gạch dưới và dấu chấm')
    .transform((s) => s.trim().toLowerCase()),
  password: authPasswordSchema,
  name: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
    z.string().max(100).optional(),
  ),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;

export const loginBodySchema = z.object({
  identifier: z.string().min(1, 'Nhập email hoặc tên đăng nhập').max(254),
  password: z.string().min(1, 'Nhập mật khẩu'),
});

export type LoginBody = z.infer<typeof loginBodySchema>;

export const forgotPasswordRequestSchema = z.object({
  email: authEmailSchema,
});

export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;

export const resetPasswordFormSchema = z
  .object({
    password: authPasswordSchema,
    confirmPassword: z.string().min(1, 'Nhập lại mật khẩu'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Mật khẩu nhập lại không khớp',
    path: ['confirmPassword'],
  });

export type ResetPasswordForm = z.infer<typeof resetPasswordFormSchema>;
