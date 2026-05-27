export type NotificationType = 'POST_LIKED' | 'POST_REPLIED' | 'POST_COMMENTED_FOLLOWED' | 'USER_FOLLOWED' | 'MENTION' | 'SYSTEM';

export interface NotificationDto {
  id: string;
  recipientId: string;
  actorId: string | null;
  type: NotificationType;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
  actor?: {
    id: string;
    name: string | null;
    username: string;
    image: string | null;
  } | null;
}
