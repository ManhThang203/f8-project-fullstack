export type DockState = { slots: [string | null, string | null]; queue: string[] };

export type DockAction = { type: string; threadKey?: string | null };

export type MsgRow =
  | {
      id: number;
      senderId: string;
      recipientId: string;
      body: string;
      createdAt: string;
    }
  | {
      id: number;
      groupId: number;
      senderId: string;
      body: string;
      createdAt: string;
    };

export type ChatPeerDto = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
};

export type Conversation =
  | {
      kind: 'direct';
      peerUserId: string;
      peer: ChatPeerDto;
      lastMessage: {
        id: number;
        senderId: string;
        recipientId: string;
        body: string;
        createdAt: string;
      };
      unreadCount: number;
    }
  | {
      kind: 'group';
      groupId: number;
      name: string;
      lastMessage: {
        id: number;
        groupId: number;
        senderId: string;
        body: string;
        createdAt: string;
      } | null;
      unreadCount: number;
    };

export type ChatDockContextValue = {
  dock: DockState;
  messagesByThread: Record<string, MsgRow[]>;
  pickerOpen: boolean;
  setPickerOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  groupModalOpen: boolean;
  setGroupModalOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  hubOpen: boolean;
  setHubOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  toggleHub: () => void;
  conversations: Conversation[];
  refetchConversations: () => Promise<void>;
  unreadChatTotal: number;
  threadPaging: Record<string, { hasMoreOlder: boolean }>;
  loadingOlderThread: Record<string, boolean>;
  loadOlderMessages: (threadKey: string) => Promise<void>;
  typingUsersByThread: Record<string, Set<string>>;
  emitTypingDebounced: (threadKey: string) => void;
  openThread: (threadKey: string) => void;
  openDirectChat: (peerId: string) => void;
  openGroupChat: (groupId: number) => void;
  closeChat: (threadKey: string) => void;
  minimizeChat: (threadKey: string) => void;
  promoteFromQueue: (threadKey: string) => void;
  sendText: (threadKey: string, text: string) => Promise<void>;
  loadHistory: (threadKey: string) => Promise<void>;
  createGroup: (input: { name: string; memberUserIds: string[] }) => Promise<{ id: number }>;
  subscribeGroupSocket: (groupId: number) => void;
  registerChatUsers: (users: ChatPeerDto[]) => void;
  getChatUser: (id: string) => ChatPeerDto | undefined;
  /** Tăng khi `registerChatUsers` chạy — chỉ để subscriber biết cache user đổi (có thể bỏ qua). */
  userDirectoryVersion: number;
};
