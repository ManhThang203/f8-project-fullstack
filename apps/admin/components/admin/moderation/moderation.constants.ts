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

export type ModerationStatusFilter =
  | 'OPEN'
  | 'PENDING'
  | 'AUTO_HIDDEN'
  | 'RESOLVED_KEPT'
  | 'RESOLVED_REMOVED'
  | 'DISMISSED'
  | '';

export const ALL_MODERATION_STATUSES: ModerationStatusFilter[] = [
  'OPEN',
  'PENDING',
  'AUTO_HIDDEN',
  'RESOLVED_KEPT',
  'RESOLVED_REMOVED',
  'DISMISSED',
];

export const LABEL_COLORS: Record<ModerationLabel, string> = {
  TOXIC: 'bg-red-500/10 text-red-600 border-red-500/20',
  SPAM: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  HARASSMENT: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  HATE: 'bg-red-600/10 text-red-700 border-red-600/20',
  SEXUAL: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  VIOLENCE: 'bg-red-500/10 text-red-700 border-red-500/20',
  SELF_HARM: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  OTHER: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20',
};

export const STATUS_COLORS: Record<ModerationCaseStatus, string> = {
  PENDING: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
  AUTO_HIDDEN: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
  RESOLVED_KEPT: 'bg-green-500/10 text-green-700 border-green-500/20',
  RESOLVED_REMOVED: 'bg-red-500/10 text-red-700 border-red-500/20',
  DISMISSED: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20',
};

export function isActionableModerationStatus(status: string): boolean {
  return status === 'PENDING' || status === 'AUTO_HIDDEN';
}

/** Badge mức confidence: cao / trung bình / thấp. */
export function confidenceTier(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 0.9) return 'high';
  if (confidence >= 0.6) return 'medium';
  return 'low';
}

export const CONFIDENCE_COLORS = {
  high: 'bg-red-500/10 text-red-700 border-red-500/20',
  medium: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  low: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20',
} as const;
