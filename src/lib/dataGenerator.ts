import { DataPoint } from '../types/dashboard';

const CATEGORIES = ['auth', 'payment', 'search', 'checkout', 'api'];
const SENSORS = ['sensor-alpha', 'sensor-beta', 'sensor-gamma', 'sensor-delta'];
const REGIONS = ['us-east-1', 'us-west-2', 'eu-central-1', 'ap-northeast-1', 'sa-east-1'];

// Helper to get random item
const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Random walk states to make the values look smooth and continuous
let lastValue = 50;
let lastCpu = 25;
let lastMem = 35;
let lastTemp = 42;

export function generateSinglePoint(timestamp: number = Date.now()): DataPoint {
  // Random walk with drift back to mean
  const valueDrift = (50 - lastValue) * 0.05;
  const valueChange = (Math.random() - 0.5) * 6 + valueDrift;
  lastValue = Math.max(10, Math.min(100, lastValue + valueChange));

  // CPU walk - diurnal pattern simulated with sine wave + random noise
  const hour = new Date(timestamp).getHours();
  const baseCpu = 20 + 30 * Math.sin((hour / 24) * 2 * Math.PI - Math.PI / 2) + 25; // 15% to 75%
  const cpuDrift = (baseCpu - lastCpu) * 0.1;
  const cpuChange = (Math.random() - 0.5) * 10 + cpuDrift;
  lastCpu = Math.max(5, Math.min(99, lastCpu + cpuChange));

  // Memory walk - slowly changes with occasional jumps/leaks simulation
  const memDrift = (55 - lastMem) * 0.02;
  const memChange = (Math.random() - 0.48) * 2 + memDrift; // slight positive bias
  lastMem = Math.max(15, Math.min(95, lastMem + memChange));

  // Latency is highly correlated with CPU usage and network traffic, plus random spikes
  const isSpike = Math.random() > 0.97;
  const baseLatency = 15 + lastCpu * 1.5;
  const latency = Math.round(isSpike ? baseLatency * (3 + Math.random() * 2) : baseLatency + (Math.random() - 0.5) * 8);

  // Network (MB/s) - correlated with CPU
  const network = Math.max(0.5, (lastCpu * 0.8 + Math.random() * 15));

  // Disk (%)
  const disk = Math.max(1, Math.min(100, Math.round(10 + Math.random() * 20 + (lastCpu > 80 ? Math.random() * 40 : 0))));

  // Temperature (°C) - slowly tracks CPU with heat retention
  const targetTemp = 35 + lastCpu * 0.4;
  lastTemp = lastTemp + (targetTemp - lastTemp) * 0.05 + (Math.random() - 0.5) * 0.5;

  return {
    timestamp,
    value: parseFloat(lastValue.toFixed(2)),
    category: pickRandom(CATEGORIES),
    sensor: pickRandom(SENSORS),
    cpu: parseFloat(lastCpu.toFixed(1)),
    memory: parseFloat(lastMem.toFixed(1)),
    network: parseFloat(network.toFixed(2)),
    disk: parseFloat(disk.toFixed(1)),
    temperature: parseFloat(lastTemp.toFixed(1)),
    latency,
    region: pickRandom(REGIONS)
  };
}

export function generateInitialHistory(count: number, intervalMs: number = 100): DataPoint[] {
  const points: DataPoint[] = new Array(count);
  let currentTimestamp = Date.now() - count * intervalMs;

  for (let i = 0; i < count; i++) {
    points[i] = generateSinglePoint(currentTimestamp);
    currentTimestamp += intervalMs;
  }

  return points;
}
