/**
 * Chat service — truy cập DB cho chat 1-1 và nhóm.
 *
 * Quy ước: `userId` đã auth ở route/socket; service chỉ check authorization.
 * Message id = number (autoincrement), User id = cuid string.
 */

import { prisma, Prisma } from '@threads/db';

import { AppError } from '../../lib/errors.js';

const MAX_BODY = 8000;
const MAX_GROUP_NAME = 191;
const MAX_CONVERSATION_PEERS = 200;

const peerSelect = {
  id: true,
  username: true,
  name: true,
  image: true,
} as const;

type ListMsgOpts = { limit?: number; beforeId?: number };

/** Gửi tin 1-1: validate body → check recipient tồn tại → insert DB. */
export async function createChatMessage(input: {
  senderId: string;
  recipientId: string;
  body: string;
}) {
  const body = String(input.body ?? '')
    .trim()
    .slice(0, MAX_BODY);
  if (!body) {
    throw AppError.badRequest('Nội dung tin nhắn không được để trống.');
  }
  if (input.senderId === input.recipientId) {
    throw AppError.badRequest('Không thể gửi tin cho chính mình.');
  }

  const recipient = await prisma.user.findFirst({
    where: {
      id: input.recipientId,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!recipient) {
    throw AppError.notFound('Không tìm thấy người nhận.');
  }

  return prisma.chatMessage.create({
    data: {
      senderId: input.senderId,
      recipientId: input.recipientId,
      body,
    },
    select: {
      id: true,
      senderId: true,
      recipientId: true,
      body: true,
      createdAt: true,
    },
  });
}

/**
 * Lịch sử chat 1-1, phân trang cursor `beforeId`.
 * Query id desc rồi reverse → FE nhận thứ tự thời gian tăng dần.
 */
export async function listChatMessagesBetween(
  userId: string,
  peerUserId: string,
  opts: ListMsgOpts = {},
) {
  const limit = Math.min(Math.max(Number(opts.limit) || 40, 1), 200);
  if (userId === peerUserId) {
    return [];
  }

  const beforeId =
    opts.beforeId != null && Number.isFinite(Number(opts.beforeId))
      ? Math.floor(Number(opts.beforeId))
      : null;

  const pairOr: Prisma.ChatMessageWhereInput[] = [
    { senderId: userId, recipientId: peerUserId },
    { senderId: peerUserId, recipientId: userId },
  ];

  const rows = await prisma.chatMessage.findMany({
    where: {
      AND: [{ OR: pairOr }, ...(beforeId != null ? [{ id: { lt: beforeId } }] : [])],
    },
    orderBy: { id: 'desc' },
    take: limit,
    select: {
      id: true,
      senderId: true,
      recipientId: true,
      body: true,
      createdAt: true,
    },
  });

  return rows.reverse();
}

/** Đánh dấu đã đọc thread 1-1 — mỗi user có mốc riêng trong `ChatDirectReadState`. */
export async function markDirectThreadRead(userId: string, peerUserId: string) {
  if (userId === peerUserId) {
    return;
  }
  const now = new Date();
  await prisma.chatDirectReadState.upsert({
    where: {
      userId_peerUserId: { userId, peerUserId },
    },
    create: { userId, peerUserId, lastReadAt: now },
    update: { lastReadAt: now },
  });
}

/** Đánh dấu đã đọc thread nhóm — cập nhật `ChatGroupMember.lastReadAt`. */
export async function markGroupThreadRead(userId: string, groupId: number) {
  const mem = await prisma.chatGroupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    select: { groupId: true },
  });
  if (!mem) {
    throw AppError.forbidden('Bạn không thuộc nhóm này.');
  }
  await prisma.chatGroupMember.update({
    where: { groupId_userId: { groupId, userId } },
    data: { lastReadAt: new Date() },
  });
}

