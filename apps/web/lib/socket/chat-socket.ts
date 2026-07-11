'use client';

import { io, type Socket } from 'socket.io-client';

import { forceLogoutIfAccountBlocked, isAccountBlockedError } from '@/lib/auth';
import { apiFetch } from '@/lib/api';

const baseUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000';

let socket: Socket | null = null;
let connectPromise: Promise<Socket> | null = null;

/** Từ chối kết nối chat socket mà không tạo Error instance (tránh Next.js Console Error overlay). */
function denyChatSocketConnect(code: string, message: string): Promise<never> {
  return Promise.reject({ name: 'SocketConnectDenied', code, message });
}

/**
 * Socket `/chat` với token handshake (cookie Better Auth thường không tới được port API khi dev).
 */
export function getChatSocket(): Promise<Socket> {
  if (socket?.connected) return Promise.resolve(socket);
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    const res = await apiFetch<{ token: string }>('/chat/socket-token', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    if (!res.success) {
      connectPromise = null;
      if (isAccountBlockedError(res.error)) {
        void forceLogoutIfAccountBlocked();
      }
      return denyChatSocketConnect(res.error.code, res.error.message);
    }
    // nhận token từ server
    const token = res.data.token;
    // kết nối với socket
    const s = io(`${baseUrl}/chat`, {
      withCredentials: true, // cho phép gửi cookie session khi handshake
      auth: { token },
      transports: ['websocket', 'polling'], // cho phép gửi tin nhắn qua WebSocket hoặc Polling
      autoConnect: true, // tự động kết nối khi component mount
    });
    socket = s;
    try {
      await new Promise<void>((resolve, reject) => {
        s.once('connect', () => resolve());
        s.once('connect_error', (err) => reject(err));
      });
    } catch (err) {
      connectPromise = null;
      s.disconnect();
      socket = null;
      throw err;
    }
    connectPromise = null;
    return s;
  })();

  return connectPromise;
}

/** Gỡ listener / đóng khi đăng xuất (tùy chọn). */
export function resetChatSocket() {
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
  connectPromise = null;
}

/** Instance hiện tại (có thể chưa kết nối). */
export function getChatSocketInstance(): Socket | null {
  return socket;
}
