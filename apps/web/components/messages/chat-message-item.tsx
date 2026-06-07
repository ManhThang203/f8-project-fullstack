'use client';

import { Check, CheckCheck, Reply, Forward, SmilePlus, Trash2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ChatMediaViewer } from './chat-media-viewer';
import { MOCK_STICKERS } from './emoji-sticker-picker';

import { decryptPayloadWithAES } from '@/lib/e2ee/crypto-utils';
import { cn } from '@/lib/utils';
import type { ChatMessageDto } from '@/types/chat';

export type DecryptedPayload = {
  text?: string;
  stickerId?: string;
  mediaId?: string;
  mediaUrl?: string;
  width?: number;
  height?: number;
  blurDataUrl?: string;
  iv?: string;
  fileName?: string;
  fileType?: string;
};

export function ChatMessageItem({
  message,
  roomKey,
  isMine,
  senderInfo,
  readStatus,
  onReply,
  onForward,
  onReact,
  onUnsend,
  onDelete,
  onScrollToMessage,
  isPulsing,
}: {
  message: ChatMessageDto;
  roomKey: CryptoKey | null;
  isMine: boolean;
  senderInfo?: { name: string | null; username: string; image: string | null };
  readStatus?: 'sent' | 'delivered' | 'read';
  onReply?: () => void;
  onForward?: () => void;
  onReact?: (emoji: string) => void;
  onUnsend?: () => void;
  onDelete?: () => void;
  onScrollToMessage?: (msgId: string) => void;
  isPulsing?: boolean;
}) {
  const [payload, setPayload] = useState<DecryptedPayload | null>(null);
  const [replyPayload, setReplyPayload] = useState<DecryptedPayload | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!roomKey) return;
    let cancelled = false;

    decryptPayloadWithAES(message.encryptedPayload, roomKey)
      .then((str) => {
        if (cancelled) return;
        try {
          const parsed = JSON.parse(str);
          setPayload(parsed);
        } catch {
          // Fallback if not JSON
          setPayload({ text: str });
        }
      })
      .catch((err) => {
        console.error('Lỗi giải mã tin nhắn', err);
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [message.encryptedPayload, roomKey]);

  useEffect(() => {
    if (!roomKey || !message.replyToMessage || message.replyToMessage.isUnsent) return;
    let cancelled = false;

    decryptPayloadWithAES(message.replyToMessage.encryptedPayload, roomKey)
      .then((str) => {
        if (cancelled) return;
        try {
          const parsed = JSON.parse(str);
          setReplyPayload(parsed);
        } catch {
          setReplyPayload({ text: str });
        }
      })
      .catch((err) => {
        console.error('Lỗi giải mã tin nhắn reply', err);
      });

    return () => {
      cancelled = true;
    };
  }, [message.replyToMessage, roomKey]);

  const timeStr = new Date(message.createdAt).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (message.deletedFor?.includes(isMine ? 'me' : 'them')) {
    // We already filter this on the server, but just in case
    return null;
  }

  const renderStatus = () => {
    if (!isMine) return null;
    if (readStatus === 'read') return <CheckCheck className="ml-1 inline h-3 w-3 text-blue-500" />;
    if (readStatus === 'delivered')
      return <CheckCheck className="text-muted-foreground ml-1 inline h-3 w-3 opacity-70" />;
    return <Check className="text-muted-foreground ml-1 inline h-3 w-3 opacity-70" />;
  };

  return (
    <div
      id={`msg-${message.id}`}
      className={cn('mb-4 flex w-full min-w-0', isMine ? 'justify-end' : 'justify-start gap-2')}
    >
      {!isMine && (
        <div
          className="mt-auto flex-shrink-0"
          title={senderInfo?.name || senderInfo?.username || 'Unknown'}
        >
          {senderInfo?.image ? (
            <img
              src={senderInfo.image}
              alt="avatar"
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="bg-muted border-border text-muted-foreground flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold">
              {(senderInfo?.name?.[0] || senderInfo?.username?.[0] || '?').toUpperCase()}
            </div>
          )}
        </div>
      )}
      <div className={cn('group/bubble relative min-w-0 max-w-[75%]', isMine && 'mr-6 lg:mr-8')}>
        <div
          className={cn(
            'min-w-0 break-words break-all rounded-2xl px-3 py-2 text-sm transition-colors duration-500',
            isMine ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
            error && 'bg-destructive text-destructive-foreground opacity-50',
            isPulsing &&
              (isMine
                ? 'bg-primary/80 animate-pulse ring-2 ring-white/50'
                : 'ring-primary bg-primary/20 animate-pulse ring-2'),
          )}
        >
          {message.replyToMessage && (
            <div
              onClick={() => onScrollToMessage?.(message.replyToMessage!.id)}
              className={cn(
                'mb-1 flex max-w-[200px] cursor-pointer flex-col truncate border-l-2 pl-2 text-xs opacity-80 hover:underline',
                isMine ? 'border-primary-foreground/50' : 'border-primary/50',
              )}
            >
              <span className="mb-0.5 font-semibold">Trả lời:</span>
              <span className="truncate">
                {message.replyToMessage.isUnsent
                  ? 'Đã thu hồi'
                  : replyPayload?.text ||
                    (replyPayload?.mediaId
                      ? '[Hình ảnh/Tệp đính kèm]'
                      : replyPayload?.stickerId
                        ? '[Nhãn dán]'
                        : 'Tin nhắn')}
              </span>
            </div>
          )}
          {message.isUnsent ? (
            <p className="flex items-center gap-1 italic opacity-60">Tin nhắn đã bị thu hồi</p>
          ) : !roomKey ? (
            <p className="italic opacity-50">Đang giải mã khóa...</p>
          ) : error ? (
            <p className="italic">Không thể giải mã tin nhắn</p>
          ) : !payload ? (
            <p className="italic opacity-50">Đang giải mã...</p>
          ) : (
            <>
              {payload.text ? (
                <p className="whitespace-pre-wrap break-words break-all">{payload.text}</p>
              ) : null}
              {payload.stickerId ? (
                MOCK_STICKERS.find((s) => s.id === payload.stickerId) ? (
                  <img
                    src={MOCK_STICKERS.find((s) => s.id === payload.stickerId)!.url}
                    alt="Sticker"
                    className="h-24 w-24 object-contain"
                  />
                ) : (
                  <p className="italic opacity-80">[Nhãn dán: {payload.stickerId}]</p>
                )
              ) : null}
              {payload.mediaId ? (
                payload.mediaUrl && payload.iv ? (
                  <ChatMediaViewer
                    mediaUrl={payload.mediaUrl}
                    blurDataUrl={payload.blurDataUrl}
                    width={payload.width}
                    height={payload.height}
                    iv={payload.iv}
                    roomKey={roomKey}
                    fileName={payload.fileName}
                    fileType={payload.fileType}
                  />
                ) : (
                  <p className="italic opacity-80">[Tệp đính kèm: {payload.mediaId}]</p>
                )
              ) : null}
            </>
          )}
          <div className="mt-1 flex items-center justify-between">
            <p
              className={cn(
                'text-[10px] opacity-80',
                isMine ? 'text-primary-foreground' : 'text-muted-foreground',
              )}
            >
              {timeStr}
            </p>
            {renderStatus()}
          </div>

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div
              className="bg-background border-border absolute -bottom-3 z-10 flex gap-1 rounded-full border px-1.5 py-0.5 text-xs shadow-sm"
              style={isMine ? { right: 10 } : { left: 10 }}
            >
              {Array.from(new Set(message.reactions.map((r) => r.emoji))).map((emoji) => {
                const count = message.reactions!.filter((r) => r.emoji === emoji).length;
                return (
                  <span
                    key={emoji}
                    className="hover:bg-muted flex cursor-pointer items-center space-x-0.5 rounded-full px-1"
                    onClick={() => onReact?.(emoji)}
                  >
                    <span>{emoji}</span>
                    {count > 1 && (
                      <span className="text-foreground text-[10px] font-medium">{count}</span>
                    )}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Hover Action Menu */}
        {!message.isUnsent && (
          <div
            className={cn(
              'bg-background border-border text-foreground absolute top-0 z-20 flex items-center gap-1 rounded-lg border p-1 opacity-0 shadow-sm transition-opacity group-hover/bubble:opacity-100',
              isMine ? 'right-full mr-2' : 'left-full ml-2',
            )}
          >
            {onReact && (
              <div className="group/emoji relative">
                <button
                  className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-1.5 transition-colors"
                  title="Bày tỏ cảm xúc"
                >
                  <SmilePlus className="h-4 w-4" />
                </button>
                <div className="absolute bottom-full left-1/2 hidden -translate-x-1/2 pb-1 group-hover/emoji:block">
                  <div className="bg-background border-border flex gap-1 rounded-full border p-1 shadow-md">
                    {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => onReact(emoji)}
                        className="hover:bg-muted flex h-8 w-8 items-center justify-center rounded-full text-lg transition-transform hover:scale-110"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {onReply && (
              <button
                onClick={onReply}
                className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-1.5 transition-colors"
                title="Trả lời"
              >
                <Reply className="h-4 w-4" />
              </button>
            )}
            {onForward && (
              <button
                onClick={onForward}
                className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-1.5 transition-colors"
                title="Chuyển tiếp"
              >
                <Forward className="h-4 w-4" />
              </button>
            )}
            {isMine && onUnsend && (
              <button
                onClick={onUnsend}
                className="text-destructive hover:bg-destructive/10 rounded-md p-1.5 transition-colors"
                title="Thu hồi"
              >
                <XCircle className="h-4 w-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="text-destructive hover:bg-destructive/10 rounded-md p-1.5 transition-colors"
                title="Xoá (chỉ mình tôi)"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
