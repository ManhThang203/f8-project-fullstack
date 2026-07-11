import { AppError } from '../errors.js';

/**
 * Cursor phân trang dùng chung cho feed/list (base64url JSON `{t,id}`).
 * Ghép (createdAt, id) để tie-break khi nhiều bản ghi cùng createdAt.
 */

export type CursorParts = { createdAt: Date; id: string };

/** Mã hoá cursor (createdAt + id) thành base64url an toàn cho URL. */
export function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ t: createdAt.toISOString(), id }), 'utf8').toString(
    'base64url',
  );
}

/** Giải mã cursor; ném 400 nếu chuỗi không hợp lệ. */
export function decodeCursor(cursor: string): CursorParts {
  try {
    const raw = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
      t?: string;
      id?: string;
    };
    if (!raw.t || !raw.id) throw new Error('invalid cursor shape');
    return { createdAt: new Date(raw.t), id: raw.id };
  } catch {
    throw AppError.badRequest('Cursor phân trang không hợp lệ');
  }
}

/**
 * Cắt trang kết quả (offset-bằng-cursor): từ `rows` lấy đủ `limit` phần tử,
 * xác định `nextCursor` nếu còn dữ liệu tiếp theo.
 */
export function paginate<TRow>(
  rows: TRow[],
  limit: number,
  getCursorParts: (row: TRow) => CursorParts,
): { page: TRow[]; nextCursor: string | null } {
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const tail = page[page.length - 1];
  const nextCursor =
    hasMore && tail ? encodeCursor(getCursorParts(tail).createdAt, getCursorParts(tail).id) : null;
  return { page, nextCursor };
}
