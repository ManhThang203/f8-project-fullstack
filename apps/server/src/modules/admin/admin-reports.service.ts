import { prisma, ReportTargetType, ReportReason } from '@costy/db';
import type {
  AdminReportDto,
  AdminReportDetailDto,
  CreateReportBody,
  AdminReportListQuery,
  AdminReportReview,
  AdminReportAction,
} from '@costy/shared';

import { REPORT_CONFIG } from '../../config/report.config.js';
import { writeAuditLog } from '../../lib/admin/audit.service.js';
import { AppError } from '../../lib/errors.js';
import { createNotification } from '../notifications/notifications.service.js';
import { patchAdminUserStatus } from './admin-users.service.js';
import { invalidateStatsCache } from './admin-stats.service.js';

// ─────────────────────────────────────────────
// Mapper
// ─────────────────────────────────────────────

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
  reportCount?: number;
  targetPreview?: string | null;
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
    reportCount: r.reportCount,
    targetPreview: r.targetPreview,
  };
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Đếm số reports active trên một target (dùng cho priority / auto-hide). */
async function countTargetReports(
  targetType: ReportTargetType,
  targetId: string,
  reason?: ReportReason,
): Promise<number> {
  return prisma.report.count({
    where: {
      targetType,
      targetId,
      ...(reason ? { reason } : {}),
    },
  });
}

/**
 * Sau khi tạo report → kiểm tra threshold auto-hide (MINOR_SAFETY).
 * Nếu đạt → ẩn bài, cập nhật tất cả reports liên quan thành AUTO_HIDDEN,
 * ghi audit log với actor = SYSTEM.
 */
async function runAutoHideCheck(targetType: string, targetId: string): Promise<void> {
  if (targetType !== 'POST') return;

  const count = await countTargetReports(targetType, targetId, 'MINOR_SAFETY');
  if (count < REPORT_CONFIG.autoHideThreshold) return;

  // Kiểm tra bài chưa bị ẩn/xóa
  const post = await prisma.post.findUnique({
    where: { id: targetId },
    select: { id: true, hiddenAt: true, deletedAt: true },
  });
  if (!post || post.hiddenAt || post.deletedAt) return;

  await prisma.$transaction([
    prisma.post.update({
      where: { id: targetId },
      data: { hiddenAt: new Date() },
    }),
    prisma.report.updateMany({
      where: { targetType, targetId, status: { in: ['PENDING', 'UNDER_REVIEW'] } },
      data: { status: 'AUTO_HIDDEN' },
    }),
  ]);

  await writeAuditLog({
    actorId: 'SYSTEM',
    action: 'AUTO_HIDE_POST',
    targetType: 'POST',
    targetId,
    metadata: {
      reason: 'MINOR_SAFETY',
      reportCount: count,
      threshold: REPORT_CONFIG.autoHideThreshold,
      trigger: 'auto_threshold',
    },
  });
}

/**
 * Kiểm tra anti-abuse: reporter có quá nhiều reports bị DISMISSED trong ngày?
 * Nếu vượt ngưỡng → ghi audit log cảnh báo (vẫn cho tạo report).
 */
async function runAntiAbuseCheck(reporterId: string): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dismissedCount = await prisma.report.count({
    where: {
      reporterId,
      status: 'DISMISSED',
      createdAt: { gte: today },
    },
  });

  if (dismissedCount >= REPORT_CONFIG.antiAbuseDailyLimit) {
    await writeAuditLog({
      actorId: 'SYSTEM',
      action: 'REPORT_ABUSE_FLAG',
      targetType: 'USER',
      targetId: reporterId,
      metadata: {
        dismissedToday: dismissedCount,
        limit: REPORT_CONFIG.antiAbuseDailyLimit,
      },
    });
  }
}

/**
 * Batch-resolve tất cả reports PENDING/UNDER_REVIEW trên cùng target
 * sau khi admin đã xử lý xong (giống Facebook — tránh xử lý lại).
 */
