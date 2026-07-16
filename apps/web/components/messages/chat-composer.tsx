'use client';

import { ImagePlus, Loader2, Paperclip, Send, Smile, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { EmojiStickerPicker } from './emoji-sticker-picker';

import type { ChatMessageDto } from '@/types/chat';

const TYPING_THROTTLE_MS = 2000;

export function ChatComposer({
  sending,
  replyingTo,
  replyAuthorName,
  onCancelReply,
  onSendText,
  onSendSticker,
  onSendFile,
  onTyping,
}: {
  sending: boolean;
  replyingTo: ChatMessageDto | null;
  replyAuthorName: string | null;
  onCancelReply: () => void;
  onSendText: (text: string) => Promise<void>;
  onSendSticker: (stickerId: string) => Promise<void>;
  onSendFile: (file: File) => Promise<void>;
  onTyping?: () => void;
}) {
  const [draft, setDraft] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const lastTypingRef = useRef(0);

  // Báo "đang gõ" tối đa mỗi TYPING_THROTTLE_MS để tránh spam socket.
  function notifyTyping() {
    if (!onTyping) return;
    const now = Date.now();
    if (now - lastTypingRef.current < TYPING_THROTTLE_MS) return;
    lastTypingRef.current = now;
    onTyping();
  }

  // Gửi text rồi reset ô nhập nếu thành công
  async function handleSubmit() {
    const text = draft.trim();
    if (!text || sending) return;
    try {
      await onSendText(text);
      setDraft('');
    } catch {
      // lỗi đã được xử lý/log ở parent
    }
  }

  // Gửi file đính kèm rồi reset input để chọn lại được cùng file
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || sending) return;
    try {
      await onSendFile(file);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  }

  // Gửi sticker và đóng picker
  async function handleSticker(stickerId: string) {
    if (sending) return;
    await onSendSticker(stickerId);
    setPickerOpen(false);
  }

  return (
    <form
      className="border-border relative flex min-w-0 flex-col gap-0 border-t pb-[env(safe-area-inset-bottom)]"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
    >
      {replyingTo && (
        <div className="bg-muted/50 border-border flex items-center justify-between border-b px-4 py-2 text-sm">
          <div className="border-primary flex-1 truncate border-l-4 pl-3">
            <span className="mr-1 font-semibold">
              Đang trả lời {replyAuthorName || 'người dùng'}:
            </span>
            <span className="text-muted-foreground opacity-80">
              {replyingTo.type === 'text' ? replyingTo.content || 'Tin nhắn' : 'Đính kèm'}
            </span>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Huỷ trả lời"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="flex min-w-0 w-full items-center gap-1 px-2 py-2 sm:gap-2 sm:p-3">
        <input
          type="file"
          accept="image/*,video/*"
          ref={imageInputRef}
          className="hidden"
          onChange={(e) => void handleFileSelect(e)}
        />
        <input
          type="file"
          accept="*/*"
          ref={fileInputRef}
          className="hidden"
          onChange={(e) => void handleFileSelect(e)}
        />

        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          disabled={sending}
          className="text-muted-foreground hover:bg-muted flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40"
          aria-label="Đính kèm ảnh/video"
        >
          <ImagePlus className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
          className="text-muted-foreground hover:bg-muted flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40"
          aria-label="Đính kèm tệp tin"
        >
          <Paperclip className="h-5 w-5" />
        </button>

        <EmojiStickerPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onEmojiSelect={(emoji) => setDraft((prev) => prev + emoji)}
          onStickerSelect={(stickerId) => void handleSticker(stickerId)}
          trigger={
            <button
              type="button"
              disabled={sending}
              className="text-muted-foreground hover:bg-muted focus-visible:ring-ring relative flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-hidden focus-visible:ring-2 disabled:opacity-40"
              aria-label="Emoji và Sticker"
            >
              <Smile className="h-5 w-5" />
            </button>
          }
        />

        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (e.target.value.trim()) notifyTyping();
          }}
          placeholder="Nhập tin nhắn…"
          className="border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus-visible:ring-ring min-h-11 min-w-0 flex-1 rounded-full border px-4 text-sm focus-visible:outline-hidden focus-visible:ring-2"
          maxLength={8000}
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="bg-primary text-primary-foreground focus-visible:ring-ring flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-90 focus-visible:outline-hidden focus-visible:ring-2 disabled:opacity-40"
          aria-label="Gửi"
        >
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </div>
    </form>
  );
}
