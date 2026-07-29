import { useState, useMemo, useCallback } from 'react';

interface UseVirtualScrollProps {
  itemCount: number;
  rowHeight: number;
  containerHeight: number;
  overscan?: number;
}

export function useVirtualScroll({
  itemCount,
  rowHeight,
  containerHeight,
  overscan = 10
}: UseVirtualScrollProps) {
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const virtualInfo = useMemo(() => {
    const totalHeight = itemCount * rowHeight;

    // Calculate start index with overscan
    let startIndex = Math.floor(scrollTop / rowHeight);
    startIndex = Math.max(0, startIndex - overscan);

    // Calculate end index with overscan
    let endIndex = Math.ceil((scrollTop + containerHeight) / rowHeight);
    endIndex = Math.min(itemCount, endIndex + overscan);

    // Calculate offsets
    const topSpacerHeight = startIndex * rowHeight;
    const bottomSpacerHeight = Math.max(0, totalHeight - endIndex * rowHeight);

    // Generate indices to render
    const indices: number[] = [];
    for (let i = startIndex; i < endIndex; i++) {
      indices.push(i);
    }

    return {
      startIndex,
      endIndex,
      topSpacerHeight,
      bottomSpacerHeight,
      indices,
      totalHeight
    };
  }, [scrollTop, itemCount, rowHeight, containerHeight, overscan]);

  const scrollTo = useCallback((index: number) => {
    // This helper can be invoked if we attach a ref to the container
    const targetScrollTop = index * rowHeight;
    return targetScrollTop;
  }, [rowHeight]);

  return {
    ...virtualInfo,
    onScroll: handleScroll,
    scrollTo
  };
}
