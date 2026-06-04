'use client';

import type { ProfileDto } from '@costy/shared';

import { Avatar } from '@/components/shared/avatar';
import { formatJoinedDate } from '@/components/profile/profile-utils';
import { cn } from '@/lib/utils';

type Props = {
  profile: ProfileDto;
  onAvatarClick: () => void;
  actions: React.ReactNode;
  stats: React.ReactNode;
};

export function ProfileHeader({ profile, onAvatarClick, actions, stats }: Props) {
  const isDeleted = Boolean(profile.deletedAt);

  return (
    <header className="px-4 py-6 md:px-0 md:py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-8">
        <Avatar
          src={profile.image}
          name={profile.name}
          username={profile.username}
          size="2xl"
          onClick={onAvatarClick}
          className={cn(isDeleted && 'opacity-60')}
        />

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 space-y-1">
              <h1 className="text-foreground text-xl font-semibold md:text-2xl">
                {profile.name ?? profile.username}
              </h1>
              <p className="text-muted-foreground text-sm">@{profile.username}</p>
            </div>
            <div className="hidden md:block">{actions}</div>
          </div>

          {profile.bio && !isDeleted ? (
            <p className="text-foreground line-clamp-4 text-sm leading-relaxed md:line-clamp-none">
              {profile.bio}
            </p>
          ) : null}

          {!isDeleted ? (
            <p className="text-muted-foreground text-xs">
              Tham gia {formatJoinedDate(profile.createdAt)}
            </p>
          ) : null}

          <div className="md:hidden">{stats}</div>
          <div className="md:hidden">{actions}</div>
        </div>
      </div>

      <div className="mt-4 hidden md:block">{stats}</div>
    </header>
  );
}
