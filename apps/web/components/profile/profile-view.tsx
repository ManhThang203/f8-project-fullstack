'use client';

import { ErrorCode, type ProfileDto, type ProfileGridItemDto } from '@threads/shared';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';

import { ProfileSkeleton } from '@/components/profile/profile-skeleton';
import { AvatarLightbox } from '@/components/profile/header/avatar-lightbox';
import { CreatePostModal } from '@/components/home/compose/create-post-modal';
import { MediaLightbox } from '@/components/profile/grid/media-lightbox';
import { ProfileActions } from '@/components/profile/header/profile-actions';
import { ProfileHeader } from '@/components/profile/header/profile-header';
import { ProfileMediaGrid } from '@/components/profile/grid/profile-media-grid';
import { ProfileStats } from '@/components/profile/header/profile-stats';
import { ProfileTabs } from '@/components/profile/tabs/profile-tabs';
import { parseProfileTab } from '@/components/profile/profile-utils';
import { Button } from '@/components/shared/button';
import { useProfile } from '@/hooks/queries/use-profile';
import { authClient } from '@/lib/auth-client';
import type { ServerAuthUser } from '@/lib/auth-user.types';
import { isApiQueryError } from '@/lib/api-query';
import { queryKeys } from '@/lib/query-keys';

type Props = {
  username: string;
  initialUser: ServerAuthUser | null;
};

function ProfileViewInner({ username, initialUser }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const { data: session } = authClient.useSession();

  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileIsError,
    error: profileError,
    refetch: refetchProfile,
  } = useProfile(username);

  const [avatarOpen, setAvatarOpen] = useState(false);
  const [lightboxItem, setLightboxItem] = useState<ProfileGridItemDto | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const tabParam = searchParams.get('tab');
  const activeTab = parseProfileTab(tabParam, profile?.isOwner ?? false);

  const me = useMemo(() => {
    const fromClient = session?.user
      ? {
          username: (session.user as { username?: string }).username ?? '',
          name: session.user.name ?? null,
          image: (session.user as { image?: string | null }).image ?? null,
        }
      : null;
    const fromServer = initialUser
      ? { username: initialUser.username ?? '', name: initialUser.name, image: null }
      : null;
    return fromClient ?? fromServer;
  }, [session?.user, initialUser]);

  useEffect(() => {
    if (profile && tabParam === 'liked' && !profile.isOwner) {
      router.replace(`/${encodeURIComponent(username)}`);
    }
  }, [profile, tabParam, username, router]);

  const handleFollowChange = useCallback(
    (isFollowing: boolean) => {
      queryClient.setQueryData(
        queryKeys.users.profile(username),
        (old: { data: ProfileDto } | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: {
              ...old.data,
              isFollowing,
              counts: {
                ...old.data.counts,
                followers: old.data.counts.followers + (isFollowing ? 1 : -1),
              },
            },
          };
        },
      );
    },
    [queryClient, username],
  );

  const notFound =
    profileIsError &&
    isApiQueryError(profileError) &&
    profileError.code === ErrorCode.NOT_FOUND;

  if (profileLoading) {
    return <ProfileSkeleton />;
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-[600px] space-y-4 px-4 py-16 text-center">
        <p className="text-foreground text-lg font-semibold">Không tìm thấy người dùng này</p>
        <Button variant="secondary" size="md" onClick={() => router.push('/')}>
          Trang chủ
        </Button>
      </div>
    );
  }

  if (profileIsError || !profile) {
    return (
      <div className="mx-auto max-w-[600px] space-y-4 px-4 py-16 text-center">
        <p className="text-muted-foreground text-sm">
          {profileError?.message ?? 'Không tải được trang cá nhân'}
        </p>
        <Button variant="secondary" size="md" onClick={() => void refetchProfile()}>
          Thử lại
        </Button>
      </div>
    );
  }

  const isDeleted = Boolean(profile.deletedAt);

  return (
    <div className="mx-auto w-full max-w-[600px]">
      <ProfileHeader
        profile={profile}
        onAvatarClick={() => profile.image && setAvatarOpen(true)}
        actions={<ProfileActions profile={profile} onFollowChange={handleFollowChange} />}
        stats={
          <ProfileStats
            username={profile.username}
            posts={profile.counts.posts}
            followers={profile.counts.followers}
            following={profile.counts.following}
          />
        }
      />

      {!isDeleted ? (
        <>
          <ProfileTabs username={profile.username} isOwner={profile.isOwner} activeTab={activeTab} />
          <div
            role="tabpanel"
            id="profile-grid-panel"
            aria-label={`${activeTab === 'posts' ? 'Bài viết' : activeTab === 'reels' ? 'Reels' : 'Đã thích'}`}
          >
            <ProfileMediaGrid
              username={profile.username}
              tab={activeTab}
              isOwner={profile.isOwner}
              isDeleted={isDeleted}
              onTileClick={setLightboxItem}
              onCreatePost={() => setCreateOpen(true)}
            />
          </div>
        </>
      ) : (
        <p className="text-muted-foreground px-4 py-12 text-center text-sm">
          Tài khoản này không khả dụng
        </p>
      )}

      <AvatarLightbox
        open={avatarOpen}
        src={profile.image}
        name={profile.name}
        onClose={() => setAvatarOpen(false)}
      />
      <MediaLightbox
        item={lightboxItem}
        username={profile.username}
        onClose={() => setLightboxItem(null)}
      />

      {profile.isOwner ? (
        <CreatePostModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          username={me?.username}
          name={me?.name}
          avatarUrl={me?.image}
          onPosted={() => {
            setCreateOpen(false);
            void refetchProfile();
            void queryClient.invalidateQueries({
              queryKey: queryKeys.users.grid(profile.username, activeTab),
            });
          }}
        />
      ) : null}
    </div>
  );
}

export function ProfileView(props: Props) {
  return (
    <Suspense fallback={null}>
      <ProfileViewInner {...props} />
    </Suspense>
  );
}
