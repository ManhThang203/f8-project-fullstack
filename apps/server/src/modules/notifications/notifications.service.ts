import { prisma } from '@threads/db';
import { NotificationType } from '@prisma/client';
import { getRealtimeIo } from '../../lib/realtime.js';

export async function listNotifications(userId: string, limit = 20, cursor?: string) {
  const notifications = await prisma.notification.findMany({
    where: { recipientId: userId },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: 'desc' },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
        },
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
  actorId: string;
  type: NotificationType;
  entityType?: string;
  entityId?: string;
};

export async function createNotification(input: CreateNotificationInput) {
  // Prevent duplicate notifications for same actor, recipient, type, and entity
  if (input.entityId) {
    const existing = await prisma.notification.findFirst({
      where: {
        recipientId: input.recipientId,
        actorId: input.actorId,
        type: input.type,
        entityId: input.entityId,
      },
    });
    if (existing) {
      // Just update the createdAt so it moves to top, or do nothing.
      return existing;
    }
  }

  const notification = await prisma.notification.create({
    data: {
      recipientId: input.recipientId,
      actorId: input.actorId,
      type: input.type,
      entityType: input.entityType,
      entityId: input.entityId,
    },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
        },
      },
    },
  });

  // Emit realtime socket event
  const io = getRealtimeIo();
  if (io) {
    io.of('/chat').to(`user:${input.recipientId}`).emit('notification:new', notification);
  }

  return notification;
}
