'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';

import { ChatComposer } from './chat-composer';
import { ChatMessageItem } from './chat-message-item';
import { ConversationList, peerLabel } from './conversation-list';
import { NewChatModal } from './new-chat-modal';
import { useChatRoomSocket } from './use-chat-room-socket';

import { ConfirmDialog } from '@/components/shared/ui';
import {
  EMPTY_CONVERSATIONS,
  EMPTY_ROOM_MESSAGES,
  useChatConversations,
  useRoomMessages,
  useCreateChatRoomMutation,
} from '@/hooks/queries/chat';
import { useTick } from '@/hooks/ui';
import { authClient } from '@/lib/auth';
import { formatActivityStatus } from '@/lib/format';
import { patchConversationAfterMessage, patchMessageReaction, patchMessageUnsent, queryKeys } from '@/lib/query';
import { getChatSocket } from '@/lib/socket';
import { cn } from '@/lib/utils';
import type { ChatMessageDto, ChatPeerDto } from '@/types/chat';

type SendInput = {
  content?: string;
  type: 'text' | 'sticker' | 'media';
  mediaId?: string;
};

type PendingMessageAction = {
  type: 'unsend' | 'delete';
  messageId: string;
};

export function MessagesView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const roomId = searchParams.get('roomId');

  const { data: session } = authClient.useSession();
  const meId = session?.user?.id ?? null;

  const { data: conversationsData, isLoading: convLoading } = useChatConversations(Boolean(meId));
  const conversations = conversationsData ?? EMPTY_CONVERSATIONS;

  const { data: roomData, isLoading: roomLoading } = useRoomMessages(roomId, Boolean(meId));
  const messages = roomData ?? EMPTY_ROOM_MESSAGES;

  const [replyingTo, setReplyingTo] = useState<ChatMessageDto | null>(null);
  const [sending, setSending] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [pulsingId, setPulsingId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingMessageAction | null>(null);

  const { chatSocket, typingUserIds } = useChatRoomSocket(meId, roomId);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const createRoomMutation = useCreateChatRoomMutation();

  const activeConv = useMemo(
    () => conversations.find((c) => c.id === roomId),
    [conversations, roomId],
  );

  const title = useMemo(() => {
    if (!activeConv) return 'Tin nhắn';
    if (activeConv.isGroup) return activeConv.name || 'Nhóm';
    return activeConv.peers[0] ? peerLabel(activeConv.peers[0]) : 'Tin nhắn';
  }, [activeConv]);

  useTick(60_000);

  const activityStatus = useMemo(() => {
    if (!activeConv || activeConv.isGroup) return null;
    return formatActivityStatus(activeConv.peers[0]);
  }, [activeConv]);

  const typingLabel = useMemo(() => {
    if (typingUserIds.length === 0 || !activeConv) return null;
    if (!activeConv.isGroup) return 'Đang gõ…';
    const names = typingUserIds
      .map((id) => activeConv.peers.find((p) => p.id === id))
      .filter((p): p is ChatPeerDto => Boolean(p))
      .map((p) => p.name || p.username);
    if (names.length === 0) return 'Đang gõ…';
    return `${names.join(', ')} đang gõ…`;
  }, [typingUserIds, activeConv]);

  // Cuộn xuống tin nhắn mới nhất sau khi gửi
  function scrollToBottom() {
    setTimeout(
      () =>
        virtuosoRef.current?.scrollToIndex({ index: 999999, align: 'end', behavior: 'smooth' }),
      50,
    );
  }

  /** Emit `chat:send` qua socket, append message vào cache khi server ack thành công. */
  async function sendMessage(input: SendInput) {
    if (!roomId || !meId) return;
    const s = await getChatSocket();
    await new Promise<void>((resolve, reject) => {
      s.emit(
        'chat:send',
        { roomId, ...input, replyToId: replyingTo?.id },
        (ack: { ok?: boolean; message?: ChatMessageDto; error?: string }) => {
          if (ack?.ok && ack.message) {
            queryClient.setQueryData<ChatMessageDto[]>(
              queryKeys.chat.roomMessages(roomId),
              (prev) => {
                const list = prev ?? [];
                if (list.some((m) => m.id === ack.message!.id)) return list;
                return [...list, ack.message!];
              },
            );
            setReplyingTo(null);
            patchConversationAfterMessage(queryClient, roomId, ack.message, {
              viewingRoom: true,
              incrementUnread: false,
            });
            scrollToBottom();
            resolve();
          } else {
            reject(new Error(ack?.error || 'Send failed'));
          }
        },
      );
    });
  }

  /** Gửi tin nhắn văn bản. */
  async function handleSendText(text: string) {
    if (sending) return;
    setSending(true);
    try {
      await sendMessage({ content: text, type: 'text' });
    } finally {
      setSending(false);
    }
  }

  /** Gửi sticker (content = stickerId). */
  async function handleSendSticker(stickerId: string) {
    if (sending) return;
    setSending(true);
    try {
      await sendMessage({ content: stickerId, type: 'sticker' });
    } catch {
      alert('Không thể gửi nhãn dán.');
    } finally {
      setSending(false);
    }
  }

  /** Upload file gốc lên server rồi gửi tin nhắn media kèm mediaId. */
  async function handleSendFile(file: File) {
    if (sending || !roomId) return;
    setSending(true);
    try {
      const formData = new FormData();
      formData.append('files', file);

      const res = await fetch('/api/v1/media/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error?.message || data.message || 'Upload failed');
      }

      const mediaRecords = data.data as { mediaId: string; url: string }[];
      if (!mediaRecords?.[0]) {
        throw new Error('Upload returned empty media records');
      }

      await sendMessage({ type: 'media', mediaId: mediaRecords[0].mediaId });
    } catch (err) {
      console.error('Lỗi gửi media:', err);
      alert('Không thể gửi tệp đính kèm.');
    } finally {
      setSending(false);
    }
  }

  /** Thu hồi tin nhắn đã gửi qua socket và cập nhật cache. */
  function runUnsend(messageId: string) {
    if (!roomId) return;
    chatSocket?.emit(
      'chat:unsend',
      { messageId },
      (ack: { ok?: boolean }) => {
        if (ack?.ok) {
          patchMessageUnsent(queryClient, roomId, messageId);
        }
      },
    );
  }

  /** Xoá tin nhắn chỉ phía mình qua socket và loại khỏi cache. */
  function runDelete(messageId: string) {
    if (!roomId) return;
    chatSocket?.emit(
      'chat:delete',
      { messageId },
      (ack: { ok?: boolean }) => {
        if (ack?.ok) {
          queryClient.setQueryData<ChatMessageDto[]>(
            queryKeys.chat.roomMessages(roomId),
            (prev) => prev?.filter((msg) => msg.id !== messageId) ?? prev,
          );
        }
      },
    );
  }

  /** Xác nhận hành động thu hồi/xoá tin nhắn từ modal. */
  function confirmPendingAction() {
    if (!pendingAction) return;
    if (pendingAction.type === 'unsend') {
      runUnsend(pendingAction.messageId);
    } else {
      runDelete(pendingAction.messageId);
    }
    setPendingAction(null);
  }

  /** Tạo chat 1-1 hoặc nhóm từ modal; chat 1-1 đã có thì mở lại phòng cũ. */
  const handleCreateChat = async (params: {
    memberUserIds: string[];
    isGroup: boolean;
    name?: string;
  }) => {
    if (!params.isGroup) {
      const peerId = params.memberUserIds[0];
      const existing = conversations.find(
        (c) => !c.isGroup && c.peers.some((p: ChatPeerDto) => p.id === peerId),
      );
      if (existing) {
        router.replace(`/messages?roomId=${existing.id}`);
        return;
      }
    }

    try {
      const room = await createRoomMutation.mutateAsync({
        isGroup: params.isGroup,
        name: params.name,
        memberUserIds: params.memberUserIds,
      });
      router.replace(`/messages?roomId=${room.id}`);
    } catch (err) {
      console.error('Lỗi tạo phòng:', err);
      alert(err instanceof Error ? err.message : 'Tạo phòng thất bại');
    }
  };

  if (!meId) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <p className="text-muted-foreground">Đăng nhập để xem tin nhắn.</p>
        <Link
          href="/login?next=/messages"
          className="bg-primary text-primary-foreground focus-visible:ring-ring mt-4 inline-flex min-h-11 items-center justify-center rounded-full px-6 text-sm font-semibold focus-visible:outline-hidden focus-visible:ring-2"
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  const replyAuthorName = replyingTo
    ? replyingTo.senderId === meId
      ? 'chính bạn'
      : activeConv?.peers.find((p) => p.id === replyingTo.senderId)?.name || 'người dùng'
    : null;

  /** Emit sự kiện đang gõ tới phòng hiện tại (throttle đã xử lý ở composer). */
  function handleTyping() {
    if (!roomId || !chatSocket) return;
    chatSocket.emit('chat:typing', { roomId });
  }

  return (
    <>
      <div className="lg:border-border mx-auto flex h-full w-full max-w-7xl flex-col gap-0 overflow-hidden lg:flex-row lg:border-x">
        <ConversationList
          conversations={conversations}
          loading={convLoading}
          activeRoomId={roomId}
          onSelect={(id) => router.replace(`/messages?roomId=${id}`)}
          onNewChat={() => setNewChatOpen(true)}
        />

        <section
          className={cn(
            'bg-background min-w-0 flex-1 flex-col overflow-hidden',
            roomId ? 'flex' : 'hidden lg:flex',
          )}
        >
          <div className="border-border min-w-0 shrink-0 border-b px-4 py-3">
            <h2 className="text-foreground text-sm font-semibold">{title}</h2>
            {activityStatus ? (
              <p className="text-muted-foreground mt-0.5 text-xs">{activityStatus}</p>
            ) : null}
            {!roomId ? (
              <p className="text-muted-foreground mt-1 text-xs">
                Chọn một hội thoại hoặc tạo tin nhắn mới.
              </p>
            ) : null}
          </div>

          <div className="flex flex-1 flex-col overflow-hidden">
            {roomLoading ? (
              <div className="text-muted-foreground flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
              </div>
            ) : messages.length === 0 && roomId ? (
              <p className="text-muted-foreground flex-1 p-4 text-center text-sm">
                Chưa có tin nhắn. Gửi lời chào!
              </p>
            ) : roomId ? (
              <div className="relative min-w-0 flex-1 overflow-hidden">
                <Virtuoso
                  ref={virtuosoRef}
                  className="h-full w-full overflow-x-hidden scroll-smooth pl-4 pr-6 lg:pr-8"
                  data={messages}
                  initialTopMostItemIndex={messages.length - 1}
                  followOutput="auto"
                  alignToBottom
                  itemContent={(index, m) => {
                    const sender = activeConv?.peers.find((p) => p.id === m.senderId);

                    const isRead = activeConv?.peers.some(
                      (p) => p.lastReadAt && new Date(p.lastReadAt) >= new Date(m.createdAt),
                    );
                    const isDelivered = activeConv?.peers.some(
                      (p) =>
                        p.lastDeliveredAt && new Date(p.lastDeliveredAt) >= new Date(m.createdAt),
                    );
                    const status = isRead ? 'read' : isDelivered ? 'delivered' : 'sent';

                    return (
                      <ChatMessageItem
                        key={m.id}
                        message={m}
                        isMine={m.senderId === meId}
                        senderInfo={sender}
                        readStatus={status}
                        isPulsing={m.id === pulsingId}
                        onScrollToMessage={(msgId) => {
                          const idx = messages.findIndex((msg) => msg.id === msgId);
                          if (idx !== -1) {
                            virtuosoRef.current?.scrollToIndex({
                              index: idx,
                              align: 'center',
                              behavior: 'smooth',
                            });
                            setPulsingId(msgId);
                            setTimeout(() => setPulsingId(null), 2000);
                          }
                        }}
                        onReply={() => setReplyingTo(m)}
                        onReact={(emoji) => {
                          chatSocket?.emit(
                            'chat:react',
                            { messageId: m.id, emoji },
                            (ack: { ok?: boolean; reaction?: { id: string; emoji: string; userId: string } }) => {
                              if (ack?.ok && ack.reaction && roomId) {
                                patchMessageReaction(queryClient, roomId, m.id, ack.reaction);
                              }
                            },
                          );
                        }}
                        onUnsend={() =>
                          setPendingAction({ type: 'unsend', messageId: m.id })
                        }
                        onDelete={() =>
                          setPendingAction({ type: 'delete', messageId: m.id })
                        }
                      />
                    );
                  }}
                />
              </div>
            ) : (
              <div className="flex-1" />
            )}

            {roomId ? (
              <>
                {typingLabel ? (
                  <p
                    className="text-muted-foreground px-4 py-1 text-xs"
                    aria-live="polite"
                  >
                    {typingLabel}
                  </p>
                ) : null}
                <ChatComposer
                  sending={sending}
                  replyingTo={replyingTo}
                  replyAuthorName={replyAuthorName}
                  onCancelReply={() => setReplyingTo(null)}
                  onSendText={handleSendText}
                  onSendSticker={handleSendSticker}
                  onSendFile={handleSendFile}
                  onTyping={handleTyping}
                />
              </>
            ) : null}
          </div>
        </section>
      </div>

      <NewChatModal
        open={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onCreate={(params) => void handleCreateChat(params)}
      />

      <ConfirmDialog
        open={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        onConfirm={confirmPendingAction}
        title={pendingAction?.type === 'unsend' ? 'Thu hồi tin nhắn' : 'Xoá tin nhắn'}
        description={
          pendingAction?.type === 'unsend'
            ? 'Bạn có chắc muốn thu hồi tin nhắn này? Tin nhắn sẽ bị thu hồi với mọi người.'
            : 'Bạn có chắc muốn xoá tin nhắn này? Tin nhắn chỉ bị xoá ở phía bạn.'
        }
        confirmLabel={pendingAction?.type === 'unsend' ? 'Thu hồi' : 'Xoá'}
        cancelLabel="Huỷ"
        destructive
      />
    </>
  );
}
