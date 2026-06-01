import { prisma } from '@costy/db';
import type {
  AdminReportDto,
  CreateReportBody,
  AdminReportListQuery,
  AdminReportReview,
  AdminReportAction,
} from '@costy/shared';

import { writeAuditLog } from '../../lib/admin/audit.service.js';
import { AppError } from '../../lib/errors.js';
import { patchAdminUserStatus } from './admin-users.service.js';
import { invalidateStatsCache } from './admin-stats.service.js';

function mapReport(r: {
  id: string;
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
  description: string | null;
  status: string;
  reviewedById: string | null;
  reviewedAt: Date | null;
  resolutionNote: string | null;
  createdAt: Date;
  reporter?: { id: string; username: string; name: string | null; image: string | null };
}): AdminReportDto {
  return {
    id: r.id,
    reporterId: r.reporterId,
    targetType: r.targetType as AdminReportDto['targetType'],
    targetId: r.targetId,
    reason: r.reason as AdminReportDto['reason'],
    description: r.description,
    status: r.status as AdminReportDto['status'],
    reviewedById: r.reviewedById,
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    resolutionNote: r.resolutionNote,
    createdAt: r.createdAt.toISOString(),
    reporter: r.reporter,
  };
}

/** User gửi báo cáo vi phạm. */
export async function createReport(reporterId: string, body: CreateReportBody): Promise<AdminReportDto> {
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
  return mapReport(report);
}

/** Danh sách báo cáo cho admin. */
export async function listAdminReports(
  query: AdminReportListQuery,
): Promise<{ items: AdminReportDto[]; nextCursor: string | null }> {
  const take = query.limit + 1;
  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.targetType ? { targetType: query.targetType } : {}),
    ...(query.reason ? { reason: query.reason } : {}),
    ...(query.cursor ? { id: { lt: query.cursor } } : {}),
  };

  const rows = await prisma.report.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take,
    include: {
      reporter: { select: { id: true, username: true, name: true, image: true } },
    },
  });

  const enriched = await Promise.all(
    rows.map(async (r) => {
      const reportCount = await prisma.report.count({
        where: { targetType: r.targetType, targetId: r.targetId },
      });
      let targetPreview: string | null = null;
      if (r.targetType === 'POST') {
        const post = await prisma.post.findUnique({
          where: { id: r.targetId },
          select: { content: true },
        });
        targetPreview = post?.content?.slice(0, 120) ?? null;
      }
      return { ...mapReport(r), reportCount, targetPreview };
    }),
  );

  const hasMore = enriched.length > query.limit;
  const page = hasMore ? enriched.slice(0, query.limit) : enriched;
  const nextCursor = hasMore && page.length ? page[page.length - 1]!.id : null;
  return { items: page, nextCursor };
}

/** Duyệt / từ chối báo cáo. */
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
    metadata: { status: body.status },
  });

  return mapReport(updated);
}

/** Hành động kiểm duyệt từ báo cáo: ẩn/xóa bài, ban tác giả. */
export async function executeReportAction(
  actorId: string,
  reportId: string,
  body: AdminReportAction,
): Promise<AdminReportDto> {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) throw AppError.notFound('Không tìm thấy báo cáo');

  if (report.targetType === 'POST') {
    const post = await prisma.post.findUnique({
      where: { id: report.targetId },
      select: { id: true, authorId: true },
    });
    if (!post) throw AppError.notFound('Bài viết không tồn tại');

    if (body.action === 'hide_post') {
      await prisma.post.update({
        where: { id: post.id },
        data: { hiddenAt: new Date() },
      });
    }
    if (body.action === 'delete_post') {
      await prisma.post.update({
        where: { id: post.id },
        data: { deletedAt: new Date() },
      });
    }
    if (body.action === 'ban_author_temp' || body.action === 'ban_author_perm') {
      await patchAdminUserStatus(actorId, post.authorId, {
        action: body.action === 'ban_author_temp' ? 'ban_temp' : 'ban_perm',
        reason: body.reason,
        bannedUntil: body.bannedUntil,
      });
    }
  }

  const updated = await prisma.report.update({
    where: { id: reportId },
    data: {
      status: 'ACTION_TAKEN',
      reviewedById: actorId,
      reviewedAt: new Date(),
      resolutionNote: body.reason,
    },
    include: {
      reporter: { select: { id: true, username: true, name: true, image: true } },
    },
  });

  await invalidateStatsCache();

  await writeAuditLog({
    actorId,
    action: `REPORT_${body.action.toUpperCase()}`,
    targetType: 'REPORT',
    targetId: reportId,
    metadata: { action: body.action },
  });

  return mapReport(updated);
}

/** Chi tiết một báo cáo. */
export async function getAdminReport(reportId: string): Promise<AdminReportDto> {
  const r = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      reporter: { select: { id: true, username: true, name: true, image: true } },
    },
  });
  if (!r) throw AppError.notFound('Không tìm thấy báo cáo');
  return mapReport(r);
}

/** Số báo cáo đang chờ duyệt. */
export async function countPendingReports(): Promise<number> {
  return prisma.report.count({ where: { status: 'PENDING' } });
}
