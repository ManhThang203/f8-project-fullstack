import type { Server as SocketIOServer } from 'socket.io';

let ioInstance: SocketIOServer | null = null;

export function setRealtimeIo(io: SocketIOServer): void {
  ioInstance = io;
}

export function getRealtimeIo(): SocketIOServer | null {
  return ioInstance;
}
