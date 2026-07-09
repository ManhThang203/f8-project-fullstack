import type { AdminReportDto } from '@costy/shared';

export type ReportRow = {
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
};

/** Map bản ghi report DB sang DTO trả về admin (ISO date, ép kiểu enum). */
export function mapReport(r: ReportRow): AdminReportDto {
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
