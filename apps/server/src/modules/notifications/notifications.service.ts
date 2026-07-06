import { prisma } from '@costy/db';
import type { NotificationType } from '@costy/db';
import type { NotificationPreferences } from '@costy/shared';
import { getRealtimeIo } from '../../lib/realtime.js';
import {
  getUserNotificationPreferences,
  isNotificationTypeEnabled,
  normalizeNotificationPreferences,
} from '../me/me.settings.service.js';

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

/** Map loại notification sang key preference tương ứng. */
const notificationPreferenceKeyMap: Partial<
  Record<NotificationType, keyof NotificationPreferences>
> = {
  POST_LIKED: 'postLiked',
  POST_REPLIED: 'postReplied',
  POST_COMMENTED_FOLLOWED: 'postCommentedFollowed',
  USER_FOLLOWED: 'userFollowed',
  FRIEND_REQUEST: 'friendRequest',
  FRIEND_ACCEPTED: 'friendAccepted',
  MENTION: 'mention',
  MESSAGE_RECEIVED: 'messageReceived',
};

/** Kiểm tra user có bật nhận loại thông báo này không. */
async function shouldDeliverNotification(
  recipientId: string,
  type: NotificationType,
): Promise<boolean> {
  const key = notificationPreferenceKeyMap[type];
  if (!key) return true;
  const prefs = await getUserNotificationPreferences(recipientId);
  return isNotificationTypeEnabled(prefs, key);
}

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
  const allowed = await shouldDeliverNotification(input.recipientId, input.type);
  if (!allowed) return null;

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

type FanoutNotificationInput = {
  recipientIds: string[];
  actorId?: string | null;
  type: NotificationType;
  entityType?: string;
  entityId: string;
  reactionType?: string | null;
};

/**
 * Tạo cùng một loại notification cho nhiều recipient trong ít query cố định (batch).
 * Lọc preference, dedupe, tạo mới và emit realtime đều theo lô — tránh N+1 khi fan-out.
 */
export async function createFanoutNotifications(input: FanoutNotificationInput): Promise<void> {
  const recipientIds = [...new Set(input.recipientIds)].filter(Boolean);
  if (recipientIds.length === 0) return;

  const actorId = input.actorId ?? null;

  // 1. Lọc recipient theo preference trong 1 query
  const prefKey = notificationPreferenceKeyMap[input.type];
  let allowedIds = recipientIds;
  if (prefKey) {
    const users = await prisma.user.findMany({
      where: { id: { in: recipientIds }, deletedAt: null },
      select: { id: true, notificationPreferences: true },
    });
    const prefMap = new Map(
      users.map((u) => [u.id, normalizeNotificationPreferences(u.notificationPreferences)]),
    );
    allowedIds = recipientIds.filter((id) => {
      const prefs = prefMap.get(id);
      if (!prefs) return false;
      return isNotificationTypeEnabled(prefs, prefKey);
    });
  }
  if (allowedIds.length === 0) return;

  // 2. Tìm notification trùng đã tồn tại (dedupe theo recipient+actor+type+entity)
  const existing = await prisma.notification.findMany({
    where: { recipientId: { in: allowedIds }, actorId, type: input.type, entityId: input.entityId },
    select: { id: true, recipientId: true },
  });
  const existingRecipientIds = new Set(existing.map((e) => e.recipientId));
  const now = new Date();

  // 3. Bump các bản ghi trùng (reset readAt, đẩy lên đầu)
  if (existing.length > 0) {
    await prisma.notification.updateMany({
      where: { id: { in: existing.map((e) => e.id) } },
      data: { reactionType: input.reactionType ?? null, readAt: null, createdAt: now },
    });
  }

  // 4. Tạo mới cho recipient chưa có
  const newRecipientIds = allowedIds.filter((id) => !existingRecipientIds.has(id));
  if (newRecipientIds.length > 0) {
    await prisma.notification.createMany({
      data: newRecipientIds.map((recipientId) => ({
        recipientId,
        actorId,
        type: input.type,
        entityType: input.entityType,
        entityId: input.entityId,
        reactionType: input.reactionType ?? null,
      })),
    });
  }

  // 5. Emit realtime cho từng recipient (chỉ query lại khi có socket server)
  const io = getRealtimeIo();
  if (!io) return;
  const toEmit = await prisma.notification.findMany({
    where: { recipientId: { in: allowedIds }, actorId, type: input.type, entityId: input.entityId },
    include: { actor: { select: actorSelect } },
  });
  for (const n of toEmit) {
    io.of('/notifications').to(`user:${n.recipientId}`).emit('notification:new', n);
  }
}
