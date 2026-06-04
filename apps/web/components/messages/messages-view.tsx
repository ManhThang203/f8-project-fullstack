'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Send, Users, X, ImagePlus, Paperclip, Smile } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';

import {
  EMPTY_CONVERSATIONS,
  EMPTY_ROOM_MESSAGES,
  useChatConversations,
  useRoomMessages,
  useInvalidateChatConversations,
  useCreateChatRoomMutation,
} from '@/hooks/queries/use-chat-queries';
import {
  EMPTY_USER_SEARCH,
  useUsersSearch,
} from '@/hooks/queries/use-users-search';
import { useDebounced } from '@/hooks/use-debounced';
import { authClient } from '@/lib/auth-client';
import { getChatSocket } from '@/lib/chat-socket';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';
import { ChatMessageItem } from './chat-message-item';
import { EmojiStickerPicker } from './emoji-sticker-picker';
import { decryptRoomKeyWithRSA, encryptPayloadWithAES, decryptPayloadWithAES } from '@/lib/e2ee/crypto-utils';
import { getPrivateKey, getCachedRoomKey, setCachedRoomKey } from '@/lib/e2ee/key-storage';
import type { ChatMessageDto, ChatPeerDto, Conversation } from '@/types/chat';

function peerLabel(p: ChatPeerDto) {
  return p.name?.trim() || `@${p.username}`;
}

function NewChatModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (userId: string) => void;
}) {
  const { data: session } = authClient.useSession();
  const meId = session?.user?.id;
  const [q, setQ] = useState('');
  const debouncedQ = useDebounced(q, 300);

  const { data: usersData, isLoading: loading } = useUsersSearch(debouncedQ, {
    enabled: open,
    excludeUserId: meId,
  });
  const users = usersData ?? EMPTY_USER_SEARCH;

  useEffect(() => {
    if (!open) setQ('');
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/40 p-4 pt-24 backdrop-blur-sm supports-[backdrop-filter]:bg-black/30 sm:pt-28"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="border-border bg-card max-h-[min(70dvh,32rem)] w-full max-w-md overflow-hidden rounded-2xl border shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-chat-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-border flex items-center justify-between border-b px-4 py-3">
          <h2 id="new-chat-title" className="text-foreground text-sm font-semibold">
            Tin nhắn mới
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:bg-muted focus-visible:ring-ring flex min-h-11 min-w-11 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="border-border border-b px-3 py-2">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên hoặc @username…"
            className="border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring h-10 w-full rounded-lg border px-3 text-sm focus-visible:outline-none focus-visible:ring-2"
            autoFocus
          />
        </div>
        <ul className="max-h-[min(50dvh,24rem)] overflow-y-auto p-2">
          {loading ? (
            <li className="text-muted-foreground flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
            </li>
          ) : users.length === 0 ? (
            <li className="text-muted-foreground px-3 py-6 text-center text-sm">
              Không có người dùng phù hợp.
            </li>
          ) : (
            users.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  className="hover:bg-muted focus-visible:ring-ring flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2"
                  onClick={() => {
                    onPick(u.id);
                    onClose();
                  }}
                >
                  <div className="bg-muted text-foreground flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold">
                    {(u.name?.[0] || u.username[0] || '?').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-foreground truncate font-medium">{peerLabel(u)}</p>
                    <p className="text-muted-foreground truncate text-xs">@{u.username}</p>
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

function DecryptedLastMessage({ conversation, privateKey }: { conversation: Conversation; privateKey: CryptoKey | null }) {
  const [text, setText] = useState<string>('Tin nhắn E2EE...');
  
  useEffect(() => {
    if (!conversation.lastMessage || !conversation.encryptedRoomKey || !privateKey) return;
    let cancelled = false;

    const cachedRoomKey = getCachedRoomKey(conversation.id);
    const getRoomKey = cachedRoomKey 
      ? Promise.resolve(cachedRoomKey) 
      : decryptRoomKeyWithRSA(conversation.encryptedRoomKey, privateKey).then(k => { setCachedRoomKey(conversation.id, k); return k; });

    getRoomKey.then(roomKey => {
      if (cancelled) return;
      return decryptPayloadWithAES(conversation.lastMessage!.encryptedPayload, roomKey);
    }).then(str => {
      if (cancelled || !str) return;
      try {
        const parsed = JSON.parse(str);
        if (parsed.text) setText(parsed.text);
        else if (parsed.mediaId) setText('[Hình ảnh/Tệp đính kèm]');
        else if (parsed.stickerId) setText('[Nhãn dán]');
        else setText('Tin nhắn');
      } catch {
        setText(str);
      }
    }).catch(err => {
      if (!cancelled) setText('Không thể giải mã');
    });

    return () => { cancelled = true; };
  }, [conversation.lastMessage, conversation.encryptedRoomKey, privateKey]);

  return <>{text}</>;
}

export function MessagesView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const invalidateConversations = useInvalidateChatConversations();
  const searchParams = useSearchParams();
  const roomId = searchParams.get('roomId');

  const { data: session } = authClient.useSession();
  const meId = session?.user?.id ?? null;

  const { data: conversationsData, isLoading: convLoading } = useChatConversations(Boolean(meId));
  const conversations = conversationsData ?? EMPTY_CONVERSATIONS;

  const { data: roomData, isLoading: roomLoading } = useRoomMessages(roomId, Boolean(meId));
  const messages = roomData ?? EMPTY_ROOM_MESSAGES;

  const [draft, setDraft] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessageDto | null>(null);
  const [sending, setSending] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [chatSocket, setChatSocket] = useState<Socket | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pulsingId, setPulsingId] = useState<string | null>(null);

  // E2EE Keys
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [roomKey, setRoomKey] = useState<CryptoKey | null>(null);

  useEffect(() => {
    if (!meId) return;
    
    let cancelled = false;
    import('@/lib/e2ee/key-storage').then(({ initializeUserKeys }) => {
      return initializeUserKeys();
    }).then(async (keys) => {
      if (cancelled) return;
      setPrivateKey(keys.privateKey);
      
      // We must make sure the server has our public key. Let's export it and upload it just in case.
      // (This should ideally be done only once or checked via another endpoint, but it's idempotent)
      const { exportKeyToBase64 } = await import('@/lib/e2ee/crypto-utils');
      const publicKeyBase64 = await exportKeyToBase64(keys.publicKey);
      
      fetch('/api/v1/chat/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: publicKeyBase64 })
      }).catch(err => console.error('Lỗi upload public key:', err));
    }).catch(err => console.error('Lỗi khởi tạo E2EE keys:', err));

    return () => { cancelled = true; };
  }, [meId]);

  const activeConv = useMemo(() => conversations.find(c => c.id === roomId), [conversations, roomId]);

  useEffect(() => {
    if (!activeConv?.encryptedRoomKey || !privateKey) {
      setRoomKey(null);
      return;
    }
    const cached = getCachedRoomKey(activeConv.id);
    if (cached) {
      setRoomKey(cached);
      return;
    }
    decryptRoomKeyWithRSA(activeConv.encryptedRoomKey, privateKey)
      .then((k) => {
        setCachedRoomKey(activeConv.id, k);
        setRoomKey(k);
      })
      .catch((err) => console.error('Lỗi giải mã khóa phòng:', err));
  }, [activeConv?.encryptedRoomKey, activeConv?.id, privateKey]);

  useEffect(() => {
    if (!meId) {
      setChatSocket(null);
      return;
    }
    let cancelled = false;
    void getChatSocket()
      .then((s) => {
        if (!cancelled) setChatSocket(s);
      })
      .catch(() => {
        if (!cancelled) setChatSocket(null);
      });
    return () => {
      cancelled = true;
    };
  }, [meId]);

  useEffect(() => {
    if (!chatSocket || !meId) return;

    const onMessage = (payload: ChatMessageDto) => {
      if (roomId === payload.roomId) {
        queryClient.setQueryData<ChatMessageDto[]>(
          queryKeys.chat.roomMessages(payload.roomId),
          (prev) => {
            if (!prev) return prev;
            if (prev.some((m) => m.id === payload.id)) return prev;
            return [...prev, payload];
          },
        );
        // Automatically emit delivered when message arrives and we are in the room
        chatSocket.emit('chat:delivered', { roomId: payload.roomId });
      }
      invalidateConversations();
    };

    const invalidateRoom = (payload: { roomId: string }) => {
      if (roomId === payload.roomId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.chat.roomMessages(payload.roomId) });
      }
      invalidateConversations();
    };

    chatSocket.on('chat:message', onMessage);
    chatSocket.on('chat:reaction', (p) => { if (roomId) queryClient.invalidateQueries({ queryKey: queryKeys.chat.roomMessages(roomId) }); });
    chatSocket.on('chat:unsent', invalidateRoom);
    chatSocket.on('chat:deleted', invalidateRoom);
    chatSocket.on('chat:delivered', invalidateRoom);
    chatSocket.on('chat:read', invalidateRoom);

    return () => {
      chatSocket.off('chat:message', onMessage);
      chatSocket.off('chat:reaction');
      chatSocket.off('chat:unsent');
      chatSocket.off('chat:deleted');
      chatSocket.off('chat:delivered');
      chatSocket.off('chat:read');
    };
  }, [chatSocket, meId, roomId, invalidateConversations, queryClient]);

  // Mark room as read when opened
  useEffect(() => {
    if (chatSocket && roomId) {
      chatSocket.emit('chat:read', { roomId });
      invalidateConversations();
    }
  }, [chatSocket, roomId, invalidateConversations]);

  const title = useMemo(() => {
    if (!activeConv) return 'Tin nhắn';
    if (activeConv.isGroup) return activeConv.name || `Nhóm`;
    return activeConv.peers[0] ? peerLabel(activeConv.peers[0]) : 'Tin nhắn';
  }, [activeConv]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>, mode: 'image' | 'file') {
    const file = e.target.files?.[0];
    if (!file || !roomId || !roomKey || !meId || sending) return;

    setSending(true);
    try {
      let width, height, blurDataUrl;
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');

      if (isImage || isVideo) {
        const { processImageForEncryption } = await import('@/lib/e2ee/media-processor');
        const res = await processImageForEncryption(file);
        width = res.width;
        height = res.height;
        blurDataUrl = res.blurDataUrl;
      }

      const buffer = await file.arrayBuffer();
      const { encryptBufferWithAES } = await import('@/lib/e2ee/crypto-utils');
      const { iv, ciphertext } = await encryptBufferWithAES(buffer, roomKey);

      // Create blob from encrypted array buffer and upload
      const encryptedFile = new File([ciphertext], file.name || 'media.bin', {
        type: 'application/octet-stream',
      });
      const formData = new FormData();
      formData.append('files', encryptedFile);

      const res = await fetch('/api/v1/media/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      console.log('Upload response:', res.status, data);
      if (!res.ok || (data.success === false)) {
        throw new Error(data.error?.message || data.message || 'Upload failed');
      }
      
      const mediaRecords = data.data as { mediaId: string; url: string; expiresAt: string }[];
      if (!mediaRecords || mediaRecords.length === 0 || !mediaRecords[0]) {
        throw new Error('Upload returned empty media records');
      }
      const mediaId = mediaRecords[0].mediaId;
      const mediaUrl = mediaRecords[0].url;

      const s = await getChatSocket();
      const payloadStr = JSON.stringify({ 
        mediaId, 
        mediaUrl, // we store the VPS URL in the payload
        width, 
        height, 
        blurDataUrl, 
        iv,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream'
      });
      const encryptedPayload = await encryptPayloadWithAES(payloadStr, roomKey);

      await new Promise<void>((resolve, reject) => {
        s.emit(
          'chat:send',
          { roomId, encryptedPayload, type: 'media', mediaId, replyToId: replyingTo?.id },
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
              invalidateConversations();
              setReplyingTo(null);
              setTimeout(() => virtuosoRef.current?.scrollToIndex({ index: 999999, align: 'end', behavior: 'smooth' }), 50);
              resolve();
            } else {
              reject(new Error(ack?.error || 'Send failed'));
            }
          },
        );
      });
    } catch (err) {
      console.error('Lỗi gửi media:', err);
      alert('Không thể gửi tệp đính kèm.');
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  }

  async function onSend() {
    const text = draft.trim();
    if (!text || !meId || sending || !roomId || !roomKey) return;
    setSending(true);

    try {
      const s = await getChatSocket();
      const payloadStr = JSON.stringify({ text });
      const encryptedPayload = await encryptPayloadWithAES(payloadStr, roomKey);

      await new Promise<void>((resolve, reject) => {
        s.emit(
          'chat:send',
          { roomId, encryptedPayload, type: 'text', replyToId: replyingTo?.id },
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
              setDraft('');
              setReplyingTo(null);
              invalidateConversations();
              setTimeout(() => virtuosoRef.current?.scrollToIndex({ index: 999999, align: 'end', behavior: 'smooth' }), 50);
              resolve();
            } else {
              reject(new Error(ack?.error || 'Send failed'));
            }
          },
        );
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  async function onSendSticker(stickerId: string) {
    if (!meId || sending || !roomId || !roomKey) return;
    setSending(true);

    try {
      const s = await getChatSocket();
      const payloadStr = JSON.stringify({ stickerId });
      const encryptedPayload = await encryptPayloadWithAES(payloadStr, roomKey);

      await new Promise<void>((resolve, reject) => {
        s.emit(
          'chat:send',
          { roomId, encryptedPayload, type: 'sticker', replyToId: replyingTo?.id },
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
              invalidateConversations();
              setReplyingTo(null);
              setTimeout(() => virtuosoRef.current?.scrollToIndex({ index: 999999, align: 'end', behavior: 'smooth' }), 50);
              resolve();
            } else {
              reject(new Error(ack?.error || 'Send failed'));
            }
          },
        );
      });
      setPickerOpen(false);
    } catch (err) {
      console.error(err);
      alert('Không thể gửi nhãn dán.');
    } finally {
      setSending(false);
    }
  }

  const createRoomMutation = useCreateChatRoomMutation();

  const handlePickNewChat = async (userId: string) => {
    const existing = conversations.find(c => !c.isGroup && c.peers.some((p: ChatPeerDto) => p.id === userId));
    if (existing) {
      router.replace(`/messages?roomId=${existing.id}`);
      return;
    }

    if (!meId || !privateKey) return;
    setSending(true);

    try {
      const { importKeyFromBase64, generateRoomAESKey, encryptRoomKeyWithRSA } = await import('@/lib/e2ee/crypto-utils');
      
      // Fetch public keys from server
      const keysRes = await fetch('/api/v1/chat/keys/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: [meId, userId] }),
      });
      const keysData = await keysRes.json();
      if (!keysData.success) throw new Error('Không thể lấy khóa công khai');

      const keysArray = keysData.data as { userId: string; publicKey: string }[];
      const pubKeys = keysArray.reduce((acc, curr) => {
        acc[curr.userId] = curr.publicKey;
        return acc;
      }, {} as Record<string, string>);

      if (!pubKeys[meId] || !pubKeys[userId]) {
        throw new Error('Một trong hai người dùng chưa khởi tạo khóa E2EE (vui lòng refresh để tạo khóa)');
      }

      const myPubKey = await importKeyFromBase64(pubKeys[meId], 'public');
      const peerPubKey = await importKeyFromBase64(pubKeys[userId], 'public');

      // Generate AES room key
      const newRoomKey = await generateRoomAESKey();

      // Encrypt for both
      const myEncrypted = await encryptRoomKeyWithRSA(newRoomKey, myPubKey);
      const peerEncrypted = await encryptRoomKeyWithRSA(newRoomKey, peerPubKey);

      const encryptedRoomKeys = {
        [meId]: myEncrypted,
        [userId]: peerEncrypted,
      };

      const room = await createRoomMutation.mutateAsync({
        isGroup: false,
        memberUserIds: [userId],
        encryptedRoomKeys,
      });

      // Cache the key so we don't need to decrypt it immediately
      setCachedRoomKey(room.id, newRoomKey);
      
      router.replace(`/messages?roomId=${room.id}`);
    } catch (err) {
      console.error('Lỗi tạo phòng:', err);
      alert(err instanceof Error ? err.message : 'Tạo phòng thất bại');
    } finally {
      setSending(false);
    }
  };

  const virtuosoRef = useRef<VirtuosoHandle>(null);

  if (!meId) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <p className="text-muted-foreground">Đăng nhập để xem tin nhắn.</p>
        <Link
          href="/login?next=/messages"
          className="bg-primary text-primary-foreground focus-visible:ring-ring mt-4 inline-flex min-h-11 items-center justify-center rounded-full px-6 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2"
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="md:border-border mx-auto flex h-full w-full max-w-7xl flex-col gap-0 md:flex-row md:border-x overflow-hidden">
        <aside className="border-border md:border-border flex w-full flex-col border-b md:w-72 md:border-b-0 md:border-r md:pt-0 overflow-hidden">
          <div className="border-border flex items-center justify-between gap-2 border-b p-3 shrink-0">
            <h1 className="text-foreground text-sm font-semibold">Hội thoại</h1>
            <button
              type="button"
              onClick={() => setNewChatOpen(true)}
              className="text-muted-foreground hover:bg-muted focus-visible:ring-ring flex min-h-11 min-w-11 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2"
              aria-label="Tin nhắn mới"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {convLoading ? (
              <div className="text-muted-foreground flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-muted-foreground p-4 text-sm">
                Chưa có hội thoại. Bắt đầu chat mới.
              </p>
            ) : (
              <ul>
                {conversations.map((c) => {
                  const active = roomId === c.id;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => router.replace(`/messages?roomId=${c.id}`)}
                        className={cn(
                          'hover:bg-muted focus-visible:ring-ring flex min-h-11 w-full items-center gap-3 px-3 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2',
                          active && 'bg-muted',
                        )}
                      >
                        <div className="bg-muted text-muted-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                          {c.isGroup ? (
                            <Users className="h-5 w-5" aria-hidden />
                          ) : (
                            (c.peers[0]?.name?.[0] || c.peers[0]?.username?.[0] || '?').toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-foreground truncate font-medium">
                            {c.isGroup ? c.name : (c.peers[0] ? peerLabel(c.peers[0]) : 'Unknown')}
                          </p>
                          <p className="text-muted-foreground truncate text-xs">
                            {c.lastMessage ? (
                              <DecryptedLastMessage conversation={c} privateKey={privateKey} />
                            ) : (
                              'Chưa có tin nhắn'
                            )}
                          </p>
                        </div>
                        {c.unreadCount > 0 ? (
                          <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                            {c.unreadCount}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <section className="bg-background flex flex-1 flex-col min-w-0 overflow-hidden">
          <div className="border-border border-b px-4 py-3 min-w-0 shrink-0">
            <h2 className="text-foreground text-sm font-semibold">{title}</h2>
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
              <div className="flex-1 overflow-hidden min-w-0 relative">
                <Virtuoso
                  ref={virtuosoRef}
                  className="h-full w-full pl-4 pr-6 lg:pr-8 overflow-x-hidden scroll-smooth"
                  data={messages}
                  initialTopMostItemIndex={messages.length - 1}
                  followOutput="auto"
                  alignToBottom
                  itemContent={(index, m) => {
                    const sender = activeConv?.peers.find(p => p.id === m.senderId);
                    
                    const isRead = activeConv?.peers.some(p => p.lastReadAt && new Date(p.lastReadAt) >= new Date(m.createdAt));
                    const isDelivered = activeConv?.peers.some(p => p.lastDeliveredAt && new Date(p.lastDeliveredAt) >= new Date(m.createdAt));
                    const status = isRead ? 'read' : isDelivered ? 'delivered' : 'sent';

                    return (
                      <ChatMessageItem
                        key={m.id}
                        message={m}
                        roomKey={roomKey}
                        isMine={m.senderId === meId}
                        senderInfo={sender}
                        readStatus={status}
                        isPulsing={m.id === pulsingId}
                        onScrollToMessage={(msgId) => {
                          const idx = messages.findIndex(msg => msg.id === msgId);
                          if (idx !== -1) {
                            virtuosoRef.current?.scrollToIndex({ index: idx, align: 'center', behavior: 'smooth' });
                            setPulsingId(msgId);
                            setTimeout(() => setPulsingId(null), 2000);
                          }
                        }}
                        onReply={() => setReplyingTo(m)}
                        onReact={(emoji) => {
                          chatSocket?.emit('chat:react', { messageId: m.id, emoji }, (ack: any) => {
                            if (ack?.ok) queryClient.invalidateQueries({ queryKey: queryKeys.chat.roomMessages(roomId) });
                          });
                        }}
                        onUnsend={() => {
                          if (!confirm('Bạn có chắc muốn thu hồi tin nhắn này?')) return;
                          chatSocket?.emit('chat:unsend', { messageId: m.id }, (ack: any) => {
                            if (ack?.ok) queryClient.invalidateQueries({ queryKey: queryKeys.chat.roomMessages(roomId) });
                          });
                        }}
                        onDelete={() => {
                          if (!confirm('Bạn có chắc muốn xoá tin nhắn này (chỉ phía bạn)?')) return;
                          chatSocket?.emit('chat:delete', { messageId: m.id }, (ack: any) => {
                            if (ack?.ok) queryClient.invalidateQueries({ queryKey: queryKeys.chat.roomMessages(roomId) });
                          });
                        }}
                      />
                    );
                  }}
                />
              </div>
            ) : (
              <div className="flex-1" />
            )}

            {roomId ? (
              <form
                className="border-border flex flex-col gap-0 border-t min-w-0 relative"
                onSubmit={(e) => {
                  e.preventDefault();
                  void onSend();
                }}
              >
                {replyingTo && (
                  <div className="flex items-center justify-between bg-muted/50 px-4 py-2 text-sm border-b border-border">
                    <div className="flex-1 truncate border-l-4 border-primary pl-3">
                      <span className="font-semibold mr-1">
                        Đang trả lời {replyingTo.senderId === meId ? 'chính bạn' : (activeConv?.peers.find(p => p.id === replyingTo.senderId)?.name || 'người dùng')}:
                      </span>
                      <span className="text-muted-foreground opacity-80">{replyingTo.type === 'text' ? 'Tin nhắn' : 'Đính kèm'}</span>
                    </div>
                    <button type="button" onClick={() => setReplyingTo(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2 p-3 items-center">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    ref={imageInputRef}
                    className="hidden"
                    onChange={(e) => void handleFileSelect(e, 'image')}
                  />
                <input
                  type="file"
                  accept="*/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={(e) => void handleFileSelect(e, 'file')}
                />
                
                {/* 🖼️ Image Button */}
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={sending || !roomKey}
                  className="text-muted-foreground hover:bg-muted flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40"
                  aria-label="Đính kèm ảnh/video"
                >
                  <ImagePlus className="h-5 w-5" />
                </button>

                {/* 📎 File Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending || !roomKey}
                  className="text-muted-foreground hover:bg-muted flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40"
                  aria-label="Đính kèm tệp tin"
                >
                  <Paperclip className="h-5 w-5" />
                </button>

                {/* 😀 Emoji/Sticker Picker */}
                <EmojiStickerPicker
                  open={pickerOpen}
                  onOpenChange={setPickerOpen}
                  onEmojiSelect={(emoji) => setDraft(prev => prev + emoji)}
                  onStickerSelect={onSendSticker}
                  trigger={
                    <button
                      type="button"
                      disabled={sending || !roomKey}
                      className="text-muted-foreground hover:bg-muted focus-visible:ring-ring flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40 relative focus-visible:outline-none focus-visible:ring-2"
                      aria-label="Emoji và Sticker"
                    >
                      <Smile className="h-5 w-5" />
                    </button>
                  }
                />

                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Nhập tin nhắn…"
                  className="border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus-visible:ring-ring min-h-11 flex-1 rounded-full border px-4 text-sm focus-visible:outline-none focus-visible:ring-2"
                  maxLength={8000}
                  disabled={sending || !roomKey}
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim() || !roomKey}
                  className="bg-primary text-primary-foreground focus-visible:ring-ring flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 disabled:opacity-40"
                  aria-label="Gửi"
                >
                  {sending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
                </div>
              </form>
            ) : null}
          </div>
        </section>
      </div>

      <NewChatModal
        open={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onPick={handlePickNewChat}
      />
    </>
  );
}
