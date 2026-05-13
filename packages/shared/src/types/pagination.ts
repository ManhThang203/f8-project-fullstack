/** Cursor-based pagination meta returned in API envelopes. */
export interface CursorPageMeta {
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
}

export interface OffsetPageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
