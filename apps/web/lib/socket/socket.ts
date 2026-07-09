'use client';

import { io, type Socket } from 'socket.io-client';

import { apiFetch } from '@/lib/api';

const URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000';

type AuthedNamespace = '/notifications' | '/feed';

const sockets: Partial<Record<AuthedNamespace, Socket>> = {};
const connectPromises: Partial<Record<AuthedNamespace, Promise<Socket>>> = {};

/**
 * Lấy socket đã xác thực cho `/notifications` hoặc `/feed`.
 * Token lấy qua POST /chat/socket-token (cross-origin dev không gửi được cookie WS).
 */
export function getAuthedSocket(namespace: AuthedNamespace): Promise<Socket> {
  const existing = sockets[namespace];
  if (existing?.connected) return Promise.resolve(existing);

  const pending = connectPromises[namespace];
  if (pending) return pending;

  connectPromises[namespace] = (async () => {
    const res = await apiFetch<{ token: string }>('/chat/socket-token', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    if (!res.success) {
      delete connectPromises[namespace];
      throw new Error(res.error.message);
    }

    const token = res.data.token;
    const socket = io(`${URL}${namespace}`, {
      withCredentials: true,
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
    sockets[namespace] = socket;

    try {
      await new Promise<void>((resolve, reject) => {
        socket.once('connect', () => resolve());
        socket.once('connect_error', (err) => reject(err));
      });
    } catch (err) {
      delete connectPromises[namespace];
      delete sockets[namespace];
      socket.disconnect();
      throw err;
    }

    delete connectPromises[namespace];
    return socket;
  })();

  return connectPromises[namespace]!;
}

/** Gỡ listener và đóng socket khi đăng xuất. */
export function resetAuthedSockets(): void {
  for (const ns of Object.keys(sockets) as AuthedNamespace[]) {
    sockets[ns]?.removeAllListeners();
    sockets[ns]?.disconnect();
    delete sockets[ns];
    delete connectPromises[ns];
  }
}
