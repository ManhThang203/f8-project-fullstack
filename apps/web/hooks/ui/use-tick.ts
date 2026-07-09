import { useEffect, useState } from 'react';

/** Tick định kỳ để component re-render text thời gian tương đối (vd. "3 phút trước"). */
export function useTick(intervalMs = 60_000): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
    }, intervalMs);

    return () => clearInterval(id);
  }, [intervalMs]);

  return tick;
}
