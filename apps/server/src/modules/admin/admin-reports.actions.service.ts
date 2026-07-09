import { prisma } from '@costy/db';
import type { AdminReportAction, AdminReportDto } from '@costy/shared';

import { writeAuditLog } from '../../lib/admin/audit.service.js';
import { AppError } from '../../lib/errors.js';
import { createNotification } from '../notifications/notifications.service.js';

import { batchResolveRelatedReports, countTargetReports } from './admin-reports.helpers.js';
import { mapReport } from './admin-reports.mapper.js';
import { invalidateStatsCache } from './admin-stats.service.js';
import { patchAdminUserStatus } from './admin-users.service.js';

/** Admin thực thi hành động kiểm duyệt — ẩn/xóa bài, warn/ban user. */
export async function executeReportAction(
  actorId: string,
  reportId: string,
  body: AdminReportAction,
): Promise<AdminReportDto> {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) throw AppError.notFound('Không tìm thấy báo cáo');

  const auditAction = body.action;
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
      notificationId: warnNotification?.id ?? null,
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
