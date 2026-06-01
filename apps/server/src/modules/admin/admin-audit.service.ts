import { prisma } from '@costy/db';
import type { AdminAuditLogDto } from '@costy/shared';

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
  const where = {
    ...(query.actorId ? { actorId: query.actorId } : {}),
    ...(query.action ? { action: { contains: query.action } } : {}),
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from ? { gte: new Date(query.from) } : {}),
            ...(query.to ? { lte: new Date(query.to) } : {}),
          },
        }
      : {}),
    ...(query.cursor ? { id: { lt: query.cursor } } : {}),
  };

  const rows = await prisma.adminAuditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
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
  const nextCursor = hasMore && page.length ? page[page.length - 1]!.id : null;
  return { items: page, nextCursor };
}
