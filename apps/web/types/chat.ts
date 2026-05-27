export type MessageReactionDto = {
  id: string;
  emoji: string;
  userId: string;
};

export type ChatMessageDto = {
  id: string;
  roomId: string;
  senderId: string;
  type: string;
  encryptedPayload: string;
  mediaId: string | null;
  replyToId: string | null;
  replyToMessage?: ChatMessageDto | null;
  createdAt: string;
  isUnsent: boolean;
  deletedFor: string[];
  reactions: MessageReactionDto[];
};

export type ChatPeerDto = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  lastReadAt?: string | null;
  lastDeliveredAt?: string | null;
};

export type Conversation = {
  id: string;
  isGroup: boolean;
  name: string | null;
  peers: ChatPeerDto[];
  lastMessage: ChatMessageDto | null;
  unreadCount: number;
  updatedAt: string;
  encryptedRoomKey: string | null;
};
