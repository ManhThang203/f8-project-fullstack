/** Chiều cao tối đa khung media trong feed (px). */
export const MAX_FRAME_HEIGHT_PX = 520;
/** Tỉ lệ khung tối thiểu (4:5). */
export const MIN_ASPECT = 4 / 5;
/** Tỉ lệ khung tối đa (16:9). */
export const MAX_ASPECT = 16 / 9;

/** Clamp tỉ lệ khung về khoảng cho phép (4:5 … 16:9). */
export function clampAspect(ratio: number): number {
  return Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, ratio));
}

/** Lấy tỉ lệ width/height từ metadata media; null nếu thiếu hoặc không hợp lệ. */
export function getFrameAspectFromSize(
  width?: number | null,
  height?: number | null,
): number | null {
  if (width && height && width > 0 && height > 0) return width / height;
  return null;
}

/** Tỉ lệ đã clamp để gán CSS aspect-ratio (thiếu metadata → 1). */
export function resolveFrameAspectRatio(
  width?: number | null,
  height?: number | null,
): number {
  const raw = getFrameAspectFromSize(width, height);
  if (!raw || raw <= 0) return 1;
  return clampAspect(raw);
}
