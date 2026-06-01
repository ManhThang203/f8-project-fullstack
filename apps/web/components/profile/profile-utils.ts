import type { ProfileDto, ProfileGridItemDto } from '@costy/shared';

export type ProfileTab = 'posts' | 'reels' | 'liked';

export function formatJoinedDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
}

export function profilePostsPath(username: string, tab: ProfileTab, cursor?: string) {
  const base =
    tab === 'liked'
      ? `/users/${encodeURIComponent(username)}/likes`
      : `/users/${encodeURIComponent(username)}/posts?kind=${tab === 'reels' ? 'video' : 'image'}`;
  if (!cursor) return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}cursor=${encodeURIComponent(cursor)}`;
}

export function parseProfileTab(raw: string | null | undefined, isOwner: boolean): ProfileTab {
  if (raw === 'reels') return 'reels';
  if (raw === 'liked' && isOwner) return 'liked';
  return 'posts';
}

export function tabToKind(tab: ProfileTab): 'image' | 'video' | null {
  if (tab === 'reels') return 'video';
  if (tab === 'posts') return 'image';
  return null;
}

export type ProfileState = {
  profile: ProfileDto | null;
  items: ProfileGridItemDto[];
  nextCursor: string | null;
};
