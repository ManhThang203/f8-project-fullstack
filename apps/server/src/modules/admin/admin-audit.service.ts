import { prisma, type Prisma } from '@costy/db';
import type { AdminAuditLogDto } from '@costy/shared';

import {
  createdCursorOrderBy,
  createdCursorWhere,
  encodeCreatedCursor,
} from '../../lib/admin/cursor.js';

/** Danh sách audit log cho admin. */
export async function listAuditLogs(query: {
  cursor?: string;
  limit: number;
  actorId?: string;
  action?: string;
  from?: string;
  to?: string;
}): Promise<{ items: AdminAuditLogDto[]; nextCursor: string | null }> {
  const take = query.limit + 1;
  const and: Prisma.AdminAuditLogWhereInput[] = [
    ...(query.actorId ? [{ actorId: query.actorId }] : []),
    ...(query.action ? [{ action: { contains: query.action } }] : []),
    ...(query.from || query.to
      ? [
          {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          },
        ]
      : []),
  ];
  const cursorWhere = createdCursorWhere(query.cursor);
  if (cursorWhere) and.push(cursorWhere);

  const rows = await prisma.adminAuditLog.findMany({
    where: and.length ? { AND: and } : undefined,
    orderBy: createdCursorOrderBy,
    take,
    include: {
      actor: { select: { id: true, username: true, name: true } },
    },
  });

  const items: AdminAuditLogDto[] = rows.map((r) => ({
    id: r.id,
    actorId: r.actorId,
    action: r.action,
    targetType: r.targetType,
    targetId: r.targetId,
    metadata: (r.metadata as Record<string, unknown> | null) ?? null,
    createdAt: r.createdAt.toISOString(),
    actor: r.actor,
  }));

  const hasMore = items.length > query.limit;
  const page = hasMore ? items.slice(0, query.limit) : items;
  // nextCursor theo thứ tự DB (rows gốc)
  const lastRaw = hasMore ? rows[query.limit - 1] : null;
  const nextCursor = lastRaw ? encodeCreatedCursor(lastRaw) : null;
  return { items: page, nextCursor };
}
