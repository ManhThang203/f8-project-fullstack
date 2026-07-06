import type { AppealDto, ModerationCaseDto } from '@costy/shared';

/** Map bản ghi moderation case DB sang DTO admin (ISO date, ép kiểu enum). */
export function mapCase(row: {
  id: string;
  targetType: string;
  targetId: string;
  authorId: string;
  label: string;
  confidence: number;
  reason: string | null;
  status: string;
  autoHidden: boolean;
  reviewedById: string | null;
  reviewedAt: Date | null;
  resolutionNote: string | null;
  createdAt: Date;
  author?: { id: string; username: string; name: string | null; image: string | null };
  targetPreview?: string | null;
}): ModerationCaseDto {
  return {
    id: row.id,
    targetType: row.targetType as ModerationCaseDto['targetType'],
    targetId: row.targetId,
    authorId: row.authorId,
    label: row.label as ModerationCaseDto['label'],
    confidence: row.confidence,
    reason: row.reason,
    status: row.status as ModerationCaseDto['status'],
    autoHidden: row.autoHidden,
    reviewedById: row.reviewedById,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    resolutionNote: row.resolutionNote,
    createdAt: row.createdAt.toISOString(),
    author: row.author,
    targetPreview: row.targetPreview,
  };
}

/** Map bản ghi appeal DB sang DTO trả về client. */
export function mapAppeal(row: {
  id: string;
  caseId: string;
  userId: string;
  message: string;
  status: string;
  reviewedById: string | null;
  reviewedAt: Date | null;
  decisionNote: string | null;
  createdAt: Date;
}): AppealDto {
  return {
    id: row.id,
    caseId: row.caseId,
    userId: row.userId,
    message: row.message,
    status: row.status as AppealDto['status'],
    reviewedById: row.reviewedById,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    decisionNote: row.decisionNote,
    createdAt: row.createdAt.toISOString(),
  };
}