/** Lịch sử tin nhóm — cùng pattern phân trang với chat 1-1, bắt buộc check membership. */
export async function listGroupMessages(userId: string, groupId: number, opts: ListMsgOpts = {}) {
  const limit = Math.min(Math.max(Number(opts.limit) || 40, 1), 200);
  const beforeId =
    opts.beforeId != null && Number.isFinite(Number(opts.beforeId))
      ? Math.floor(Number(opts.beforeId))
      : null;

  const mem = await prisma.chatGroupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    select: { groupId: true },
  });
  if (!mem) {
    throw AppError.forbidden('Bạn không thuộc nhóm này.');
  }
  const rows = await prisma.chatGroupMessage.findMany({
    where: {
      groupId,
      ...(beforeId != null ? { id: { lt: beforeId } } : {}),
    },
    orderBy: { id: 'desc' },
    take: limit,
    select: {
      id: true,
      groupId: true,
      senderId: true,
      body: true,
      createdAt: true,
    },
  });
  return rows.reverse();
}

/** Gửi tin nhóm — chỉ member mới được gửi. */
export async function createGroupMessage(input: {
  senderId: string;
  groupId: number;
  body: string;
}) {
  const body = String(input.body ?? '')
    .trim()
    .slice(0, MAX_BODY);
  if (!body) {
    throw AppError.badRequest('Nội dung tin nhắn không được để trống.');
  }
  const mem = await prisma.chatGroupMember.findUnique({
    where: { groupId_userId: { groupId: input.groupId, userId: input.senderId } },
    select: { groupId: true },
  });
  if (!mem) {
    throw AppError.forbidden('Bạn không thuộc nhóm này.');
  }
  return prisma.chatGroupMessage.create({
    data: {
      groupId: input.groupId,
      senderId: input.senderId,
      body,
    },
    select: {
      id: true,
      groupId: true,
      senderId: true,
      body: true,
      createdAt: true,
    },
  });
}

/** Tạo nhóm + members trong transaction — validate user tồn tại trước khi insert. */
export async function createChatGroup(input: {
  creatorId: string;
  name: string;
  memberUserIds: string[];
}) {
  const name = String(input.name ?? '')
    .trim()
    .slice(0, MAX_GROUP_NAME);
  if (!name) {
    throw AppError.badRequest('Tên nhóm không được để trống.');
  }
  const creatorId = input.creatorId;
  const rawIds = Array.isArray(input.memberUserIds) ? input.memberUserIds : [];
  const memberSet = new Set([
    creatorId,
    ...rawIds.filter((id) => typeof id === 'string' && id.length > 0),
  ]);
  memberSet.delete(creatorId);
  const others = [...memberSet];
  if (others.length < 1) {
    throw AppError.badRequest('Nhóm cần ít nhất một thành viên khác ngoài bạn.');
  }
  const allIds = [creatorId, ...others];
  const users = await prisma.user.findMany({
    where: {
      id: { in: allIds },
      deletedAt: null,
    },
    select: { id: true },
  });
  if (users.length !== allIds.length) {
    throw AppError.badRequest('Một hoặc nhiều thành viên không hợp lệ.');
  }

  const group = await prisma.$transaction(async (tx) =>
    tx.chatGroup.create({
      data: {
        name,
        createdById: creatorId,
        members: {
          create: allIds.map((userId) => ({ userId })),
        },
      },
      select: { id: true, name: true, createdAt: true, createdById: true },
    }),
  );

  return group;
}

type DirectAggRow = { peerUserId: string; lastAt: Date };

/**
 * Danh sách hội thoại cho Inbox sidebar — gộp direct + group, sort mới nhất trước.
 *
 * - Direct: raw SQL GROUP BY peer để tìm tất cả cuộc hội thoại 1-1.
 * - Group: loop qua membership, lấy lastMessage + unreadCount mỗi nhóm.
 * - Cuối cùng merge + sort theo updatedAt desc trước khi trả về.
 */
