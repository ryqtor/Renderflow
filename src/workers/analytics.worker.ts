import { DataPoint, AggregatedStats } from '../types/dashboard';

// We inline the LTTB function in the worker to make it completely self-contained and avoid import resolution errors in workers.
function lttbDownsample<T extends { timestamp: number; value: number }>(
  data: T[],
  threshold: number
): T[] {
  const size = data.length;
  if (threshold >= size || threshold <= 2) {
    return data;
  }

  const sampled: T[] = [];
  let sampledIndex = 0;
  sampled[sampledIndex++] = data[0];

  const bucketSize = (size - 2) / (threshold - 2);
  let a = 0;
  let maxAreaPointOfNextBucket: T = data[0];
  let nextA = 0;

  for (let i = 0; i < threshold - 2; i++) {
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

    const rangeStart = Math.floor(i * bucketSize) + 1;
    const rangeEnd = Math.min(Math.floor((i + 1) * bucketSize) + 1, size);

    const pointA = data[a];
    const pointAX = pointA.timestamp;
    const pointAY = pointA.value;

    let maxArea = -1;

    for (let j = rangeStart; j < rangeEnd; j++) {
      const area =
        Math.abs(
          (pointAX - avgX) * (data[j].value - pointAY) -
            (pointAX - data[j].timestamp) * (avgY - pointAY)
        ) * 0.5;

      if (area > maxArea) {
        maxArea = area;
        maxAreaPointOfNextBucket = data[j];
        nextA = j;
      }
    }

    sampled[sampledIndex++] = maxAreaPointOfNextBucket;
    a = nextA;
  }

  sampled[sampledIndex++] = data[size - 1];
  return sampled;
}

self.onmessage = (event: MessageEvent) => {
  const startTime = performance.now();
  const { action, payload } = event.data;

  if (action === 'analyze') {
    const data = payload.data as DataPoint[];
    const threshold = payload.downsampleThreshold || 1000;

    if (!data || data.length === 0) {
      self.postMessage({
        action: 'analyze_result',
        payload: {
          stats: null,
          downsampledLineData: [],
          heatmapData: [],
          duration: 0
        }
      });
      return;
    }

    const n = data.length;
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    let cpuSum = 0;
    let memSum = 0;
    let netSum = 0;
    let latSum = 0;

    for (let i = 0; i < n; i++) {
      const pt = data[i];
      sum += pt.value;
      if (pt.value < min) min = pt.value;
      if (pt.value > max) max = pt.value;
      cpuSum += pt.cpu;
      memSum += pt.memory;
      netSum += pt.network;
      latSum += pt.latency;
    }

    const mean = sum / n;
    const cpuAvg = cpuSum / n;
    const memAvg = memSum / n;
    const networkAvg = netSum / n;
    const latencyAvg = latSum / n;

    // Standard deviation
    let varianceSum = 0;
    for (let i = 0; i < n; i++) {
      varianceSum += Math.pow(data[i].value - mean, 2);
    }
    const stdDev = Math.sqrt(varianceSum / n);

    // Anomalies detection (values beyond 2.5 standard deviations)
    const upperLimit = mean + 2.5 * stdDev;
    const lowerLimit = mean - 2.5 * stdDev;
    let anomaliesCount = 0;

    for (let i = 0; i < n; i++) {
      const val = data[i].value;
      if (val > upperLimit || val < lowerLimit) {
        anomaliesCount++;
      }
    }

    const stats: AggregatedStats = {
      mean: parseFloat(mean.toFixed(2)),
      min: parseFloat(min.toFixed(2)),
      max: parseFloat(max.toFixed(2)),
      stdDev: parseFloat(stdDev.toFixed(2)),
      anomaliesCount,
      cpuAvg: parseFloat(cpuAvg.toFixed(1)),
      memAvg: parseFloat(memAvg.toFixed(1)),
      networkAvg: parseFloat(networkAvg.toFixed(2)),
      latencyAvg: parseFloat(latencyAvg.toFixed(1))
    };

    // 2. Downsample line chart points
    const mappedLinePoints = data.map(pt => ({
      timestamp: pt.timestamp,
      value: pt.value
    }));
    const downsampledLineData = lttbDownsample(mappedLinePoints, threshold);

    // 3. Heatmap grouping (Region vs Latency groups)
    // Latency ranges: 0-50 (low), 50-100 (med-low), 100-150 (medium), 150-200 (high), 200+ (critical)
    const latencyBuckets = [50, 100, 150, 200];
    const regions = ['us-east-1', 'us-west-2', 'eu-central-1', 'ap-northeast-1', 'sa-east-1'];
    
    // Initialize matrix
    const matrix: Record<string, Record<number, number>> = {};
    regions.forEach(r => {
      matrix[r] = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
    });

    for (let i = 0; i < n; i++) {
      const pt = data[i];
      const r = pt.region;
      if (!matrix[r]) continue;

      let bIdx = 4; // default critical
      for (let b = 0; b < latencyBuckets.length; b++) {
        if (pt.latency <= latencyBuckets[b]) {
          bIdx = b;
          break;
        }
      }
      matrix[r][bIdx]++;
    }

    const heatmapData: { region: string; latencyBucket: number; count: number }[] = [];
    regions.forEach(r => {
      for (let b = 0; b < 5; b++) {
        heatmapData.push({
          region: r,
          latencyBucket: b,
          count: matrix[r][b]
        });
      }
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    self.postMessage({
      action: 'analyze_result',
      payload: {
        stats,
        downsampledLineData,
        heatmapData,
        duration: parseFloat(duration.toFixed(2))
      }
    });
  }
};
