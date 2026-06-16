'use client';

import type { FriendStatus, ProfileDto } from '@costy/shared';
import { ChevronDown, Flag, Settings, UserCheck, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { EditProfileModal } from './edit-profile-modal';

import { Button } from '@/components/shared/button';
import { ReportModal } from '@/components/shared/report-modal';
import { useFollowMutation } from '@/hooks/queries/use-follow-mutation';
import { useFriendMutation, type FriendAction } from '@/hooks/queries/use-friend-mutation';
import { cn } from '@/lib/utils';

type Props = {
  profile: ProfileDto;
  onFollowChange: (isFollowing: boolean) => void;
};

export function ProfileActions({ profile, onFollowChange }: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [friendStatus, setFriendStatus] = useState<FriendStatus>(profile.friendStatus);

  useEffect(() => {
    setFriendStatus(profile.friendStatus);
  }, [profile.friendStatus]);

  const friendMutation = useFriendMutation({
    onError: (err) => toast.error(err.message),
  });

  const followMutation = useFollowMutation({
    onError: (err) => toast.error(err.message),
  });

  /** Gọi API kết bạn với optimistic update, revert nếu lỗi. */
  function runFriend(action: FriendAction, optimistic: FriendStatus) {
    const prev = friendStatus;
    setFriendStatus(optimistic);
    friendMutation.mutate(
      { userId: profile.id, action },
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
        <Button variant="ghost" size="icon-md" aria-label="Cài đặt" disabled>
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
        onSuccess: (data) => onFollowChange(data.isFollowing),
        onError: () => onFollowChange(prev),
      },
    );
  }

  function handleMessage() {
    router.push(`/messages?roomId=`); // We can't know room id yet. We can just send to /messages.
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
              className="border-border bg-card absolute left-0 top-full z-50 mt-1 min-w-[10rem] rounded-lg border py-1 shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                className={cn(
                  'text-foreground hover:bg-muted w-full px-4 py-2 text-left text-sm',
                  'focus-visible:bg-muted focus-visible:outline-none',
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
      <Button
        variant="ghost"
        size="icon-md"
        aria-label="Báo cáo người dùng"
        onClick={() => setReportOpen(true)}
      >
        <Flag className="h-5 w-5" aria-hidden />
      </Button>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="USER"
        targetId={profile.id}
      />
    </>
  );
}
