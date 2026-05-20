export function sameChatUserId(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  return a != null && b != null && a === b;
}
