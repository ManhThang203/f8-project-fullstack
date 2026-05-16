/**
 * Chat service — toàn bộ truy cập DB cho chat 1–1 và chat nhóm.
 *
 * Quy ước chung:
 * - Mọi hàm nhận `userId` đều coi là **đã xác thực** ở tầng route/socket.
 *   Service chỉ kiểm tra **authorization** (thành viên nhóm, không tự gửi cho mình…),
 *   không re-check session.
 * - Lỗi nghiệp vụ ném `AppError.*` để `errorMiddleware` map sang HTTP status chuẩn.
 * - `select` luôn được liệt kê tường minh — tránh lộ field nhạy cảm (`passwordHash`…)
 *   và giữ payload trả về ổn định cho FE.
 * - Đơn vị id: ChatMessage / ChatGroupMessage dùng **autoincrement number**;
 *   User id là **cuid string**. Cẩn thận khi truyền `beforeId` từ query string.
 */
import { prisma, Prisma } from '@threads/db';

import { AppError } from '../../lib/errors.js';

const MAX_BODY = 8000;
const MAX_GROUP_NAME = 191; // Khớp `@db.VarChar(191)` trong schema (xem `ChatGroup.name`).
const MAX_CONVERSATION_PEERS = 200; // Trần truy vấn `listConversationsForUser` để tránh blow-up.

/** Subset “public” của User dùng để hiển thị peer/avatar; KHÔNG chứa email/phone. */
const peerSelect = {
  id: true,
  username: true,
  name: true,
  image: true,
} as const;

/** Tham số phân trang ngược thời gian (cursor theo id giảm dần). */
type ListMsgOpts = { limit?: number; beforeId?: number };

/**
 * Tạo 1 tin nhắn 1–1 từ `senderId` → `recipientId`.
 *
 * Bước check theo thứ tự: rỗng → tự-gửi-mình → recipient tồn tại & chưa xoá mềm.
 * `deletedAt: null` để không gửi được cho user đã bị soft-delete (không lộ user đã xoá).
 * Trả về bản ghi vừa tạo (id/sender/recipient/body/createdAt) để socket emit luôn.
 */
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
 * Lấy lịch sử chat 1–1 giữa `userId` ↔ `peerUserId`, **mới nhất trước**.
 *
 * Phân trang “infinite scroll lên trên”: client truyền `beforeId` = id tin cũ nhất
 * đang hiển thị → service trả thêm `limit` tin có `id < beforeId`.
 * Query lấy theo `id desc` (rẻ, dùng index PK) rồi `reverse()` để UI render
 * theo thứ tự thời gian tăng dần mà không cần sort lại phía FE.
 *
 * `limit` clamp [1..200] để chống abuse (client truyền `limit=999999`).
 * Self-chat trả mảng rỗng để UI không phải xử lý case lạ.
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

  // Match cả 2 chiều (A→B và B→A) — không có “owner” riêng cho cặp chat.
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

/**
 * Đánh dấu “đã đọc” cuộc trò chuyện 1–1 tới thời điểm hiện tại.
 *
 * Lưu vào `ChatDirectReadState` (PK kép `userId + peerUserId`) — mỗi user **tự** theo
 * dõi mốc đọc của riêng mình; không động vào state của peer. `upsert` để lần đầu
 * mở thread cũng tạo row mới. `lastReadAt = now` → unread count = các tin từ peer
 * có `createdAt > lastReadAt` (xem `listConversationsForUser`).
 */
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

/**
 * Tương đương `markDirectThreadRead` nhưng cho chat nhóm.
 * Mốc đọc nằm ngay trên `ChatGroupMember.lastReadAt` (không cần bảng riêng).
 * Bắt buộc kiểm tra membership trước → tránh user ngoài nhóm “probe” groupId.
 */
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

/**
 * Lấy lịch sử tin của một nhóm — cùng pattern `listChatMessagesBetween`:
 * trả `id desc` rồi `reverse()`, clamp `limit`, hỗ trợ `beforeId` cho phân trang.
 *
 * Khác biệt: bắt buộc check `ChatGroupMember` trước khi đọc — group là tài nguyên
 * private; non-member không được xem dù biết `groupId`.
 */
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

