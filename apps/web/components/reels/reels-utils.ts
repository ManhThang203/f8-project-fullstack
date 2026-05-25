export { formatCount } from '@/lib/format-count';

/** Format milliseconds to mm:ss (e.g. 83000 → "1:23"). */
export function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
