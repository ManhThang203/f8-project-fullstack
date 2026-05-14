import nodemailer from 'nodemailer';

import { env } from '../config/env.js';

export async function sendMail(opts: { to: string; subject: string; text: string }): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth:
      env.SMTP_USER !== '' && env.SMTP_PASS !== ''
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
  });

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
  });
}

export function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  return sendMail({
    to,
    subject: 'Đặt lại mật khẩu — threads-clone',
    text: `Bạn đã yêu cầu đặt lại mật khẩu. Mở liên kết sau (có hiệu lực trong thời gian giới hạn):\n\n${resetUrl}\n\nNếu bạn không yêu cầu, bỏ qua email này.`,
  });
}
