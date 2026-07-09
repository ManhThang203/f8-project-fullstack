import { prisma, type ReportReason, type ReportTargetType } from '@costy/db';

import { REPORT_CONFIG } from '../../config/report.config.js';
import { writeAuditLog } from '../../lib/admin/audit.service.js';

/** Đếm số reports trên một target (dùng cho priority queue). */
export async function countTargetReports(
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
 * Kiểm tra anti-abuse: reporter có quá nhiều reports bị DISMISSED trong ngày?
 * Nếu vượt ngưỡng → ghi audit log cảnh báo (vẫn cho tạo report).
 */
export async function runAntiAbuseCheck(reporterId: string): Promise<void> {
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
 * Batch-resolve tất cả reports đang mở trên cùng target
 * sau khi admin đã xử lý xong (giống Facebook — tránh xử lý lại).
 */
export async function batchResolveRelatedReports(
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
      status: { in: ['PENDING', 'UNDER_REVIEW', 'AUTO_HIDDEN'] },
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
