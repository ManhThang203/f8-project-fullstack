import { prisma } from '@costy/db';
import type { NotificationType } from '@costy/db';
import { getRealtimeIo } from '../../lib/realtime.js';

const actorSelect = {
  id: true,
  name: true,
  username: true,
  image: true,
} as const;

export async function listNotifications(userId: string, limit = 20, cursor?: string) {
  const notifications = await prisma.notification.findMany({
    where: { recipientId: userId },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: 'desc' },
    include: {
      actor: {
        select: actorSelect,
      },
    },
  });

  return notifications;
}

export async function getUnreadCount(userId: string) {
  const count = await prisma.notification.count({
    where: {
      recipientId: userId,
      readAt: null,
    },
  });
  return { count };
}

export async function markAsRead(userId: string, notificationId?: string) {
  if (notificationId) {
    await prisma.notification.updateMany({
      where: { id: notificationId, recipientId: userId },
      data: { readAt: new Date() },
    });
  } else {
    // Mark all as read
    await prisma.notification.updateMany({
      where: { recipientId: userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}

type CreateNotificationInput = {
  recipientId: string;
  actorId?: string | null;
  type: NotificationType;
  entityType?: string;
  entityId?: string;
  reactionType?: string | null;
};

/** Phát sự kiện realtime khi có thông báo mới hoặc cập nhật. */
function emitNotificationNew(
  recipientId: string,
  notification: Awaited<ReturnType<typeof prisma.notification.create>>,
) {
  const io = getRealtimeIo();
  if (io) {
    io.of('/notifications').to(`user:${recipientId}`).emit('notification:new', notification);
  }
}

export async function createNotification(input: CreateNotificationInput) {
  const actorId = input.actorId ?? null;
  // Prevent duplicate notifications for same actor, recipient, type, and entity
  if (input.entityId) {
    const existing = await prisma.notification.findFirst({
      where: {
        recipientId: input.recipientId,
        actorId,
        type: input.type,
        entityId: input.entityId,
      },
    });
    if (existing) {
      const updated = await prisma.notification.update({
        where: { id: existing.id },
        data: {
          reactionType: input.reactionType ?? null,
          readAt: null,
          createdAt: new Date(),
        },
        include: {
          actor: {
            select: actorSelect,
          },
        },
      });
      emitNotificationNew(input.recipientId, updated);
      return updated;
    }
  }

  const notification = await prisma.notification.create({
    data: {
      recipientId: input.recipientId,
      actorId,
      type: input.type,
      entityType: input.entityType,
      entityId: input.entityId,
      reactionType: input.reactionType ?? null,
    },
    include: {
      actor: {
        select: actorSelect,
      },
    },
  });

  emitNotificationNew(input.recipientId, notification);

  return notification;
}
