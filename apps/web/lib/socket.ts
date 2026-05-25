'use client';

import { io, type Socket } from 'socket.io-client';

const URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000';

/** Một socket client cho mỗi namespace — tránh tạo kết nối trùng. */
const cache: Partial<Record<string, Socket>> = {};

/**
 * Lấy (hoặc tạo) client Socket.IO cho namespace `/notifications`, `/feed`, `/chat`.
 * Chat nên dùng `getChatSocket()` — có token auth; file này cho namespace skeleton / đơn giản.
 */
export function getSocket(namespace: '/notifications' | '/feed' | '/chat'): Socket {
  const existing = cache[namespace];
  if (existing) return existing;

  const socket = io(`${URL}${namespace}`, { withCredentials: true, autoConnect: true });
  cache[namespace] = socket;
  return socket;
}
