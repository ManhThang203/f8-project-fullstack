import { prisma, type Prisma } from '@costy/db';
import type {
  AdminReportDto,
  AdminReportDetailDto,
  AdminReportListQuery,
  AdminReportReview,
  CreateReportBody,
  Role,
} from '@costy/shared';

import { writeAuditLog } from '../../lib/admin/audit.service.js';
import {
  createdCursorOrderBy,
  createdCursorWhere,
  encodeCreatedCursor,
} from '../../lib/admin/cursor.js';
import { AppError } from '../../lib/errors.js';

import {
  countTargetReports,
  runAntiAbuseCheck,
} from './admin-reports.helpers.js';
import { mapReport } from './admin-reports.mapper.js';
import { invalidateStatsCache } from './admin-stats.service.js';

export { executeReportAction } from './admin-reports.actions.service.js';

/** User gửi báo cáo vi phạm. */
export async function createReport(
  reporterId: string,
  body: CreateReportBody,
): Promise<AdminReportDto> {
  // 1. Check self-reporting
  if (body.targetType === 'POST') {
    const post = await prisma.post.findUnique({
      where: { id: body.targetId },
      select: { authorId: true },
    });
    if (post && post.authorId === reporterId) {
      throw AppError.badRequest('Bạn không thể báo cáo bài viết của chính mình');
    }
  } else if (body.targetType === 'USER') {
    if (body.targetId === reporterId) {
      throw AppError.badRequest('Bạn không thể báo cáo chính bản thân mình');
    }
  }

  // 2. Duplicate check — unique constraint ở DB cũng bắt, nhưng check trước để trả lỗi rõ hơn
  const existing = await prisma.report.findFirst({
    where: { reporterId, targetType: body.targetType, targetId: body.targetId },
  });
  if (existing) {
    throw AppError.conflict('Bạn đã báo cáo nội dung này trước đó');
  }

  // 3. Anti-abuse check (không block việc tạo)
  await runAntiAbuseCheck(reporterId);

  // 3. Tạo report
  const report = await prisma.report.create({
    data: {
      reporterId,
      targetType: body.targetType,
      targetId: body.targetId,
      reason: body.reason,
      description: body.description ?? null,
    },
    include: {
      reporter: { select: { id: true, username: true, name: true, image: true } },
    },
  });

  // 4. Đếm reportCount để trả về cho client
  const reportCount = await countTargetReports(body.targetType, body.targetId);

  return mapReport({ ...report, reportCount });
}

