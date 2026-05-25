'use client';

import Link from 'next/link';

import { cn } from '@/lib/utils';

type StatProps = {
  count: number;
  label: string;
  href?: string;
  onClick?: () => void;
};

function StatButton({ count, label, href, onClick }: StatProps) {
  const content = (
    <>
      <span className="text-foreground text-base font-semibold tabular-nums">{count}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </>
  );

  const className = cn(
    'flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-lg px-2 md:flex-row md:gap-1',
    'hover:bg-muted transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  );

  const aria = `${count} ${label.toLowerCase()}`;

  if (href) {
    return (
      <Link href={href} className={className} aria-label={aria}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={className} aria-label={aria} onClick={onClick}>
      {content}
    </button>
  );
}

type Props = {
  username: string;
  posts: number;
  followers: number;
  following: number;
};

export function ProfileStats({ username, posts, followers, following }: Props) {
  return (
    <div className="flex items-center justify-around gap-2 md:justify-start md:gap-6">
      <StatButton count={posts} label="Bài viết" />
      <StatButton
        count={followers}
        label="Người theo dõi"
        href={`/${encodeURIComponent(username)}/followers`}
      />
      <StatButton
        count={following}
        label="Đang theo dõi"
        href={`/${encodeURIComponent(username)}/following`}
      />
    </div>
  );
}
