import type { IncomingHttpHeaders } from 'node:http';

import { fromNodeHeaders } from 'better-auth/node';
import type { ExtendedError, Socket } from 'socket.io';

import { authWeb } from '../lib/auth.js';
import { verifySocketToken } from '../lib/socket-token.js';

/**
 * Middleware xác thực Socket.IO dùng chung.
 * Ưu tiên token HMAC (handshake.auth.token), fallback về cookie session Better Auth.
 */
export function authenticateSocket(
  socket: Socket,
  next: (err?: ExtendedError) => void,
): void {
  const raw =
    typeof socket.handshake.auth === 'object' && socket.handshake.auth !== null
      ? (socket.handshake.auth as { token?: unknown }).token
      : undefined;
  if (typeof raw === 'string') {
    const userId = verifySocketToken(raw);
    if (userId) {
      socket.data.userId = userId;
      next();
      return;
    }
  }
  void authWeb.api
    .getSession({
      headers: fromNodeHeaders(socket.handshake.headers as IncomingHttpHeaders),
    })
    .then((session) => {
      if (!session?.user?.id) {
        next(new Error('unauthorized'));
        return;
      }
      socket.data.userId = session.user.id;
      next();
    })
    .catch(() => next(new Error('unauthorized')));
}
