import type { Metadata } from 'next';

import { ProfileView } from '@/components/profile/profile-view';
import { ProfileSkeleton } from '@/components/profile/profile-skeleton';
import { ClientOnly } from '@/components/shared/client-only';
import { getServerSession } from '@/lib/auth-session.server';

type Props = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `@${username}`,
    description: `Trang cá nhân @${username}`,
  };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const serverSession = await getServerSession();

  return (
    <main className="min-h-screen bg-background">
      <ClientOnly fallback={<ProfileSkeleton />}>
        <ProfileView username={username} initialUser={serverSession?.user ?? null} />
      </ClientOnly>
    </main>
  );
}
