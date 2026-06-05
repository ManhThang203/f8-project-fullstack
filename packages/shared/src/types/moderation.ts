export type ModerationLabel =
  | 'TOXIC'
  | 'SPAM'
  | 'HARASSMENT'
  | 'HATE'
  | 'SEXUAL'
  | 'VIOLENCE'
  | 'SELF_HARM'
  | 'OTHER';

export type ModerationCaseStatus =
  | 'PENDING'
  | 'AUTO_HIDDEN'
  | 'RESOLVED_KEPT'
  | 'RESOLVED_REMOVED'
  | 'DISMISSED';

export type AppealStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type ModerationTargetType = 'POST' | 'COMMENT';

export type ModerationCaseDto = {
  id: string;
  targetType: ModerationTargetType;
  targetId: string;
  authorId: string;
  label: ModerationLabel;
  confidence: number;
  reason: string | null;
  status: ModerationCaseStatus;
  autoHidden: boolean;
  reviewedById: string | null;
  reviewedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
  author?: {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
  };
  targetPreview?: string | null;
};

export type AppealDto = {
  id: string;
  caseId: string;
  userId: string;
  message: string;
  status: AppealStatus;
  reviewedById: string | null;
  reviewedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
};

export type ModerationCaseDetailDto = ModerationCaseDto & {
  targetContent: string | null;
  scores: Record<string, unknown> | null;
  appeal: AppealDto | null;
};

export type MyModerationCaseDto = {
  id: string;
  targetType: ModerationTargetType;
  targetId: string;
  label: ModerationLabel;
  confidence: number;
  reason: string | null;
  status: ModerationCaseStatus;
  autoHidden: boolean;
  resolutionNote: string | null;
  createdAt: string;
  targetContent: string | null;
  appeal: AppealDto | null;
};
