/** Public author snippet embedded in post payloads. */
export interface PostAuthorDto {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
}

/** Single item in the home feed. */
export interface PostFeedItemDto {
  id: string;
  content: string;
  createdAt: string;
  author: PostAuthorDto;
  replyCount: number;
}

export interface PostFeedMeta {
  nextCursor: string | null;
}
