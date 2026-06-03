/**
 * Centralized mapping utility for user-friendly labels.
 * Used to translate database values (enums, keys, actions) to readable text.
 */

// Helper to format ISO date strings cleanly
export function formatDateTime(isoString?: string | null): string {
  if (!isoString) return '';
  try {
    return new Date(isoString).toLocaleString('vi-VN');
  } catch {
    return isoString;
  }
}

/**
 * Maps audit log actions to i18n translation keys.
 * Fallbacks are handled gracefully in the helper function.
 */
export const AUDIT_ACTION_KEY_MAP: Record<string, string> = {
  // Report execution actions
  DISMISS: 'auditAction.DISMISS',
  HIDE_POST: 'auditAction.HIDE_POST',
  DELETE_POST: 'auditAction.DELETE_POST',
  WARN_USER: 'auditAction.WARN_USER',
  BAN_ACCOUNT: 'auditAction.BAN_ACCOUNT',

  // Other audit log actions
  AUTO_HIDE_POST: 'auditAction.AUTO_HIDE_POST',
  REPORT_ABUSE_FLAG: 'auditAction.REPORT_ABUSE_FLAG',
  REPORT_REVIEW: 'auditAction.REPORT_REVIEW',
  MODERATOR_PROMOTE: 'auditAction.MODERATOR_PROMOTE',
  PERMISSIONS_UPDATE: 'auditAction.PERMISSIONS_UPDATE',

  // User actions
  USER_LOCK: 'auditAction.USER_LOCK',
  USER_UNLOCK: 'auditAction.USER_UNLOCK',
  USER_BAN_TEMP: 'auditAction.USER_BAN_TEMP',
  USER_BAN_PERM: 'auditAction.USER_BAN_PERM',
  USER_UNBAN: 'auditAction.USER_UNBAN',

  // Hashtag actions
  HASHTAG_FEATURE: 'auditAction.HASHTAG_FEATURE',
  HASHTAG_UNFEATURE: 'auditAction.HASHTAG_UNFEATURE',
  HASHTAG_HIDE: 'auditAction.HASHTAG_HIDE',
  HASHTAG_BLOCK: 'auditAction.HASHTAG_BLOCK',
  HASHTAG_ACTIVATE: 'auditAction.HASHTAG_ACTIVATE',
};

/**
 * Safe renderer for audit log metadata.
 * Strips out sensitive technical IDs (CUIDs, etc.) and formats relevant properties.
 * Returns an array of { label: string; value: string } for easy UI rendering.
 */
export interface MetadataItem {
  label: string;
  value: string;
}

/** Maps report/user status enums to a friendly label via i18n. */
export function formatStatusLabel(
  status: string,
  t: (key: string, fallback?: string) => string,
): string {
  return t(`reportStatus.${status}`, t(`status.${status}`, status));
}

export function renderAuditMetadata(
  metadata: Record<string, any> | null | undefined,
  t: (key: string, options?: any) => string
): MetadataItem[] {
  if (!metadata || typeof metadata !== 'object') return [];

  const items: MetadataItem[] = [];

  // 1. Target Type
  if (metadata.targetType) {
    items.push({
      label: t('metadata.targetType', 'Loại'),
      value: t(`targetType.${metadata.targetType}`, metadata.targetType),
    });
  }

  // 2. Reason
  if (metadata.reason) {
    items.push({
      label: t('metadata.reason', 'Lý do'),
      value: t(`reportReason.${metadata.reason}`, metadata.reason),
    });
  }

  // 3. Status (previousStatus / newStatus / status)
  if (metadata.previousStatus) {
    items.push({
      label: t('metadata.previousStatus', 'Trạng thái cũ'),
      value: formatStatusLabel(metadata.previousStatus, t),
    });
  }
  if (metadata.newStatus) {
    items.push({
      label: t('metadata.newStatus', 'Trạng thái mới'),
      value: formatStatusLabel(metadata.newStatus, t),
    });
  }
  if (metadata.status) {
    items.push({
      label: t('metadata.status', 'Trạng thái'),
      value: formatStatusLabel(metadata.status, t),
    });
  }

  // 4. Content previews
  if (typeof metadata.postContent === 'string') {
    items.push({
      label: t('metadata.postContent', 'Nội dung bài viết'),
      value: `"${metadata.postContent}"`,
    });
  }

  // 5. Resolution & text notes
  if (typeof metadata.resolutionNote === 'string') {
    items.push({
      label: t('metadata.resolutionNote', 'Ghi chú xử lý'),
      value: metadata.resolutionNote,
    });
  }

  // 6. Usernames (warned/banned etc.) - keep human readable usernames, hide IDs
  if (metadata.warnedUsername) {
    items.push({
      label: t('metadata.warnedUser', 'Người nhận cảnh báo'),
      value: `@${metadata.warnedUsername}`,
    });
  }
  if (metadata.bannedUsername) {
    items.push({
      label: t('metadata.bannedUser', 'Tài khoản bị cấm'),
      value: `@${metadata.bannedUsername}`,
    });
  }

  // 7. Counter metrics
  if (typeof metadata.reportCount === 'number') {
    items.push({
      label: t('metadata.reportCount', 'Số báo cáo'),
      value: String(metadata.reportCount),
    });
  }
  if (typeof metadata.warningCount === 'number') {
    items.push({
      label: t('metadata.warningCount', 'Tổng số cảnh báo'),
      value: String(metadata.warningCount),
    });
  }

  // 8. Temporary Ban Date
  if (metadata.banType === 'temporary' && metadata.bannedUntil) {
    items.push({
      label: t('metadata.banDuration', 'Thời hạn ban'),
      value: formatDateTime(metadata.bannedUntil),
    });
  } else if (metadata.banType === 'permanent') {
    items.push({
      label: t('metadata.banDuration', 'Thời hạn ban'),
      value: t('users.statusBanPerm', 'Ban vĩnh viễn'),
    });
  }

  // 9. Hashtag tag
  if (metadata.tag) {
    items.push({
      label: t('metadata.hashtag', 'Hashtag'),
      value: `#${metadata.tag}`,
    });
  }

  return items;
}
