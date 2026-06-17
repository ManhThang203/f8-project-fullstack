/** Trạng thái quan hệ bạn bè giữa viewer và một user khác. */
export type FriendStatus =
  | 'none'
  | 'self'
  | 'friends'
  | 'request_sent'
  | 'request_received';

/** Kết quả thao tác kết bạn (chỉ trả status). */
export interface FriendStateDto {
  status: FriendStatus;
}

/** User trong danh sách bạn bè / lời mời. */
export interface FriendUserDto {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  createdAt: string;
  friendStatus: FriendStatus;
}
