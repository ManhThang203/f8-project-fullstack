'use client';

import { createContext, useContext } from 'react';

import type { ChatDockContextValue, ChatPeerDto, Conversation } from './chat-dock.types';
import { useChatDockController } from './use-chat-dock-controller';

export type { ChatDockContextValue, ChatPeerDto, Conversation };
// Context để quản lý state của chat dock
const ChatDockContext = createContext<ChatDockContextValue | null>(null);
// Provider để cung cấp context cho các component con
export function ChatDockProvider({ children }: { children: React.ReactNode }) {
  // Giá trị của context được tạo bởi useChatDockController
  const value = useChatDockController();
  return <ChatDockContext.Provider value={value}>{children}</ChatDockContext.Provider>;
}
// Hook để sử dụng context trong các component con
export function useChatDock() {
  const ctx = useContext(ChatDockContext);
  if (!ctx) throw new Error('useChatDock must be used within ChatDockProvider');
  return ctx;
}
// Hook để sử dụng context trong các component con (không bắt buộc)
export function useChatDockOptional() {
  return useContext(ChatDockContext);
}
