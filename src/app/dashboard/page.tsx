'use client';

import React from 'react';
import { useDashboard } from '../../components/providers/DashboardProvider';
import LineChart from '../../components/charts/LineChart';
import BarChart from '../../components/charts/BarChart';
import ScatterPlot from '../../components/charts/ScatterPlot';
import HeatmapChart from '../../components/charts/HeatmapChart';
import VirtualizedTable from '../../components/ui/VirtualizedTable';
import PerformanceMonitor from '../../components/controls/PerformanceMonitor';
import StressTestControls from '../../components/controls/StressTestControls';
import { Cpu, Server, Signal, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function DashboardPage() {
  const {
    activeTab,
    stats,
    setStreamSpeed,
    streamSpeed,
    clearLogs,
    isStressTesting
  } = useDashboard();

  // Helper stats values
  const avgCpu = stats?.cpuAvg ?? 0;
  const avgMem = stats?.memAvg ?? 0;
  const avgNet = stats?.networkAvg ?? 0;
  const avgLat = stats?.latencyAvg ?? 0;
  const anomalyCount = stats?.anomaliesCount ?? 0;

  // View switch render
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {/* Overview Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {/* CPU Stat Card */}
              <div className="rounded-xl border border-border bg-card p-4 transition-all">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[10px] uppercase font-bold tracking-wider">Average CPU</span>
                  <Cpu className="h-3.5 w-3.5" />
                </div>
                <div className="mt-2 flex items-baseline space-x-1">
                  <span className="font-mono text-2xl font-bold text-foreground">
                    {avgCpu > 0 ? `${avgCpu.toFixed(1)}%` : 'Loading...'}
                  </span>
                </div>
              </div>

              {/* Memory Stat Card */}
              <div className="rounded-xl border border-border bg-card p-4 transition-all">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[10px] uppercase font-bold tracking-wider">Average RAM</span>
                  <Server className="h-3.5 w-3.5" />
                </div>
                <div className="mt-2 flex items-baseline space-x-1">
                  <span className="font-mono text-2xl font-bold text-foreground">
                    {avgMem > 0 ? `${avgMem.toFixed(1)}%` : 'Loading...'}
                  </span>
                </div>
              </div>

              {/* Network Stat Card */}
              <div className="rounded-xl border border-border bg-card p-4 transition-all">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[10px] uppercase font-bold tracking-wider">Net Speed</span>
                  <Signal className="h-3.5 w-3.5" />
                </div>
                <div className="mt-2 flex items-baseline space-x-1">
                  <span className="font-mono text-2xl font-bold text-foreground">
                    {avgNet > 0 ? `${avgNet.toFixed(1)} MB/s` : 'Loading...'}
                  </span>
                </div>
              </div>

              {/* Latency Stat Card */}
              <div className="rounded-xl border border-border bg-card p-4 transition-all">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[10px] uppercase font-bold tracking-wider">Avg Latency</span>
                  <span className="text-xs font-mono font-bold text-muted-foreground">ms</span>
                </div>
                <div className="mt-2 flex items-baseline space-x-1">
                  <span className="font-mono text-2xl font-bold text-foreground">
                    {avgLat > 0 ? `${Math.round(avgLat)}ms` : 'Loading...'}
                  </span>
                </div>
              </div>

              {/* Anomalies Stat Card */}
              <div className="rounded-xl border border-border bg-card p-4 transition-all col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[10px] uppercase font-bold tracking-wider">Anomalies</span>
                  <AlertTriangle className={`h-3.5 w-3.5 ${anomalyCount > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
                </div>
                <div className="mt-2 flex items-baseline space-x-1">
                  <span className={`font-mono text-2xl font-bold ${anomalyCount > 0 ? 'text-amber-500' : 'text-foreground'}`}>
                    {anomalyCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Charts Grid - 2x2 layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LineChart />
              <BarChart />
              <ScatterPlot />
              <HeatmapChart />
            </div>

            {/* Logs Table */}
            <div className="h-[450px]">
              <VirtualizedTable />
            </div>
          </div>
        );

      case 'live-charts':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-foreground">Live Telemetry Visualizations</h2>
              <p className="text-xs text-muted-foreground">High-frequency canvas renders displaying time-series metrics and aggregated data.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LineChart />
              <BarChart />
            </div>
          </div>
        );

      case 'heatmap':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-foreground">Latency Density Distribution Matrix</h2>
              <p className="text-xs text-muted-foreground">Binned regional cluster counts detailing distribution shapes across distinct latency scales.</p>
            </div>
            <div className="max-w-4xl mx-auto">
              <HeatmapChart />
            </div>
          </div>
        );

      case 'analytics':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-foreground">Web Worker Analytics & Statistics</h2>
              <p className="text-xs text-muted-foreground">Offloaded computations from the main thread calculating standard deviations and thresholds.</p>
            </div>
            
            {stats ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="rounded-xl border border-border bg-card p-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Value Statistics</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between border-b border-border pb-2">
                      <span className="text-xs text-muted-foreground">Arithmetic Mean</span>
                      <span className="font-mono font-bold text-foreground">{stats.mean.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-b border-border pb-2">
                      <span className="text-xs text-muted-foreground">Standard Deviation (σ)</span>
                      <span className="font-mono font-bold text-foreground">{stats.stdDev.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-b border-border pb-2">
                      <span className="text-xs text-muted-foreground">Minimum Peak Value</span>
                      <span className="font-mono font-bold text-foreground">{stats.min.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-b border-border pb-2">
                      <span className="text-xs text-muted-foreground">Maximum Peak Value</span>
                      <span className="font-mono font-bold text-foreground">{stats.max.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Anomalous Spike Logs</h4>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 rounded-lg bg-muted/50 border border-border p-3">
                      <ShieldAlert className={`h-5 w-5 ${anomalyCount > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
                      <div>
                        <div className="text-xs font-semibold text-foreground">
                          {anomalyCount > 0 ? `${anomalyCount} Anomaly points found` : 'No anomalies detected'}
                        </div>
                        <p className="text-[10px] text-muted-foreground">Threshold bounds: μ ± 2.5σ</p>
                      </div>
                    </div>
                    <div className="text-[11px] text-muted-foreground space-y-1">
                      <p>• Normal bounds: {(stats.mean - 2.5 * stats.stdDev).toFixed(1)} to {(stats.mean + 2.5 * stats.stdDev).toFixed(1)}</p>
                      <p>• Worker screens raw tick streams in O(N) complexity</p>
                      <p>• Flagged values update in bottom logs console</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Regional Aggregations</h4>
                  <div className="space-y-4 font-mono text-xs">
                    <div className="flex justify-between border-b border-border pb-2">
                      <span className="font-sans text-muted-foreground">us-east-1</span>
                      <span className="font-bold text-foreground">Avg Latency ~120ms</span>
                    </div>
                    <div className="flex justify-between border-b border-border pb-2">
                      <span className="font-sans text-muted-foreground">us-west-2</span>
                      <span className="font-bold text-foreground">Avg Latency ~90ms</span>
                    </div>
                    <div className="flex justify-between border-b border-border pb-2">
                      <span className="font-sans text-muted-foreground">eu-central-1</span>
                      <span className="font-bold text-foreground">Avg Latency ~160ms</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 rounded-xl border border-border bg-card text-muted-foreground text-xs">
                Computing analytics in Worker...
              </div>
            )}
          </div>
        );

      case 'performance':
        return <PerformanceMonitor />;

      case 'stress-test':
        return <StressTestControls />;

      case 'settings':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-foreground">System Configurations</h2>
              <p className="text-xs text-muted-foreground">Configure stream speed settings and debug console parameters.</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 max-w-xl space-y-6">
              {/* Speed slider */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground flex justify-between">
                  <span>Stream Refresh Interval</span>
                  <span className="font-mono text-muted-foreground">{streamSpeed} ms</span>
                </label>
                <input
                  type="range"
                  min="50"
                  max="1000"
                  step="50"
                  value={streamSpeed}
                  onChange={e => setStreamSpeed(Number(e.target.value))}
                  disabled={isStressTesting}
                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <p className="text-[10px] text-muted-foreground">Decreasing the interval triggers faster data updates, increasing CPU demand.</p>
              </div>

              <span className="block h-px bg-border w-full"></span>

              {/* Logs action */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground">Flush Logs Buffer</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Clear all telemetry and historical logs inside virtual table.</p>
                </div>
                <button
                  onClick={clearLogs}
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground hover:bg-muted transition-all"
                >
                  Flush Logs
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return <>{renderTabContent()}</>;
}
