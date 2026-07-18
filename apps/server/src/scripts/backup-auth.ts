/**
 * Lấy Google Drive OAuth refresh_token một lần (My Drive cá nhân).
 * Usage: pnpm --filter @costy/server backup:auth
 *
 * Cần GOOGLE_DRIVE_CLIENT_ID + GOOGLE_DRIVE_CLIENT_SECRET trong .env
 * (OAuth Desktop client). Copy refresh_token in ra vào GOOGLE_DRIVE_REFRESH_TOKEN.
 */

import http from 'node:http';
import { URL } from 'node:url';

import { env } from '../config/env.js';
import {
  GOOGLE_DRIVE_BACKUP_SCOPE,
  GOOGLE_DRIVE_OAUTH_REDIRECT_URI,
  createOAuth2Client,
} from '../modules/backup/google-drive.js';

const LISTEN_PORT = 53682;

async function main(): Promise<void> {
  const clientId = env.GOOGLE_DRIVE_CLIENT_ID.trim();
  const clientSecret = env.GOOGLE_DRIVE_CLIENT_SECRET.trim();

  if (!clientId || !clientSecret) {
    console.error(
      'Thiếu GOOGLE_DRIVE_CLIENT_ID hoặc GOOGLE_DRIVE_CLIENT_SECRET.\n' +
        'Tạo OAuth client loại Desktop app trên Google Cloud Console, điền vào .env, rồi chạy lại.',
    );
    process.exit(1);
  }

  const oauth2 = createOAuth2Client({
    clientId,
    clientSecret,
    redirectUri: GOOGLE_DRIVE_OAUTH_REDIRECT_URI,
  });

  const authUrl = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [GOOGLE_DRIVE_BACKUP_SCOPE],
  });

  console.log('Mở URL sau trên trình duyệt, đăng nhập Gmail sở hữu folder backup:\n');
  console.log(authUrl);
  console.log(`\nĐang chờ callback tại ${GOOGLE_DRIVE_OAUTH_REDIRECT_URI} ...\n`);

  const refreshToken = await new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      void (async () => {
        try {
          if (!req.url) {
            res.writeHead(400);
            res.end('Missing URL');
            return;
          }

          const url = new URL(req.url, `http://127.0.0.1:${LISTEN_PORT}`);
          if (url.pathname !== '/oauth2callback') {
            res.writeHead(404);
            res.end('Not found');
            return;
          }

          const err = url.searchParams.get('error');
          if (err) {
            res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end(`OAuth lỗi: ${err}`);
            server.close();
            reject(new Error(`OAuth lỗi: ${err}`));
            return;
          }

          const code = url.searchParams.get('code');
          if (!code) {
            res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Thiếu code trong callback');
            return;
          }

          const { tokens } = await oauth2.getToken(code);
          const token = tokens.refresh_token;
          if (!token) {
            res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end(
              'Không nhận được refresh_token. Thử lại với prompt=consent hoặc thu hồi quyền app rồi chạy lại.',
            );
            server.close();
            reject(new Error('Không nhận được refresh_token từ Google'));
            return;
          }

          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(
            '<html><body><p>OAuth thành công. Có thể đóng tab này và xem terminal.</p></body></html>',
          );
          server.close();
          resolve(token);
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end(e instanceof Error ? e.message : String(e));
          server.close();
          reject(e);
        }
      })();
    });

    server.on('error', reject);
    server.listen(LISTEN_PORT, '127.0.0.1');
  });

  console.log('Thành công. Thêm vào .env / docker/.env.docker:\n');
  console.log(`GOOGLE_DRIVE_REFRESH_TOKEN=${refreshToken}`);
  console.log('\nKhông commit token vào git.');
}

main().catch((err) => {
  console.error('backup:auth thất bại:', err instanceof Error ? err.message : err);
  process.exit(1);
});
