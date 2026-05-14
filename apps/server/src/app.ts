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
import { usersRouter } from './modules/users/users.routes.js';

export function buildApp(): Express {
  const app = express();

  // So `req.ip` / Better Auth use `X-Forwarded-For` from Next.js or edge proxies.
  app.set('trust proxy', 1);

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
  app.use(compression());

  // Đăng nhập `{ identifier, password }` — route tường minh, trước catch-all Better Auth.
  app.post('/api/auth/sign-in/identifier', express.json({ limit: '32kb' }), handleSignInIdentifier);

  // Better Auth — catch-all; giữ `express.json()` phía sau.
  app.all('/api/auth/*', toNodeHandler(auth));

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/openapi.json', (_req, res) => res.json(swaggerSpec));

  app.use('/api/v1', attachBetterAuthSession);
  app.use('/api/v1', attachDevAuthContext);
  app.use('/api/v1/health', healthRouter);
  app.use('/api/v1/posts', postsRouter);
  app.use('/api/v1/chat', chatRouter);
  app.use('/api/v1/users', usersRouter);

  app.use(errorMiddleware);
  return app;
}
