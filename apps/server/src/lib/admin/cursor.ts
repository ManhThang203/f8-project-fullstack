/**
 * Helper cursor phân trang ghép (createdAt, id) — khớp với orderBy createdAt desc.
 * Tránh lỗi orderBy theo createdAt nhưng lọc cursor theo id gây lặp/bỏ sót bản ghi.
 */

export type CreatedCursor = { createdAt: Date; id: string };

/** Mã hoá cặp (createdAt, id) thành chuỗi cursor base64 opaque. */
export function encodeCreatedCursor(row: CreatedCursor): string {
  const raw = `${row.createdAt.toISOString()}|${row.id}`;
  return Buffer.from(raw, 'utf8').toString('base64');
}

/** Giải mã cursor về cặp (createdAt, id); trả undefined khi rỗng hoặc hỏng. */
export function decodeCreatedCursor(cursor?: string): CreatedCursor | undefined {
  if (!cursor) return undefined;
  let raw: string;
  try {
    raw = Buffer.from(cursor, 'base64').toString('utf8');
  } catch {
    return undefined;
  }
  const sep = raw.lastIndexOf('|');
  if (sep <= 0) return undefined;
  const iso = raw.slice(0, sep);
  const id = raw.slice(sep + 1);
  const createdAt = new Date(iso);
  if (Number.isNaN(createdAt.getTime()) || !id) return undefined;
  return { createdAt, id };
}

/** Mảnh Prisma where lọc trang sau theo cặp (createdAt, id); undefined nếu không có cursor. */
export function createdCursorWhere(cursor?: string) {
  const c = decodeCreatedCursor(cursor);
  if (!c) return undefined;
  return {
    OR: [
      { createdAt: { lt: c.createdAt } },
      { createdAt: c.createdAt, id: { lt: c.id } },
    ],
  };
}

/** orderBy khớp với cursor ghép: createdAt desc, id desc. */
export const createdCursorOrderBy = [{ createdAt: 'desc' as const }, { id: 'desc' as const }];