/**
 * Gửi 1 tin vào nhóm. Logic giống `createChatMessage` nhưng:
 * - Authorization dựa vào `ChatGroupMember` (chỉ member mới được gửi).
 * - Không cần check “tự gửi mình” vì group là khái niệm nhiều người.
 */
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

/**
 * Tạo nhóm mới + đẩy creator và các member ban đầu vào `ChatGroupMember`.
 *
 * Chuẩn hoá danh sách: `Set` để khử trùng lặp, loại id rỗng, **bỏ creator ra rồi
 * thêm lại đầu mảng** → creator luôn ở vị trí 0 và xuất hiện đúng 1 lần kể cả khi
 * FE truyền lẫn vào `memberUserIds`.
 *
 * Validate tồn tại (`findMany ... in: allIds`) trước khi tạo → tránh tạo nhóm “mồ
 * côi” trỏ tới user không hợp lệ; so sánh `length` cũng bắt được id giả mạo.
 *
 * Bọc `$transaction` để nếu insert member fail thì nhóm cũng rollback (atomic).
 */
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
 * Build danh sách hội thoại cho sidebar Inbox: gộp **direct** + **group** rồi sort
 * theo `updatedAt` giảm dần. Trả về shape “đã chuẩn hoá” cho FE (kind = 'direct'|'group').
 *
 * Chiến lược:
 * 1. Direct: raw SQL `GROUP BY peer` để lấy mỗi peer 1 dòng — rẻ hơn nhiều so với
 *    `findMany` rồi reduce trong JS. `CASE WHEN` xác định “ai là peer” theo hướng tin.
 *    Dùng `Prisma.sql` (template tag) để Prisma vẫn parameterize → an toàn SQL injection.
 *    Giới hạn `MAX_CONVERSATION_PEERS` để chặn user có quá nhiều hội thoại làm chậm.
 * 2. Batch fetch user info + read-state theo `peerIds` — tránh N+1 cho phần peer/read.
 * 3. Với mỗi peer vẫn còn 1 query `findFirst` lấy `lastMessage` + 1 query `count` unread.
 *    Đây là N+1 **có chủ ý** (giới hạn bởi `MAX_CONVERSATION_PEERS`); nếu cần nhanh hơn
 *    có thể chuyển sang raw SQL `DISTINCT ON` / window function.
 * 4. Group: lấy memberships của user → loop lấy `lastMessage` + `unreadCount`
 *    (unread = tin từ người khác có `createdAt > member.lastReadAt`).
 * 5. Merge 2 mảng, sort theo `updatedAt`, project sang shape cuối (loại field tạm).
 *
 * Lưu ý: `updatedAt` của group có thể là `group.createdAt` khi chưa có tin nào — để
 * nhóm mới tạo vẫn xuất hiện trong list.
 */
export async function listConversationsForUser(userId: string) {
  const items: Array<Record<string, unknown>> = [];

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

    // Unread = tin **từ peer → mình** sau mốc `lastReadAt`. Nếu chưa từng mở
    // thread (`lastRead == null`) thì coi **mọi** tin peer gửi đều là unread.
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

  // Tất cả nhóm user đang là member; `include.group` để tránh query lại bảng nhóm.
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
    // Unread group = tin **không phải của mình** sau `lastReadAt`. Bỏ qua tin do
    // chính user gửi (FE không cần highlight unread cho tin mình vừa gửi).
    const lastRead = m.lastReadAt;
    const unreadCount = await prisma.chatGroupMessage.count({
      where: {
        groupId,
        senderId: { not: userId },
        ...(lastRead ? { createdAt: { gt: lastRead } } : {}),
      },
    });
    // Group rỗng vẫn cần `updatedAt` để sort → fallback về thời điểm tạo nhóm.
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

  // Merge direct + group rồi sort mới nhất trước — sort trong JS vì 2 nguồn
  // khác bảng, không thể UNION trực tiếp ở SQL mà giữ shape gọn.
  items.sort((a, b) => {
    const ta = (a.updatedAt as Date).getTime();
    const tb = (b.updatedAt as Date).getTime();
    return tb - ta;
  });

  // Project sang shape cuối cho FE: bỏ `updatedAt` (chỉ phục vụ sort nội bộ),
  // narrow type theo `kind` để FE phân nhánh an toàn.
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
