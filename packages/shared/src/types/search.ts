export type SearchMode = 'hybrid' | 'fulltext-only';

/** Kết quả search post — cùng shape feed item cho client tái sử dụng UI. */
export type { PostFeedItemDto as PostSearchResult } from './post.js';

export interface SearchMeta {
  total: number;
  query: string;
  searchMode: SearchMode;
}

/** Kết quả tìm người dùng. */
export interface UserSearchResultDto {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  isFollowing: boolean;
}

/** Kết quả tìm hashtag kèm số bài viết. */
export interface HashtagSearchResultDto {
  id: string;
  tag: string;
  postCount: number;
}
