import { prisma } from '@costy/db';
import type {
  AppealDto,
  AppealReviewBody,
  AppealSubmitBody,
  ModerationCaseDetailDto,
} from '@costy/shared';

import { writeAuditLog } from '../../lib/admin/audit.service.js';
import { AppError } from '../../lib/errors.js';
import { createNotification } from '../notifications/notifications.service.js';

import { getModerationCase } from './moderation.helpers.js';
import { mapAppeal } from './moderation.mapper.js';

/** User gửi kháng nghị cho case kiểm duyệt. */
export async function submitAppeal(
  userId: string,
  caseId: string,
  body: AppealSubmitBody,
): Promise<AppealDto> {
  const row = await prisma.moderationCase.findUnique({
    where: { id: caseId },
    include: { appeal: true },
  });
  if (!row || row.authorId !== userId) {
    throw AppError.notFound('Không tìm thấy thông tin kiểm duyệt');
  }
  if (row.appeal) {
    throw AppError.conflict('Bạn đã gửi kháng nghị cho case này');
  }
  if (!['PENDING', 'AUTO_HIDDEN', 'RESOLVED_KEPT', 'RESOLVED_REMOVED'].includes(row.status)) {
    throw AppError.badRequest('Case này chưa thể kháng nghị');
  }

  const appeal = await prisma.appeal.create({
    data: {
      caseId,
      userId,
      message: body.message,
    },
  });

  return mapAppeal(appeal);
}

/** Admin duyệt hoặc từ chối kháng nghị. */
export async function reviewAppeal(
  adminId: string,
  caseId: string,
  body: AppealReviewBody,
): Promise<ModerationCaseDetailDto> {
  const row = await prisma.moderationCase.findUnique({
    where: { id: caseId },
    include: { appeal: true },
  });
  if (!row) throw AppError.notFound('Không tìm thấy case kiểm duyệt');
  if (!row.appeal || row.appeal.status !== 'PENDING') {
    throw AppError.badRequest('Không có kháng nghị đang chờ duyệt');
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.appeal.update({
      where: { id: row.appeal!.id },
      data: {
        status: body.decision,
        reviewedById: adminId,
        reviewedAt: now,
        decisionNote: body.decisionNote,
      },
    });

    if (body.decision === 'APPROVED') {
      await tx.post.update({
        where: { id: row.targetId },
        data: { hiddenAt: null, deletedAt: null },
      });
      await tx.moderationCase.update({
        where: { id: caseId },
        data: {
          status: 'DISMISSED',
          reviewedById: adminId,
          reviewedAt: now,
          resolutionNote: body.decisionNote,
        },
      });
    }
  });

  await writeAuditLog({
    actorId: adminId,
    action: `APPEAL_${body.decision}`,
    targetType: 'MODERATION_CASE',
    targetId: caseId,
    metadata: { decisionNote: body.decisionNote },
  });

  await createNotification({
    recipientId: row.authorId,
    actorId: null,
    type: body.decision === 'APPROVED' ? 'APPEAL_APPROVED' : 'APPEAL_REJECTED',
    entityType: 'MODERATION',
    entityId: caseId,
  });

  return getModerationCase(caseId);
}
