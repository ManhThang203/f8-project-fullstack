'use client';

import { io, type Socket } from 'socket.io-client';

const URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000';

const cache: Partial<Record<string, Socket>> = {};

/** Get (or create) a Socket.io client connected to the given namespace. */
export function getSocket(namespace: '/notifications' | '/feed' | '/chat'): Socket {
  const existing = cache[namespace];
  if (existing) return existing;
  const socket = io(`${URL}${namespace}`, { withCredentials: true, autoConnect: true });
  cache[namespace] = socket;
  return socket;
}
