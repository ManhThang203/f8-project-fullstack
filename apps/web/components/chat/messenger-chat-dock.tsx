'use client';

import { usePathname } from 'next/navigation';

import { authClient } from '@/lib/auth-client';

import { useChatDock } from './chat-dock-context';
import { ChatHubPanel } from './chat-hub-panel';
import { ChatUserPickerModal } from './chat-user-picker-modal';
import { GroupCreateModal } from './group-create-modal';
import { MessengerDockTray } from './messenger-dock-tray';

function MessengerChatDockInner() {
  const dock = useChatDock();

  return (
    <>
      <ChatHubPanel
        conversations={dock.conversations}
        onSelectDirect={(id) => dock.openDirectChat(id)}
        onSelectGroup={(gid) => dock.openGroupChat(gid)}
      />

      <ChatUserPickerModal
        open={dock.pickerOpen}
        onClose={() => dock.setPickerOpen(false)}
        onPick={(userId) => dock.openDirectChat(userId)}
      />

      <GroupCreateModal open={dock.groupModalOpen} onClose={() => dock.setGroupModalOpen(false)} />

      <MessengerDockTray />
    </>
  );
}

export function MessengerChatDock() {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id ?? null;
  if (!userId || pathname !== '/') return null;
  return <MessengerChatDockInner />;
}
