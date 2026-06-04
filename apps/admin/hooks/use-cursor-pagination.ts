import { useState } from 'react';

export function useCursorPagination(defaultLimit = 10) {
  const [limit, setLimit] = useState(defaultLimit);
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);

  const cursor = cursorHistory[pageIndex];

  const handleNext = (nextCursor: string | null | undefined) => {
    if (!nextCursor) return;
    setCursorHistory((prev) => {
      const copy = [...prev];
      copy[pageIndex + 1] = nextCursor;
      return copy;
    });
    setPageIndex((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (pageIndex > 0) {
      setPageIndex((prev) => prev - 1);
    }
  };

  const reset = () => {
    setCursorHistory([undefined]);
    setPageIndex(0);
  };

  return {
    limit,
    setLimit: (newLimit: number) => {
      setLimit(newLimit);
      reset();
    },
    cursor,
    pageIndex,
    handleNext,
    handlePrev,
    reset,
  };
}