/** Danh sách báo cáo cho admin — hỗ trợ filter + sort by priority. */
export async function listAdminReports(
  query: AdminReportListQuery,
): Promise<{ items: AdminReportDto[]; nextCursor: string | null }> {
  const take = query.limit + 1;
  const openQueueStatuses = ['PENDING', 'UNDER_REVIEW', 'AUTO_HIDDEN'] as const;
  const and: Prisma.ReportWhereInput[] = [
    ...(query.queue === 'open'
      ? [{ status: { in: [...openQueueStatuses] } }]
      : query.status
        ? [{ status: query.status }]
        : []),
    ...(query.targetType ? [{ targetType: query.targetType }] : []),
    ...(query.reason ? [{ reason: query.reason }] : []),
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

  const rows = await prisma.report.findMany({
    where: and.length ? { AND: and } : undefined,
    orderBy: createdCursorOrderBy,
    take,
    include: {
      reporter: { select: { id: true, username: true, name: true, image: true } },
    },
  });

  const hasMore = rows.length > query.limit;
  const pageRows = hasMore ? rows.slice(0, query.limit) : rows;
  // Lấy row cuối cùng của trang hiện tại
  const lastRaw = hasMore ? rows[query.limit - 1] : null;
  // Encode cursor từ row cuối cùng
  const nextCursor = lastRaw ? encodeCreatedCursor(lastRaw) : null;

  // Batch: đếm reportCount theo target (groupBy) và lấy preview post (IN) trong 2 query cố định
  const targetIds = [...new Set(pageRows.map((r) => r.targetId))];
  const countGroups = targetIds.length
    ? await prisma.report.groupBy({
        by: ['targetType', 'targetId'],
        where: { targetId: { in: targetIds } },
        _count: { _all: true },
      })
    : [];
  const countMap = new Map(
    countGroups.map((g) => [`${g.targetType}:${g.targetId}`, g._count._all]),
  );

  const postIds = [
    ...new Set(pageRows.filter((r) => r.targetType === 'POST').map((r) => r.targetId)),
  ];
  const posts = postIds.length
    ? await prisma.post.findMany({
        where: { id: { in: postIds } },
        select: { id: true, content: true },
      })
    : [];
  const postContentMap = new Map(posts.map((p) => [p.id, p.content]));

  const enriched = pageRows.map((r) => {
    const reportCount = countMap.get(`${r.targetType}:${r.targetId}`) ?? 0;
    const targetPreview =
      r.targetType === 'POST' ? (postContentMap.get(r.targetId)?.slice(0, 120) ?? null) : null;
    return { ...mapReport(r), reportCount, targetPreview };
  });

  // Không re-sort theo reportCount trong bộ nhớ: cursor phân trang dựa trên thứ tự
  // createdAt/id của DB, re-sort chỉ trong 1 trang sẽ làm queue lệch cursor (trùng/thiếu).
  return { items: enriched, nextCursor };
}

/** Chi tiết một báo cáo — kèm related reports, target content, audit logs. */
export async function getAdminReport(reportId: string): Promise<AdminReportDetailDto> {
  const r = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      reporter: { select: { id: true, username: true, name: true, image: true } },
    },
  });
  if (!r) throw AppError.notFound('Không tìm thấy báo cáo');

  const reportCount = await countTargetReports(r.targetType, r.targetId);

  // Lấy target content + author + media
  let targetContent: string | null = null;
  let targetAuthor: AdminReportDetailDto['targetAuthor'] = null;
  let targetMedia: AdminReportDetailDto['targetMedia'] = null;

  if (r.targetType === 'POST') {
    const post = await prisma.post.findUnique({
      where: { id: r.targetId },
      select: {
        content: true,
        author: {
          select: { id: true, username: true, name: true, image: true, status: true, role: true },
        },
        media: { select: { id: true, kind: true, publicUrl: true } },
      },
    });
    targetContent = post?.content ?? null;
    targetAuthor = post?.author
      ? {
          id: post.author.id,
          username: post.author.username,
          name: post.author.name,
          image: post.author.image,
          status: post.author.status as string,
          role: post.author.role as Role,
        }
      : null;
    targetMedia = post?.media ?? null;
  } else if (r.targetType === 'USER') {
    const user = await prisma.user.findUnique({
      where: { id: r.targetId },
      select: { id: true, username: true, name: true, image: true, status: true, role: true },
    });
    targetAuthor = user
      ? {
          id: user.id,
          username: user.username,
          name: user.name,
          image: user.image,
          status: user.status as string,
          role: user.role as Role,
        }
      : null;
  }

  // Related reports trên cùng target
  const relatedRows = await prisma.report.findMany({
    where: { targetType: r.targetType, targetId: r.targetId, id: { not: reportId } },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      reporter: { select: { id: true, username: true, name: true, image: true } },
    },
  });

  // Audit logs liên quan đến report này hoặc target
  const auditRows = await prisma.adminAuditLog.findMany({
    where: {
      OR: [
        { targetType: 'REPORT', targetId: reportId },
        { targetType: r.targetType, targetId: r.targetId },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { actor: { select: { id: true, username: true, name: true } } },
  });

  return {
    ...mapReport({ ...r, reportCount }),
    targetContent,
    targetAuthor,
    targetMedia,
    relatedReports: relatedRows.map((row) => mapReport(row)),
    auditLogs: auditRows.map((a) => ({
      id: a.id,
      actorId: a.actorId,
      action: a.action,
      targetType: a.targetType,
      targetId: a.targetId,
      metadata: (a.metadata as Record<string, unknown> | null) ?? null,
      createdAt: a.createdAt.toISOString(),
      actor: a.actor,
    })),
  };
}

/** Admin cập nhật status report (mark under review / dismiss). */
export async function reviewReport(
  actorId: string,
  reportId: string,
  body: AdminReportReview,
): Promise<AdminReportDto> {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) throw AppError.notFound('Không tìm thấy báo cáo');

  const updated = await prisma.report.update({
    where: { id: reportId },
    data: {
      status: body.status,
      reviewedById: actorId,
      reviewedAt: new Date(),
      resolutionNote: body.resolutionNote ?? null,
    },
    include: {
      reporter: { select: { id: true, username: true, name: true, image: true } },
    },
  });

  await invalidateStatsCache();

  await writeAuditLog({
    actorId,
    action: 'REPORT_REVIEW',
    targetType: 'REPORT',
    targetId: reportId,
    metadata: {
      previousStatus: report.status,
      newStatus: body.status,
      resolutionNote: body.resolutionNote ?? null,
    },
  });

  return mapReport(updated);
}

/** Số báo cáo đang chờ admin xử lý (gồm AUTO_HIDDEN cũ). */
export async function countPendingReports(): Promise<number> {
  return prisma.report.count({
    where: { status: { in: ['PENDING', 'UNDER_REVIEW', 'AUTO_HIDDEN'] } },
  });
}
