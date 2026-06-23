import { ProfileSkeleton } from '@/components/profile/profile-skeleton';

export default function ProfileLoading() {
  return (
    <main className="bg-background min-h-dvh">
      <ProfileSkeleton />
    </main>
  );
}
