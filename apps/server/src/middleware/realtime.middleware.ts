import type { Request, Response, NextFunction } from 'express';
import { getRealtimeIo } from '../lib/realtime.js';
import { logger } from '../lib/logger.js';

export interface RealtimeOptions<TData = any> {
  /**
   * Namespace Socket.IO, ví dụ: '/feed', '/chat'
   */
  namespace: string | ((req: Request) => string);

  /**
   * Tên sự kiện phát ra, ví dụ: 'post:created', 'like:added'
   */
  event: string | ((req: Request) => string);

  /**
   * Tên room (nếu muốn gửi đến 1 nhóm cụ thể).
   */
  room?: string | ((req: Request, data: TData) => string | string[]);

  /**
   * Hàm trích xuất dữ liệu để làm payload gửi đi.
   * Mặc định sẽ gửi `data` (từ wrapper `ok(data)`).
   */
  payload?: (req: Request, resData: any) => any;
}

/**
 * Middleware đa năng để bắn sự kiện Socket.IO tự động khi API trả về thành công (2xx).
 */
export function realtimeBroadcast(options: RealtimeOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;

    // Override res.json để chèn hook sau khi Controller trả kết quả
    res.json = (function (this: any, body: any) {
      originalJson.call(this, body);

      if (res.statusCode >= 200 && res.statusCode < 300) {
        const io = getRealtimeIo();
        if (!io) return;

        try {
          const ns =
            typeof options.namespace === 'function' ? options.namespace(req) : options.namespace;
          const eventName =
            typeof options.event === 'function' ? options.event(req) : options.event;

          const responseData = body && body.data !== undefined ? body.data : body;
          const eventPayload = options.payload ? options.payload(req, responseData) : responseData;

          const roomOrRooms = options.room
            ? typeof options.room === 'function'
              ? options.room(req, responseData)
              : options.room
            : null;

          const nsp = io.of(ns);

          if (roomOrRooms) {
            nsp.to(roomOrRooms as string | string[]).emit(eventName, eventPayload);
          } else {
            nsp.emit(eventName, eventPayload);
          }
        } catch (error) {
          logger.error({ err: error, event: options.event }, 'Failed to broadcast realtime event');
        }
      }
    }) as any;

    next();
  };
}
