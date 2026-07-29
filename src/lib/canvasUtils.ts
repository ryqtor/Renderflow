
/**
 * Adjusts canvas dimensions for high-DPI (Retina) screens to prevent blurry rendering.
 */
export function setupCanvasDpi(
  canvas: HTMLCanvasElement,
  width: number,
  height: number
): CanvasRenderingContext2D | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.scale(dpr, dpr);
  return ctx;
}

/**
 * Checks if a point is within the visible chart bounding box (viewport culling).
 */
export function isInViewport(
  x: number,
  y: number,
  width: number,
  height: number,
  padding: { top: number; right: number; bottom: number; left: number } = { top: 0, right: 0, bottom: 0, left: 0 }
): boolean {
  return (
    x >= padding.left &&
    x <= width - padding.right &&
    y >= padding.top &&
    y <= height - padding.bottom
  );
}

/**
 * Largest Triangle Three Buckets (LTTB) downsampling algorithm.
 * Reduces the dataset size while preserving visual characteristics (peaks and valleys).
 * Very efficient, running in O(N) time.
 */
export function downsampleLTTB<T extends { timestamp: number; value: number }>(
  data: T[],
  threshold: number
): T[] {
  const size = data.length;
  if (threshold >= size || threshold <= 2) {
    return data; // Nothing to downsample
  }

  const sampled: T[] = [];
  let sampledIndex = 0;

  // Always include first point
  sampled[sampledIndex++] = data[0];

  // Bucket size. Leave room for start and end data points
  const bucketSize = (size - 2) / (threshold - 2);

  let a = 0; // Current point A index
  let maxAreaPointOfNextBucket: T = data[0];
  let nextA = 0;

  for (let i = 0; i < threshold - 2; i++) {
    // Calculate point B (average) for the next bucket
    let avgX = 0;
    let avgY = 0;
    const avgRangeStart = Math.floor((i + 1) * bucketSize) + 1;
    const avgRangeEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, size);
    const avgRangeLength = avgRangeEnd - avgRangeStart;

    for (let j = avgRangeStart; j < avgRangeEnd; j++) {
      avgX += data[j].timestamp;
      avgY += data[j].value;
    }

    avgX /= avgRangeLength;
    avgY /= avgRangeLength;

    // Get the range for current bucket
    const rangeStart = Math.floor(i * bucketSize) + 1;
    const rangeEnd = Math.min(Math.floor((i + 1) * bucketSize) + 1, size);

    // Point A coordinates
    const pointA = data[a];
    const pointAX = pointA.timestamp;
    const pointAY = pointA.value;

    let maxArea = -1;

    for (let j = rangeStart; j < rangeEnd; j++) {
      // Calculate triangle area over three points: A, current point B, and average point C
      const area =
        Math.abs(
          (pointAX - avgX) * (data[j].value - pointAY) -
            (pointAX - data[j].timestamp) * (avgY - pointAY)
        ) * 0.5;

      if (area > maxArea) {
        maxArea = area;
        maxAreaPointOfNextBucket = data[j];
        nextA = j; // Next A is this selected point
      }
    }

    sampled[sampledIndex++] = maxAreaPointOfNextBucket;
    a = nextA;
  }

  // Always include last point
  sampled[sampledIndex++] = data[size - 1];

  return sampled;
}

/**
 * Double buffering helper to draw on an offscreen canvas first, then draw it to the visible canvas.
 * Reduces flickers and improves frame rate on old browsers or dense canvases.
 */
export class DoubleBuffer {
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;

  getCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const targetW = width * dpr;
    const targetH = height * dpr;

    if (!this.offscreenCanvas) {
      this.offscreenCanvas = document.createElement('canvas');
    }

    if (this.offscreenCanvas.width !== targetW || this.offscreenCanvas.height !== targetH) {
      this.offscreenCanvas.width = targetW;
      this.offscreenCanvas.height = targetH;
      this.offscreenCtx = this.offscreenCanvas.getContext('2d');
      if (this.offscreenCtx) {
        this.offscreenCtx.scale(dpr, dpr);
      }
    }

    return {
      canvas: this.offscreenCanvas,
      ctx: this.offscreenCtx!
    };
  }

  paintTo(visibleCtx: CanvasRenderingContext2D, width: number, height: number) {
    if (this.offscreenCanvas) {
      // Paint offscreen image to visible screen in one operations
      visibleCtx.drawImage(
        this.offscreenCanvas,
        0,
        0,
        this.offscreenCanvas.width,
        this.offscreenCanvas.height,
        0,
        0,
        width,
        height
      );
    }
  }
}

/**
 * Formats timestamps nicely for labels.
 */
export function formatTimeLabel(timestamp: number, showMs = false): string {
  const date = new Date(timestamp);
  const hrs = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  const secs = String(date.getSeconds()).padStart(2, '0');
  if (showMs) {
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    return `${hrs}:${mins}:${secs}.${ms}`;
  }
  return `${hrs}:${mins}:${secs}`;
}
