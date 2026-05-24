import type { Metadata } from 'next';

import { ReelsFeed } from '@/components/reels/reels-feed';

export const metadata: Metadata = {
  title: 'Reels',
  description: 'Khám phá video từ cộng đồng',
};

export default function ReelsPage() {
  return <ReelsFeed />;
}
