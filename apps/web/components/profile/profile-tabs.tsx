'use client';

import { Grid2X2, Heart, Play } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useId } from 'react';

import type { ProfileTab } from '@/components/profile/profile-utils';
import { cn } from '@/lib/utils';

type Props = {
  username: string;
  isOwner: boolean;
  activeTab: ProfileTab;
};

const TABS: { id: ProfileTab; label: string; icon: typeof Grid2X2 }[] = [
  { id: 'posts', label: 'Bài viết', icon: Grid2X2 },
  { id: 'reels', label: 'Reels', icon: Play },
  { id: 'liked', label: 'Đã thích', icon: Heart },
];

export function ProfileTabs({ username, isOwner, activeTab }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tablistId = useId();

  const visibleTabs = TABS.filter((t) => t.id !== 'liked' || isOwner);

  const navigate = useCallback(
    (tab: ProfileTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === 'posts') {
        params.delete('tab');
      } else {
        params.set('tab', tab);
      }
      const qs = params.toString();
      router.push(`/${encodeURIComponent(username)}${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [router, searchParams, username],
  );

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const count = visibleTabs.length;
    let next = index;
    if (e.key === 'ArrowRight') next = (index + 1) % count;
    else if (e.key === 'ArrowLeft') next = (index - 1 + count) % count;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = count - 1;
    else return;
    e.preventDefault();
    navigate(visibleTabs[next]!.id);
  }

  return (
    <div
      role="tablist"
      id={tablistId}
      aria-label="Nội dung trang cá nhân"
      className="border-border bg-background sticky top-14 z-10 border-b"
    >
      <div className="flex">
        {visibleTabs.map((tab, index) => {
          const selected = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${tablistId}-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${tablistId}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => navigate(tab.id)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={cn(
                'text-muted-foreground flex min-h-11 flex-1 items-center justify-center gap-2 px-3 text-sm font-medium',
                'hover:text-foreground transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                selected && 'text-foreground border-primary border-b-2',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
