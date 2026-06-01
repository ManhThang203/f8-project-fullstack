'use client';

import type { ProfileDto } from '@costy/shared';
import { ChevronDown, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/shared/button';

import { useFollowMutation } from '@/hooks/queries/use-follow-mutation';
import { cn } from '@/lib/utils';

type Props = {
  profile: ProfileDto;
  onFollowChange: (isFollowing: boolean) => void;
};

export function ProfileActions({ profile, onFollowChange }: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const followMutation = useFollowMutation({
    onError: (err) => toast.error(err.message),
  });

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
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="md" disabled aria-disabled>
          Chỉnh sửa trang cá nhân
        </Button>
        <Button variant="secondary" size="md" disabled aria-disabled>
          Xem kho lưu trữ
        </Button>
        <Button variant="ghost" size="icon-md" aria-label="Cài đặt" disabled>
          <Settings className="h-5 w-5" aria-hidden />
        </Button>
      </div>
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

  return (
    <div className="flex flex-wrap items-center gap-2">
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
    </div>
  );
}