async function batchResolveRelatedReports(
  targetType: ReportTargetType,
  targetId: string,
  excludeReportId: string,
  actorId: string,
  resolutionNote: string,
): Promise<void> {
  await prisma.report.updateMany({
    where: {
      targetType,
      targetId,
      status: { in: ['PENDING', 'UNDER_REVIEW'] },
      id: { not: excludeReportId },
    },
    data: {
      status: 'RESOLVED',
      reviewedById: actorId,
      reviewedAt: new Date(),
      resolutionNote: `[Batch resolved] ${resolutionNote}`,
    },
  });
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

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

  // 4. Auto-hide check (bất đồng bộ, không block response)
  void runAutoHideCheck(body.targetType, body.targetId);

  // 5. Đếm reportCount để trả về cho client
  const reportCount = await countTargetReports(body.targetType, body.targetId);

  return mapReport({ ...report, reportCount });
}

/** Danh sách báo cáo cho admin — hỗ trợ filter + sort by priority. */
export async function listAdminReports(
  query: AdminReportListQuery,
): Promise<{ items: AdminReportDto[]; nextCursor: string | null }> {
  const take = query.limit + 1;
  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.targetType ? { targetType: query.targetType } : {}),
    ...(query.reason ? { reason: query.reason } : {}),
    ...(query.cursor ? { id: { lt: query.cursor } } : {}),
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from ? { gte: new Date(query.from) } : {}),
            ...(query.to ? { lte: new Date(query.to) } : {}),
          },
        }
      : {}),
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
      const reportCount = await countTargetReports(r.targetType, r.targetId);
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

  // Sort by reportCount desc (priority cao lên đầu) sau khi đã enrich
  enriched.sort((a, b) => (b.reportCount ?? 0) - (a.reportCount ?? 0));

  const hasMore = enriched.length > query.limit;
  const page = hasMore ? enriched.slice(0, query.limit) : enriched;
  const nextCursor = hasMore && page.length ? page[page.length - 1]!.id : null;
  return { items: page, nextCursor };
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
        author: { select: { id: true, username: true, name: true, image: true, status: true } },
        media: { select: { id: true, kind: true, publicUrl: true } },
      },
    });
    targetContent = post?.content ?? null;
    targetAuthor = post?.author
      ? { ...post.author, status: post.author.status as string }
      : null;
    targetMedia = post?.media ?? null;
  } else if (r.targetType === 'USER') {
    const user = await prisma.user.findUnique({
      where: { id: r.targetId },
      select: { id: true, username: true, name: true, image: true, status: true },
    });
    targetAuthor = user ? { ...user, status: user.status as string } : null;
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

/** Admin thực thi hành động kiểm duyệt — ẩn/xóa bài, warn/ban user. */
export async function executeReportAction(
  actorId: string,
  reportId: string,
  body: AdminReportAction,
): Promise<AdminReportDto> {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) throw AppError.notFound('Không tìm thấy báo cáo');

  let auditAction = body.action;
  let auditMetadata: Record<string, unknown> = {
    reportId,
    targetType: report.targetType,
    targetId: report.targetId,
    resolutionNote: body.resolutionNote,
  };

  // ── Xử lý theo action ──────────────────────────────────

  if (body.action === 'DISMISS') {
    // Không có side-effect — chỉ update status
    auditMetadata = {
      ...auditMetadata,
      reporterUsername: report.reporterId,
    };
  }

  if (body.action === 'HIDE_POST' || body.action === 'DELETE_POST') {
    if (report.targetType !== 'POST') {
      throw AppError.badRequest('Action này chỉ áp dụng cho báo cáo bài viết');
    }
    const post = await prisma.post.findUnique({
      where: { id: report.targetId },
      select: { id: true, authorId: true, content: true },
    });
    if (!post) throw AppError.notFound('Bài viết không tồn tại');

    if (body.action === 'HIDE_POST') {
      await prisma.post.update({
        where: { id: post.id },
        data: { hiddenAt: new Date() },
      });
      auditMetadata = {
        ...auditMetadata,
        postId: post.id,
        postAuthorId: post.authorId,
        previousState: { hiddenAt: null },
        reportCount: await countTargetReports(report.targetType, report.targetId),
      };
    }

    if (body.action === 'DELETE_POST') {
      await prisma.post.update({
        where: { id: post.id },
        data: { deletedAt: new Date() },
      });
      auditMetadata = {
        ...auditMetadata,
        postId: post.id,
        postAuthorId: post.authorId,
        // Lưu lại content để audit trail
        postContent: post.content.slice(0, 500),
        reportCount: await countTargetReports(report.targetType, report.targetId),
      };
    }
  }

  if (body.action === 'WARN_USER') {
    // Lấy targetUserId: nếu report POST → authorId; nếu report USER → targetId
    let warnedUserId = report.targetId;
    if (report.targetType === 'POST') {
      const post = await prisma.post.findUnique({
        where: { id: report.targetId },
        select: { authorId: true },
      });
      if (!post) throw AppError.notFound('Bài viết không tồn tại');
      warnedUserId = post.authorId;
    }

    const warnedUser = await prisma.user.findUnique({
      where: { id: warnedUserId },
      select: { id: true, username: true },
    });

    // Đếm số warning từ audit logs
    const warningCount = await prisma.adminAuditLog.count({
      where: { action: 'WARN_USER', targetType: 'USER', targetId: warnedUserId },
    });

    // Gửi notification cảnh báo cho user vi phạm
    const warnNotification = await createNotification({
      recipientId: warnedUserId,
      actorId,
      type: 'SYSTEM',
      entityType: 'REPORT',
      entityId: reportId,
    });

    auditMetadata = {
      ...auditMetadata,
      warnedUserId,
      warnedUsername: warnedUser?.username ?? null,
      warningCount: warningCount + 1,
      notificationId: warnNotification.id,
    };
  }

  if (body.action === 'BAN_ACCOUNT') {
    let bannedUserId = report.targetId;
    if (report.targetType === 'POST') {
      const post = await prisma.post.findUnique({
        where: { id: report.targetId },
        select: { authorId: true },
      });
      if (!post) throw AppError.notFound('Bài viết không tồn tại');
      bannedUserId = post.authorId;
    }

    const bannedUser = await prisma.user.findUnique({
      where: { id: bannedUserId },
      select: { id: true, username: true, status: true },
    });

    const totalReports = await countTargetReports(report.targetType, bannedUserId);

    await patchAdminUserStatus(actorId, bannedUserId, {
      action: body.bannedUntil ? 'ban_temp' : 'ban_perm',
      reason: body.resolutionNote,
      bannedUntil: body.bannedUntil,
    });

    auditMetadata = {
      ...auditMetadata,
      bannedUserId,
      bannedUsername: bannedUser?.username ?? null,
      previousStatus: bannedUser?.status ?? null,
      banType: body.bannedUntil ? 'temporary' : 'permanent',
      bannedUntil: body.bannedUntil ?? null,
      totalReportsAgainst: totalReports,
    };
  }

  // ── Cập nhật report status ──────────────────────────

  const finalStatus = body.action === 'DISMISS' ? 'DISMISSED' : 'RESOLVED';

  const updated = await prisma.report.update({
    where: { id: reportId },
    data: {
      status: finalStatus,
      reviewedById: actorId,
      reviewedAt: new Date(),
      resolutionNote: body.resolutionNote,
    },
    include: {
      reporter: { select: { id: true, username: true, name: true, image: true } },
    },
  });

  // ── Batch resolve related reports ──────────────────

  if (body.action !== 'DISMISS') {
    await batchResolveRelatedReports(
      report.targetType,
      report.targetId,
      reportId,
      actorId,
      body.resolutionNote,
    );
  }

  await invalidateStatsCache();

  // ── Ghi audit log ──────────────────────────────────

  await writeAuditLog({
    actorId,
    action: auditAction,
    targetType: 'REPORT',
    targetId: reportId,
    metadata: auditMetadata,
  });

  // ── Notification cho reporter ───────────────────────

  await createNotification({
    recipientId: report.reporterId,
    actorId,
    type: 'REPORT_RESOLVED',
    entityType: 'REPORT',
    entityId: reportId,
  });

  return mapReport(updated);
}

/** Số báo cáo đang chờ duyệt. */
export async function countPendingReports(): Promise<number> {
  return prisma.report.count({ where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } } });
}
