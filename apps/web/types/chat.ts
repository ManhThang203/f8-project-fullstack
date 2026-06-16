export type MessageReactionDto = {
  id: string;
  emoji: string;
  userId: string;
};

export type ChatMediaDto = {
  id: string;
  publicUrl: string | null;
  mimeType: string;
  width: number | null;
  height: number | null;
};

export type ChatMessageDto = {
  id: string;
  roomId: string;
  senderId: string;
  type: string;
  content: string | null;
  mediaId: string | null;
  media?: ChatMediaDto | null;
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
};
