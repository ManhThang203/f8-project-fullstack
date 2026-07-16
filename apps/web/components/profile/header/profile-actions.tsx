'use client';

import type { FriendStatus, ProfileDto } from '@costy/shared';
import { ChevronDown, MoreHorizontal, Settings, UserCheck, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { EditProfileModal } from './edit-profile-modal';

import { ReportModal } from '@/components/shared/report-modal';
import { Button, ConfirmDialog } from '@/components/shared/ui';
import {
  useBlockMutation,
  useFollowMutation,
  useFriendMutation,
  type FriendAction,
} from '@/hooks/queries/social';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { getUserFacingErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

type Props = {
  profile: ProfileDto;
  onFollowChange: (isFollowing: boolean) => void;
};

export function ProfileActions({ profile, onFollowChange }: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [friendStatus, setFriendStatus] = useState<FriendStatus>(profile.friendStatus);

  useEffect(() => {
    setFriendStatus(profile.friendStatus);
  }, [profile.friendStatus]);

  const friendMutation = useFriendMutation({
    onError: (err) => toast.error(getUserFacingErrorMessage(err)),
  });

  const followMutation = useFollowMutation({
    onError: (err) => toast.error(getUserFacingErrorMessage(err)),
  });

  const blockMutation = useBlockMutation();
  const { requireAuth } = useRequireAuth();

  /** Gọi API kết bạn với optimistic update, revert nếu lỗi. */
  function runFriend(action: FriendAction, optimistic: FriendStatus) {
    const prev = friendStatus;
    setFriendStatus(optimistic);
    friendMutation.mutate(
      {
        userId: profile.id,
        action,
        user: {
          id: profile.id,
          username: profile.username,
          name: profile.name,
          image: profile.image,
          createdAt: profile.createdAt,
          friendStatus: optimistic,
        },
      },
      {
        onSuccess: (data) => setFriendStatus(data.status),
        onError: () => setFriendStatus(prev),
      },
    );
  }

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  useEffect(() => {
    if (!moreMenuOpen) return;
    function onDoc(e: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [moreMenuOpen]);

  if (profile.deletedAt) return null;

  if (profile.isOwner) {
    return (
      <>
        <Button variant="secondary" size="md" onClick={() => setEditOpen(true)}>
          Chỉnh sửa trang cá nhân
        </Button>
        <Button variant="secondary" size="md" onClick={() => router.push('/saved')}>
          Bài viết đã lưu
        </Button>
        <Button
          variant="ghost"
          size="icon-md"
          aria-label="Cài đặt"
          onClick={() => router.push('/settings')}
        >
          <Settings className="h-5 w-5" aria-hidden />
        </Button>
        <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} profile={profile} />
      </>
    );
  }

  function toggleFollow(next: boolean) {
    const prev = profile.isFollowing;
    onFollowChange(next);
    setMenuOpen(false);

    followMutation.mutate(
      { userId: profile.id, follow: next },
      {
        onError: () => onFollowChange(prev),
      },
    );
  }

  function handleMessage() {
    router.push(`/messages?roomId=`); // We can't know room id yet. We can just send to /messages.
  }

  function openReport() {
    setMoreMenuOpen(false);
    if (!requireAuth()) return;
    setReportOpen(true);
  }

  function openBlockConfirm() {
    setMoreMenuOpen(false);
    if (!requireAuth()) return;
    setBlockConfirmOpen(true);
  }

  function confirmBlock() {
    blockMutation.mutate(
      { userId: profile.id, block: true },
      {
        onSuccess: () => {
          setBlockConfirmOpen(false);
          toast.success(`Đã chặn @${profile.username}`);
          router.push('/');
        },
        onError: (err) => toast.error(getUserFacingErrorMessage(err)),
      },
    );
  }

  const followLoading = followMutation.isPending;
  const friendLoading = friendMutation.isPending;

  return (
    <>
      {friendStatus === 'none' ? (
        <Button
          variant="primary"
          size="md"
          loading={friendLoading}
          onClick={() => runFriend('request', 'request_sent')}
        >
          <UserPlus className="h-4 w-4" aria-hidden />
          Kết bạn
        </Button>
      ) : null}

      {friendStatus === 'request_sent' ? (
        <Button
          variant="secondary"
          size="md"
          loading={friendLoading}
          onClick={() => runFriend('cancel', 'none')}
        >
          Đã gửi lời mời
        </Button>
      ) : null}

      {friendStatus === 'request_received' ? (
        <>
          <Button
            variant="primary"
            size="md"
            loading={friendLoading}
            onClick={() => runFriend('accept', 'friends')}
          >
            Chấp nhận
          </Button>
          <Button
            variant="secondary"
            size="md"
            disabled={friendLoading}
            onClick={() => runFriend('reject', 'none')}
          >
            Từ chối
          </Button>
        </>
      ) : null}

      {friendStatus === 'friends' ? (
        <Button
          variant="secondary"
          size="md"
          loading={friendLoading}
          onClick={() => runFriend('unfriend', 'none')}
        >
          <UserCheck className="h-4 w-4" aria-hidden />
          Bạn bè
        </Button>
      ) : null}

      {profile.isFollowing ? (
        <div className="relative" ref={menuRef}>
          <Button
            variant="secondary"
            size="md"
            loading={followLoading}
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            Đang theo dõi
            <ChevronDown className="h-4 w-4" aria-hidden />
          </Button>
          {menuOpen ? (
            <div
              role="menu"
              className="border-border bg-card absolute left-0 top-full z-50 mt-1 min-w-40 rounded-lg border py-1 shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                className={cn(
                  'text-foreground hover:bg-muted w-full px-4 py-2 text-left text-sm',
                  'focus-visible:bg-muted focus-visible:outline-hidden',
                )}
                onClick={() => toggleFollow(false)}
              >
                Hủy theo dõi
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <Button
          variant="primary"
          size="md"
          loading={followLoading}
          onClick={() => toggleFollow(true)}
        >
          Theo dõi
        </Button>
      )}
      <Button variant="secondary" size="md" onClick={handleMessage}>
        Nhắn tin
      </Button>
      <div className="relative" ref={moreMenuRef}>
        <Button
          variant="ghost"
          size="icon-md"
          aria-label="Tuỳ chọn"
          aria-expanded={moreMenuOpen}
          aria-haspopup="menu"
          onClick={() => setMoreMenuOpen((v) => !v)}
        >
          <MoreHorizontal className="h-5 w-5" aria-hidden />
        </Button>
        {moreMenuOpen ? (
          <div
            role="menu"
            className="border-border bg-card absolute right-0 top-full z-50 mt-1 min-w-48 rounded-lg border py-1 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              className={cn(
                'text-foreground hover:bg-muted w-full px-4 py-2 text-left text-sm',
                'focus-visible:bg-muted focus-visible:outline-hidden',
              )}
              onClick={openReport}
            >
              Báo cáo người dùng
            </button>
            <button
              type="button"
              role="menuitem"
              className={cn(
                'text-foreground hover:bg-muted w-full px-4 py-2 text-left text-sm',
                'focus-visible:bg-muted focus-visible:outline-hidden',
              )}
              onClick={openBlockConfirm}
            >
              Chặn @{profile.username}
            </button>
          </div>
        ) : null}
      </div>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="USER"
        targetId={profile.id}
      />

      <ConfirmDialog
        open={blockConfirmOpen}
        onClose={() => setBlockConfirmOpen(false)}
        onConfirm={confirmBlock}
        title={`Chặn @${profile.username}?`}
        description="Họ sẽ không thể theo dõi, nhắn tin hoặc tìm kiếm bạn. Quan hệ kết bạn và theo dõi sẽ bị huỷ."
        confirmLabel="Chặn"
        cancelLabel="Huỷ"
        confirming={blockMutation.isPending}
        destructive
      />
    </>
  );
}
