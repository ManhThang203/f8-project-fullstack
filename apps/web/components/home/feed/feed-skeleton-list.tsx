'use client';

import type { PostFeedItemDto } from '@costy/shared';

import { PostCard } from '../post/post-card';
import '@aejkatappaja/phantom-ui';

const fakePostNoMedia: PostFeedItemDto = {
  id: 'fake-no-media',
  author: { id: 'u1', username: 'username', name: 'Tên người dùng', image: null },
  content:
    'Đây là một đoạn nội dung bài đăng mẫu dùng để tạo bộ khung loading. Nó chiếm khoảng hai đến ba dòng để giao diện trông tự nhiên hơn.',
  createdAt: new Date().toISOString(),
  visibility: 'PUBLIC',
  replyCount: 0,
  commentCount: 0,
  likeCount: 0,
  shareCount: 0,
  myReaction: null,
  savedByMe: false,
  topReactions: [],
  media: [],
  parentId: null,
};

const fakePostShort: PostFeedItemDto = {
  ...fakePostNoMedia,
  id: 'fake-short',
  content: 'Nội dung ngắn để khung xương (skeleton) có độ dài đa dạng.',
};

const SKELETON_ITEMS = [fakePostNoMedia, fakePostNoMedia, fakePostShort, fakePostNoMedia];

export function FeedSkeletonList() {
  return (
    <>
      <span className="sr-only">Đang tải feed…</span>
      <phantom-ui loading>
        <ul className="flex flex-col">
          {SKELETON_ITEMS.map((item, index) => (
            <PostCard key={index} post={{ ...item, id: `fake-${index}` }} onDismiss={() => {}} />
          ))}
        </ul>
      </phantom-ui>
    </>
  );
}
