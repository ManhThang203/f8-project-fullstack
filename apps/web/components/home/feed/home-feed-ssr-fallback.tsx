'use client';

import { CreatePostTrigger } from '../compose/create-post-trigger';
import { FeedSkeletonList } from './feed-skeleton-list';
import '@aejkatappaja/phantom-ui';

/**
 * Shell tĩnh cho SSR/hydrate — khớp bố cục `HomeFeed` nhưng được bọc trong skeleton phantom-ui.
 */
export function HomeFeedSsrFallback() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col px-4 py-4">
      <phantom-ui loading>
        <div className="mb-8">
          <CreatePostTrigger
            username={undefined}
            avatarUrl={undefined}
            onOpen={() => {}}
          />
        </div>
        <FeedSkeletonList />
      </phantom-ui>
    </div>
  );
}
