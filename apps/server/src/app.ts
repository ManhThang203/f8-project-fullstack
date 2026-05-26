/**
 * Express app factory.
 *
 * Thứ tự middleware ở đây **quan trọng** và đã được test bằng tay. Đọc kỹ
 * trước khi sắp xếp lại — đặc biệt vùng `/api/auth/*` phải nằm trước
 * `express.json()` (xem comment bên trong).
 *
 * Quy ước: file này chỉ build app (pure). Việc `listen()` nằm ở `server.ts`
 * để test có thể import app mà không mở port.
 */
import { toNodeHandler } from 'better-auth/node';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env.js';
import { auth } from './lib/auth.js';
import { logger } from './lib/logger.js';
import { swaggerSpec } from './lib/swagger.js';
import { attachBetterAuthSession } from './middleware/better-auth-session.middleware.js';
import { attachDevAuthContext } from './middleware/dev-auth.middleware.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { handleSignInIdentifier } from './modules/auth/identifier-auth.routes.js';
import { healthRouter } from './modules/health/health.routes.js';
import { chatRouter } from './modules/chat/chat.routes.js';
import { postsRouter } from './modules/posts/posts.routes.js';
import { searchRouter } from './modules/search/search.routes.js';
import { usersRouter } from './modules/users/users.routes.js';

export function buildApp(): Express {
  const app = express();

  // Cho phép tin 1 lớp proxy đứng trước (Next BFF / Nginx). Nhờ vậy `req.ip`,
  // rate-limit và Better Auth lấy đúng IP/host từ `X-Forwarded-*` thay vì
  // địa chỉ nội bộ của container Next.
  app.set('trust proxy', 1);

  // Bảo mật cơ bản.
  app.disable('x-powered-by'); // Ẩn fingerprint "Express".
  app.use(helmet()); // Bộ header bảo mật mặc định (X-Frame-Options, CSP base…).
  // CORS chỉ cần thiết khi gọi trực tiếp Express (vd. dev tools, mobile).
  // Web bình thường đi qua BFF nên cùng origin — vẫn bật `credentials` để
  // cookie session đi qua được khi cross-origin hợp lệ.
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
  app.use(compression()); // Nén response. BFF Next đã xử lý `content-encoding` khi proxy.

  // ─── Auth routes ────────────────────────────────────────────────────────
  // Lưu ý: cả hai khối auth bên dưới phải nằm **trước** `express.json()` toàn
  // cục. Better Auth `toNodeHandler` đọc raw body của Node; nếu `express.json()`
  // chạy trước, body đã bị consume → handler treo hoặc parse lỗi.

  // Route tường minh: đăng nhập bằng `{ identifier, password }` (email hoặc
  // username). Vì là route do mình viết (không phải Better Auth), tự parse JSON
  // tại chỗ với limit nhỏ để chống abuse. Phải đặt **trước** catch-all bên dưới
  // để không bị `toNodeHandler` nuốt mất.
  app.post('/api/auth/sign-in/identifier', express.json({ limit: '32kb' }), handleSignInIdentifier);

  // Catch-all Better Auth: sign-up, OAuth callback, get-session, sign-out…
  // `app.all` để cover GET/POST/PUT/PATCH/DELETE/HEAD theo nhu cầu của lib.
  app.all('/api/auth/*', toNodeHandler(auth));

  // ─── Body parsers + logging (áp dụng cho phần còn lại) ──────────────────
  app.use(express.json({ limit: '1mb' })); // JSON body cho `/api/v1/*`.
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser()); // `req.cookies` cho middleware ngoài Better Auth.
  app.use(pinoHttp({ logger })); // Log có cấu trúc (request id, latency…).

  // ─── API docs (chỉ bật ở dev/staging tuỳ env) ──────────────────────────
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/openapi.json', (_req, res) => res.json(swaggerSpec));

  // ─── API v1 ─────────────────────────────────────────────────────────────
  // `attachBetterAuthSession` đọc cookie → gắn `req.user` cho các route v1.
  // `attachDevAuthContext` cho phép giả lập user qua header trong môi trường
  // dev (xem env `DEV_AUTH_*`); ở prod middleware này tự no-op.
  app.use('/api/v1', attachBetterAuthSession);
  app.use('/api/v1', attachDevAuthContext);
  app.use('/api/v1/health', healthRouter);
  app.use('/api/v1/posts', postsRouter);
  app.use('/api/v1/search', searchRouter);
  app.use('/api/v1/chat', chatRouter);
  app.use('/api/v1/users', usersRouter);

  // Phải nằm cuối cùng: error middleware có 4 tham số `(err, req, res, next)`
  // mới được Express nhận diện.
  app.use(errorMiddleware);
  return app;
}
