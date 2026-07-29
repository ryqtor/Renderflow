export interface DataPoint {
  timestamp: number;
  value: number;
  category: string;
  sensor: string;
  cpu: number;
  memory: number;
  network: number;
  disk: number;
  temperature: number;
  latency: number;
  region: string;
}

export interface ChartDimensions {
  width: number;
  height: number;
}

export interface ViewportRange {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface PerformanceMetrics {
  fps: number;
  renderTime: number;        // in ms
  processingTime: number;    // in ms
  droppedFrames: number;
  memoryUsage: number;       // in MB, from performance.memory
  memoryLimit: number;       // in MB
  workerTime: number;        // time worker spent aggregating in ms
  totalPoints: number;       // number of points in sliding window
}

export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  category: string;
  latency: number;
  cpu: number;
}

export interface AggregatedStats {
  mean: number;
  min: number;
  max: number;
  stdDev: number;
  anomaliesCount: number;
  cpuAvg: number;
  memAvg: number;
  networkAvg: number;
  latencyAvg: number;
}

export type ActiveTab = 'dashboard' | 'live-charts' | 'heatmap' | 'analytics' | 'performance' | 'stress-test' | 'settings';
