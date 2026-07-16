'use client';

import { Check, CheckCheck, Reply, Forward, SmilePlus, Trash2, XCircle } from 'lucide-react';

import { ChatMediaViewer } from './chat-media-viewer';
import { MOCK_STICKERS } from './emoji-sticker-picker';

import { cn } from '@/lib/utils';
import type { ChatMessageDto } from '@/types/chat';

// Tóm tắt nội dung tin nhắn được reply để hiển thị trong bubble
function replyPreview(msg: ChatMessageDto) {
  if (msg.isUnsent) return 'Đã thu hồi';
  if (msg.type === 'sticker') return '[Nhãn dán]';
  if (msg.mediaId) return '[Hình ảnh/Tệp đính kèm]';
  return msg.content || 'Tin nhắn';
}

export function ChatMessageItem({
  message,
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
  const timeStr = new Date(message.createdAt).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  const sticker =
    message.type === 'sticker' && message.content
      ? MOCK_STICKERS.find((s) => s.id === message.content)
      : null;

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
          className="mt-auto shrink-0"
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
            'min-w-0 wrap-break-word break-all rounded-2xl px-3 py-2 text-sm transition-colors duration-500',
            isMine ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
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
              <span className="truncate">{replyPreview(message.replyToMessage)}</span>
            </div>
          )}
          {message.isUnsent ? (
            <p className="flex items-center gap-1 italic opacity-60">Tin nhắn đã bị thu hồi</p>
          ) : (
            <>
              {message.type === 'text' && message.content ? (
                <p className="whitespace-pre-wrap wrap-break-word break-all">{message.content}</p>
              ) : null}
              {message.type === 'sticker' ? (
                sticker ? (
                  <img src={sticker.url} alt="Sticker" className="h-24 w-24 object-contain" />
                ) : (
                  <p className="italic opacity-80">[Nhãn dán: {message.content}]</p>
                )
              ) : null}
              {message.mediaId ? (
                message.media?.publicUrl ? (
                  <ChatMediaViewer
                    mediaUrl={message.media.publicUrl}
                    width={message.media.width}
                    height={message.media.height}
                    mimeType={message.media.mimeType}
                  />
                ) : (
                  <p className="italic opacity-80">[Tệp đính kèm không còn khả dụng]</p>
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
              className="bg-background border-border absolute -bottom-3 z-10 flex gap-1 rounded-full border px-1.5 py-0.5 text-xs shadow-xs"
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
              'bg-background border-border text-foreground absolute z-20 flex items-center gap-1 rounded-lg border p-1 opacity-0 shadow-xs transition-opacity group-hover/bubble:opacity-100',
              'bottom-full mb-1',
              isMine ? 'right-0' : 'left-0',
              'sm:bottom-auto sm:top-0 sm:mb-0',
              isMine ? 'sm:right-full sm:mr-2' : 'sm:left-full sm:ml-2',
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
                <div
                  className={cn(
                    'absolute bottom-full hidden pb-1 group-hover/emoji:block',
                    isMine ? 'right-0' : 'left-0',
                  )}
                >
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
