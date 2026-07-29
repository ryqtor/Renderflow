'use client';

import React from 'react';
import { useDashboard } from '../providers/DashboardProvider';
import { useFps } from '../../hooks/useFps';
import { Activity, Clock, ShieldAlert, Cpu } from 'lucide-react';

export default function PerformanceMonitor() {
  const { perfMetrics, isStressTesting, rawData } = useDashboard();
  const { fps, droppedFrames } = useFps();

  // Color alerts
  const getFpsColor = (f: number) => {
    if (f >= 58) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    if (f >= 45) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    return 'text-red-500 bg-red-500/10 border-red-500/20';
  };

  const getRenderTimeColor = (ms: number) => {
    if (ms <= 8) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    if (ms <= 16.67) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    return 'text-red-500 bg-red-500/10 border-red-500/20';
  };

  const heapPct = perfMetrics.memoryLimit > 0
    ? (perfMetrics.memoryUsage / perfMetrics.memoryLimit) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Overview status bar */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-6 py-4 transition-all">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Performance Profiling Console</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Real-time telemetry of the client-side Canvas and Worker threads.</p>
        </div>
        <div className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider flex items-center space-x-1.5 ${
          isStressTesting ? 'text-amber-500 bg-amber-500/10 border-amber-500/20 animate-pulse' : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
        }`}>
          <span className="relative flex h-1.5 w-1.5">
            <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 bg-current ${isStressTesting ? 'animate-ping' : ''}`}></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current"></span>
          </span>
          <span>{isStressTesting ? 'Executing Stress Benchmark' : 'Nominal Operations'}</span>
        </div>
      </div>

      {/* Profile Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: FPS */}
        <div className="rounded-xl border border-border bg-card p-5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Frame Rate</span>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="font-mono text-3xl font-bold tracking-tight text-foreground">{fps}</span>
            <span className="text-xs text-muted-foreground">FPS</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold ${getFpsColor(fps)}`}>
              {fps >= 58 ? 'Stable 60Hz' : fps >= 45 ? 'Minor Drops' : 'Degraded Performance'}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">Budget: 16.6ms</span>
          </div>
        </div>

        {/* Card 2: Paint Time */}
        <div className="rounded-xl border border-border bg-card p-5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Canvas Paint</span>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="font-mono text-3xl font-bold tracking-tight text-foreground">
              {perfMetrics.renderTime.toFixed(1)}
            </span>
            <span className="text-xs text-muted-foreground">ms</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold ${getRenderTimeColor(perfMetrics.renderTime)}`}>
              {perfMetrics.renderTime <= 8 ? 'Efficient (<8ms)' : perfMetrics.renderTime <= 16.67 ? 'Warning' : 'Critical'}
            </span>
            <span className="text-[10px] text-muted-foreground">Double-buffered</span>
          </div>
        </div>

        {/* Card 3: Worker Computing Latency */}
        <div className="rounded-xl border border-border bg-card p-5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Worker Thread</span>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="font-mono text-3xl font-bold tracking-tight text-foreground">
              {perfMetrics.processingTime.toFixed(1)}
            </span>
            <span className="text-xs text-muted-foreground">ms</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="inline-flex rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-bold text-foreground">
              {perfMetrics.processingTime < 10 ? 'Optimal' : 'Active'}
            </span>
            <span className="text-[10px] text-muted-foreground">LTTB / Grid counts</span>
          </div>
        </div>

        {/* Card 4: Accumulated Dropped Frames */}
        <div className="rounded-xl border border-border bg-card p-5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dropped Frames</span>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className={`font-mono text-3xl font-bold tracking-tight ${droppedFrames > 100 ? 'text-amber-500' : 'text-foreground'}`}>
              {droppedFrames}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="inline-flex rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-bold text-foreground">
              {droppedFrames === 0 ? 'Flawless' : 'Accumulated'}
            </span>
            <span className="text-[10px] text-muted-foreground">Budget violations</span>
          </div>
        </div>
      </div>

      {/* Memory Diagnostics Console */}
      <div className="rounded-xl border border-border bg-card p-6 transition-all">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Memory Diagnostics & Sliding Queue</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div>
            <div className="text-xs text-muted-foreground">Used JS Heap Space</div>
            <div className="mt-2 font-mono text-2xl font-bold text-foreground">
              {perfMetrics.memoryUsage > 0 ? `${perfMetrics.memoryUsage} MB` : 'Browser API Locked'}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Active memory assigned to JavaScript execution pool.</p>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Queue Buffer capacity</div>
            <div className="mt-2 font-mono text-2xl font-bold text-foreground">
              {rawData.length.toLocaleString()} / 5,000 pts
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Sliding time-series memory queue preventing leak overflows.</p>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">JS Heap Limit Allocation</div>
            <div className="mt-2 font-mono text-2xl font-bold text-foreground">
              {perfMetrics.memoryLimit > 0 ? `${perfMetrics.memoryLimit} MB` : 'Browser API Locked'}
            </div>
            {perfMetrics.memoryLimit > 0 && (
              <div className="mt-3 w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, heapPct)}%` }}
                />
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
