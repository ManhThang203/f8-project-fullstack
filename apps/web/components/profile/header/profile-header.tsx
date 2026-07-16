'use client';

import type { ProfileDto } from '@costy/shared';

import { formatJoinedDate } from '@/components/profile/profile-utils';
import { Avatar } from '@/components/shared/ui';
import { cn } from '@/lib/utils';

type Props = {
  profile: ProfileDto;
  onAvatarClick: () => void;
  onCoverClick?: () => void;
  actions: React.ReactNode;
  stats: React.ReactNode;
};

export function ProfileHeader({ profile, onAvatarClick, onCoverClick, actions, stats }: Props) {
  const isDeleted = Boolean(profile.deletedAt);

  return (
    <header className="px-4 pb-4 pt-6 md:px-0 md:pb-6">
      {profile.coverImage ? (
        <button
          type="button"
          aria-label="Xem ảnh bìa"
          onClick={onCoverClick}
          disabled={!onCoverClick}
          className={cn(
            'bg-muted mb-4 block h-32 w-full overflow-hidden rounded-xl md:h-40',
            'focus-visible:ring-ring focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            onCoverClick && 'cursor-pointer',
            isDeleted && 'opacity-60',
          )}
        >
          <img src={profile.coverImage} alt="" className="h-full w-full object-cover" />
        </button>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
        <Avatar
          src={profile.image}
          name={profile.name}
          username={profile.username}
          size="xl"
          onClick={onAvatarClick}
          className={cn('mx-auto sm:mx-0', isDeleted && 'opacity-60')}
        />

        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1 text-center sm:text-left">
            <h1 className="text-foreground text-xl font-semibold md:text-2xl">
              {profile.name ?? profile.username}
            </h1>
            <p className="text-muted-foreground text-sm">@{profile.username}</p>
          </div>

          {profile.bio && !isDeleted ? (
            <p className="text-foreground text-center text-sm leading-relaxed sm:text-left">
              {profile.bio}
            </p>
          ) : null}

          {!isDeleted ? (
            <p className="text-muted-foreground text-center text-xs sm:text-left">
              Tham gia {formatJoinedDate(profile.createdAt)}
            </p>
          ) : null}

          {stats}

          {!isDeleted ? <div className="flex flex-wrap justify-center gap-2 sm:justify-start">{actions}</div> : null}
        </div>
      </div>
    </header>
  );
}
