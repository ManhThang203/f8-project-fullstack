export type SearchMode = 'hybrid' | 'fulltext-only';

/** Kết quả search post — cùng shape feed item cho client tái sử dụng UI. */
export type { PostFeedItemDto as PostSearchResult } from './post.js';

export interface SearchMeta {
  total: number;
  query: string;
  searchMode: SearchMode;
}
