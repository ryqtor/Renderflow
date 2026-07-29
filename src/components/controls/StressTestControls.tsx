'use client';

import React from 'react';
import { useDashboard } from '../providers/DashboardProvider';
import { Zap, Loader2, Play } from 'lucide-react';

export default function StressTestControls() {
  const { runStressTest, isStressTesting, benchmarkResult } = useDashboard();

  return (
    <div className="space-y-6">
      {/* Benchmark Control Bar */}
      <div className="rounded-xl border border-border bg-card p-6 transition-all">
        <h3 className="text-sm font-semibold text-foreground flex items-center">
          <Zap className="h-4 w-4 mr-2 text-amber-500 fill-amber-500/20" />
          Engine Load & Stress Benchmarking
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Simulate loading extreme dataset volumes synchronously, testing Web Worker downsampling efficiency and Canvas batch drawing speeds.
        </p>

        {/* Control Buttons Group */}
        <div className="mt-6 flex flex-wrap gap-3">
          {[10000, 25000, 50000, 100000].map(count => (
            <button
              key={count}
              disabled={isStressTesting}
              onClick={() => runStressTest(count)}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-xs font-semibold text-foreground transition-all hover:bg-muted disabled:opacity-50"
            >
              {isStressTesting ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-3 w-3 text-muted-foreground" />
                  Load {(count / 1000).toFixed(0)}k points
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Benchmark Results */}
      {benchmarkResult && (
        <div className="rounded-xl border border-border bg-card p-6 transition-all">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Benchmark Results Dashboard</h4>
          
          <div className="overflow-hidden rounded-lg border border-border bg-background">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-[10px] uppercase font-semibold text-muted-foreground h-9">
                  <th className="px-4">Metric Dimension</th>
                  <th className="px-4 text-right">Value Performance</th>
                  <th className="px-4">Performance Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono">
                <tr className="h-9">
                  <td className="px-4 text-foreground font-sans">Simulated Points Count</td>
                  <td className="px-4 text-right font-bold text-foreground">{benchmarkResult.pointsCount.toLocaleString()} pts</td>
                  <td className="px-4 font-sans text-muted-foreground">High volume array load</td>
                </tr>
                <tr className="h-9">
                  <td className="px-4 text-foreground font-sans">Web Worker Aggregations</td>
                  <td className="px-4 text-right font-bold text-foreground">{benchmarkResult.processingTime.toFixed(1)} ms</td>
                  <td className="px-4 font-sans">
                    <span className="rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                      Excellent (Offloaded)
                    </span>
                  </td>
                </tr>
                <tr className="h-9">
                  <td className="px-4 text-foreground font-sans">Canvas Batch Paint Duration</td>
                  <td className="px-4 text-right font-bold text-foreground">{benchmarkResult.renderTime.toFixed(1)} ms</td>
                  <td className="px-4 font-sans">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase border ${
                      benchmarkResult.renderTime <= 8 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                        : benchmarkResult.renderTime <= 16.67
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                          : 'bg-red-500/10 border-red-500/20 text-red-500'
                    }`}>
                      {benchmarkResult.renderTime <= 8 
                        ? 'Exceptional' 
                        : benchmarkResult.renderTime <= 16.67
                          ? 'Budget Compliant'
                          : 'Frame Drop danger'}
                    </span>
                  </td>
                </tr>
                <tr className="h-9">
                  <td className="px-4 text-foreground font-sans">Estimated Rendering Frame-rate</td>
                  <td className="px-4 text-right font-bold text-foreground">~{benchmarkResult.fps} FPS</td>
                  <td className="px-4 font-sans">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase border ${
                      benchmarkResult.fps >= 58
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                    }`}>
                      {benchmarkResult.fps >= 58 ? 'Stable Fluid' : 'Minor Jitter'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-4 rounded-lg bg-muted/40 text-xs text-muted-foreground border border-border font-sans">
            <strong>System Telemetry Note:</strong> Next.js App Router renders pages within client environments. All benchmark speeds depend directly on client machine specifications (GPU/CPU single core performance) and browser engine JavaScript engines optimization.
          </div>
        </div>
      )}
    </div>
  );
}
