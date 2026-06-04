'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { decryptPayloadWithAES } from '@/lib/e2ee/crypto-utils';
import type { ChatMessageDto } from '@/types/chat';
import { ChatMediaViewer } from './chat-media-viewer';
import { MOCK_STICKERS } from './emoji-sticker-picker';
import { Check, CheckCheck, Reply, Forward, SmilePlus, Trash2, XCircle } from 'lucide-react';

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
    if (readStatus === 'read') return <CheckCheck className="w-3 h-3 text-blue-500 ml-1 inline" />;
    if (readStatus === 'delivered') return <CheckCheck className="w-3 h-3 text-muted-foreground ml-1 inline opacity-70" />;
    return <Check className="w-3 h-3 text-muted-foreground ml-1 inline opacity-70" />;
  };

  return (
    <div id={`msg-${message.id}`} className={cn('flex w-full mb-4 min-w-0', isMine ? 'justify-end' : 'justify-start gap-2')}>
      {!isMine && (
        <div className="flex-shrink-0 mt-auto" title={senderInfo?.name || senderInfo?.username || 'Unknown'}>
           {senderInfo?.image ? (
             <img src={senderInfo.image} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
           ) : (
             <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-semibold text-muted-foreground">
               {(senderInfo?.name?.[0] || senderInfo?.username?.[0] || '?').toUpperCase()}
             </div>
           )}
        </div>
      )}
      <div className={cn("relative group/bubble max-w-[75%] min-w-0", isMine && "mr-6 lg:mr-8")}>
        <div
          className={cn(
            'rounded-2xl px-3 py-2 text-sm break-words break-all min-w-0 transition-colors duration-500',
            isMine ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
            error && 'bg-destructive text-destructive-foreground opacity-50',
            isPulsing && (isMine ? 'ring-2 ring-white/50 bg-primary/80 animate-pulse' : 'ring-2 ring-primary bg-primary/20 animate-pulse')
          )}
        >
        {message.replyToMessage && (
          <div 
            onClick={() => onScrollToMessage?.(message.replyToMessage!.id)}
            className={cn(
              "text-xs mb-1 pl-2 border-l-2 opacity-80 truncate max-w-[200px] cursor-pointer hover:underline flex flex-col",
              isMine ? "border-primary-foreground/50" : "border-primary/50"
            )}
          >
             <span className="font-semibold mb-0.5">Trả lời:</span>
             <span className="truncate">
               {message.replyToMessage.isUnsent 
                 ? 'Đã thu hồi' 
                 : (replyPayload?.text || (replyPayload?.mediaId ? '[Hình ảnh/Tệp đính kèm]' : (replyPayload?.stickerId ? '[Nhãn dán]' : 'Tin nhắn')))}
             </span>
          </div>
        )}
        {message.isUnsent ? (
          <p className="italic opacity-60 flex items-center gap-1">Tin nhắn đã bị thu hồi</p>
        ) : !roomKey ? (
          <p className="opacity-50 italic">Đang giải mã khóa...</p>
        ) : error ? (
          <p className="italic">Không thể giải mã tin nhắn</p>
        ) : !payload ? (
          <p className="opacity-50 italic">Đang giải mã...</p>
        ) : (
          <>
            {payload.text ? <p className="whitespace-pre-wrap break-words break-all">{payload.text}</p> : null}
            {payload.stickerId ? (
              MOCK_STICKERS.find(s => s.id === payload.stickerId) ? (
                <img src={MOCK_STICKERS.find(s => s.id === payload.stickerId)!.url} alt="Sticker" className="w-24 h-24 object-contain" />
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
        <div className="flex items-center justify-between mt-1">
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
          <div className="absolute -bottom-3 flex gap-1 bg-background border border-border rounded-full px-1.5 py-0.5 shadow-sm text-xs z-10" style={isMine ? { right: 10 } : { left: 10 }}>
            {Array.from(new Set(message.reactions.map(r => r.emoji))).map(emoji => {
              const count = message.reactions!.filter(r => r.emoji === emoji).length;
              return (
                <span key={emoji} className="flex items-center space-x-0.5 cursor-pointer hover:bg-muted rounded-full px-1" onClick={() => onReact?.(emoji)}>
                  <span>{emoji}</span>
                  {count > 1 && <span className="text-[10px] font-medium text-foreground">{count}</span>}
                </span>
              );
            })}
          </div>
        )}
        </div>

        {/* Hover Action Menu */}
        {!message.isUnsent && (
          <div className={cn(
            "absolute top-0 opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-1 bg-background border border-border rounded-lg shadow-sm p-1 z-20 text-foreground",
            isMine ? "right-full mr-2" : "left-full ml-2"
          )}>
            {onReact && (
              <div className="relative group/emoji">
                <button className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors" title="Bày tỏ cảm xúc">
                  <SmilePlus className="w-4 h-4" />
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 pb-1 hidden group-hover/emoji:block">
                  <div className="bg-background border border-border rounded-full shadow-md p-1 gap-1 flex">
                    {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                      <button key={emoji} onClick={() => onReact(emoji)} className="w-8 h-8 hover:bg-muted rounded-full flex items-center justify-center text-lg transition-transform hover:scale-110">
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {onReply && (
              <button onClick={onReply} className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors" title="Trả lời">
                <Reply className="w-4 h-4" />
              </button>
            )}
            {onForward && (
              <button onClick={onForward} className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors" title="Chuyển tiếp">
                <Forward className="w-4 h-4" />
              </button>
            )}
            {isMine && onUnsend && (
              <button onClick={onUnsend} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors" title="Thu hồi">
                <XCircle className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors" title="Xoá (chỉ mình tôi)">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
