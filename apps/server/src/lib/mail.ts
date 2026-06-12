import nodemailer from 'nodemailer';

import { env } from '../config/env.js';

// #region agent log
fetch('http://127.0.0.1:7600/ingest/7e460ad4-e57b-4c68-a427-7775819b3418', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'df72aa' },
  body: JSON.stringify({
    sessionId: 'df72aa',
    hypothesisId: 'reload',
    location: 'mail.ts:1',
    message: 'mail.ts module loaded',
    data: { smtpHost: env.SMTP_HOST, smtpUser: env.SMTP_USER, smtpPort: env.SMTP_PORT },
    timestamp: Date.now(),
  }),
}).catch(() => {});
// #endregion

export async function sendMail(opts: { to: string; subject: string; text: string }): Promise<void> {
  // #region agent log
  {
    const pass = env.SMTP_PASS || '';
    let passSum = 0;
    for (let i = 0; i < pass.length; i++) passSum = (passSum + pass.charCodeAt(i)) % 9973;
    fetch('http://127.0.0.1:7600/ingest/7e460ad4-e57b-4c68-a427-7775819b3418', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'df72aa' },
      body: JSON.stringify({
        sessionId: 'df72aa',
        hypothesisId: 'A-C',
        location: 'mail.ts:6',
        message: 'sendMail resolved SMTP config',
        data: {
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          user: env.SMTP_USER,
          from: env.SMTP_FROM,
          authEnabled: env.SMTP_USER !== '' && env.SMTP_PASS !== '',
          passLen: pass.length,
          passFp: passSum,
          processEnvHasPass: typeof process.env.SMTP_PASS === 'string',
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }
  // #endregion

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth:
      env.SMTP_USER !== '' && env.SMTP_PASS !== ''
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
  });

  try {
    const info = await transporter.sendMail({
      from: env.SMTP_FROM,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
    });
    // #region agent log
    fetch('http://127.0.0.1:7600/ingest/7e460ad4-e57b-4c68-a427-7775819b3418', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'df72aa' },
      body: JSON.stringify({
        sessionId: 'df72aa',
        hypothesisId: 'E',
        location: 'mail.ts:16',
        message: 'sendMail OK',
        data: { messageId: info?.messageId, accepted: info?.accepted, rejected: info?.rejected },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  } catch (err) {
    // #region agent log
    const e = err as { name?: string; code?: string; responseCode?: number; response?: string };
    fetch('http://127.0.0.1:7600/ingest/7e460ad4-e57b-4c68-a427-7775819b3418', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'df72aa' },
      body: JSON.stringify({
        sessionId: 'df72aa',
        hypothesisId: 'B',
        location: 'mail.ts:16',
        message: 'sendMail FAILED',
        data: {
          name: e?.name,
          code: e?.code,
          responseCode: e?.responseCode,
          response: e?.response,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    throw err;
  }
}

export function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  return sendMail({
    to,
    subject: 'Đặt lại mật khẩu — costy',
    text: `Bạn đã yêu cầu đặt lại mật khẩu. Mở liên kết sau (có hiệu lực trong thời gian giới hạn):\n\n${resetUrl}\n\nNếu bạn không yêu cầu, bỏ qua email này.`,
  });
}

/** Gửi email xác thực địa chỉ email khi người dùng đăng ký. */
export function sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
  return sendMail({
    to,
    subject: 'Xác thực email — costy',
    text: `Cảm ơn bạn đã đăng ký costy. Nhấn vào liên kết sau để xác thực email (hết hạn sau 1 giờ):\n\n${verifyUrl}\n\nNếu bạn không đăng ký, hãy bỏ qua email này.`,
  });
}