export async function listConversationsForUser(userId: string) {
  const items: Array<Record<string, unknown>> = [];

  // ── Direct conversations ───────────────────────────────────────────────────

  // Raw SQL để lấy danh sách peer và thời điểm tin cuối — GROUP BY peer hiệu quả hơn ORM.
  const directAgg = await prisma.$queryRaw<DirectAggRow[]>(
    Prisma.sql`
      SELECT
        CASE WHEN "senderId" = ${userId} THEN "recipientId" ELSE "senderId" END AS "peerUserId",
        MAX("createdAt") AS "lastAt"
      FROM "chat_messages"
      WHERE "senderId" = ${userId} OR "recipientId" = ${userId}
      GROUP BY 1
      ORDER BY MAX("createdAt") DESC
      LIMIT ${MAX_CONVERSATION_PEERS}
    `,
  );

  const peerIds = directAgg.map((r) => r.peerUserId).filter(Boolean);

  // Batch-load trạng thái đã đọc và thông tin peer để tránh N+1.
  const readStates =
    peerIds.length === 0
      ? []
      : await prisma.chatDirectReadState.findMany({
          where: { userId, peerUserId: { in: peerIds } },
        });
  const readMap = new Map(readStates.map((s) => [s.peerUserId, s.lastReadAt]));

  const peers =
    peerIds.length === 0
      ? []
      : await prisma.user.findMany({
          where: { id: { in: peerIds }, deletedAt: null },
          select: peerSelect,
        });
  const peerById = new Map(peers.map((p) => [p.id, p]));

  for (const row of directAgg) {
    const peerUserId = row.peerUserId;
    if (!peerUserId) continue;

    const lastMsg = await prisma.chatMessage.findFirst({
      where: {
        OR: [
          { senderId: userId, recipientId: peerUserId },
          { senderId: peerUserId, recipientId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        senderId: true,
        recipientId: true,
        body: true,
        createdAt: true,
      },
    });
    if (!lastMsg) continue;

    const lastRead = readMap.get(peerUserId) ?? null;
    const unreadWhere: Prisma.ChatMessageWhereInput = {
      senderId: peerUserId,
      recipientId: userId,
      ...(lastRead ? { createdAt: { gt: lastRead } } : {}),
    };
    const unreadCount = await prisma.chatMessage.count({ where: unreadWhere });

    items.push({
      kind: 'direct',
      peerUserId,
      peer: peerById.get(peerUserId) ?? {
        id: peerUserId,
        username: peerUserId.slice(0, 8),
        name: null,
        image: null,
      },
      lastMessage: {
        id: lastMsg.id,
        senderId: lastMsg.senderId,
        recipientId: lastMsg.recipientId,
        body: lastMsg.body,
        createdAt: lastMsg.createdAt.toISOString(),
      },
      unreadCount,
      updatedAt: lastMsg.createdAt,
    });
  }

  // ── Group conversations ────────────────────────────────────────────────────

  const memberships = await prisma.chatGroupMember.findMany({
    where: { userId },
    include: {
      group: { select: { id: true, name: true, createdAt: true } },
    },
  });

  for (const m of memberships) {
    const { groupId } = m;
    const lastMsg = await prisma.chatGroupMessage.findFirst({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        groupId: true,
        senderId: true,
        body: true,
        createdAt: true,
      },
    });
    const lastRead = m.lastReadAt;
    const unreadCount = await prisma.chatGroupMessage.count({
      where: {
        groupId,
        senderId: { not: userId },
        ...(lastRead ? { createdAt: { gt: lastRead } } : {}),
      },
    });
    const updatedAt = lastMsg?.createdAt ?? m.group.createdAt;
    items.push({
      kind: 'group',
      groupId,
      name: m.group.name,
      lastMessage: lastMsg
        ? {
            id: lastMsg.id,
            groupId: lastMsg.groupId,
            senderId: lastMsg.senderId,
            body: lastMsg.body,
            createdAt: lastMsg.createdAt.toISOString(),
          }
        : null,
      unreadCount,
      updatedAt,
    });
  }

  // ── Sort & serialize ───────────────────────────────────────────────────────

  items.sort((a, b) => {
    const ta = (a.updatedAt as Date).getTime();
    const tb = (b.updatedAt as Date).getTime();
    return tb - ta;
  });

  return items.map((it) => {
    if (it.kind === 'direct') {
      return {
        kind: 'direct' as const,
        peerUserId: it.peerUserId as string,
        peer: it.peer,
        lastMessage: it.lastMessage,
        unreadCount: it.unreadCount as number,
      };
    }
    return {
      kind: 'group' as const,
      groupId: it.groupId as number,
      name: it.name as string,
      lastMessage: it.lastMessage,
      unreadCount: it.unreadCount as number,
    };
  });
}
