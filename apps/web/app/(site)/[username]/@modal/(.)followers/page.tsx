'use client';

import { useParams, useRouter } from 'next/navigation';

import { FollowListView } from '@/components/profile/follow/follow-list-view';
import { Modal } from '@/components/shared/modal';

export default function FollowersModal() {
  const router = useRouter();
  const { username } = useParams<{ username: string }>();

  return (
    <Modal open onClose={() => router.back()}>
      <Modal.Backdrop />
      <Modal.Panel className="flex max-h-[min(80dvh,640px)] w-full max-w-md flex-col overflow-hidden">
        <FollowListView
          username={username}
          title="Người theo dõi"
          mode="followers"
          asModal
          onClose={() => router.back()}
        />
      </Modal.Panel>
    </Modal>
  );
}
