import type { Metadata } from 'next';
import { use } from 'react';

import { ReelsFeed } from '@/components/reels/reels-feed';

export const metadata: Metadata = {
  title: 'Reels',
  description: 'Khám phá video từ cộng đồng',
};

type Props = {
  params: Promise<{ id: string }>;
};

export default function ReelPage({ params }: Props) {
  const { id } = use(params);
  return <ReelsFeed initialPostId={id} />;
}
