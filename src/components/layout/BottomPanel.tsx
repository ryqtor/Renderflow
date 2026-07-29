'use client';

import React from 'react';
import { useDashboard } from '../providers/DashboardProvider';
import { Terminal, Cpu, Clock, AlertTriangle, Database } from 'lucide-react';

export default function BottomPanel() {
  const { perfMetrics, logs, isStressTesting } = useDashboard();

  // Grab the 5 most recent live logs
  const recentLogs = logs.slice(-5).reverse();

  return (
    <footer className="w-full border-t border-border bg-card transition-colors duration-200">
      <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border">
        
        {/* Metric 1: Frame Paint Time */}
        <div className="flex items-center space-x-3.5 px-6 py-4">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Frame Render Time</div>
            <div className="flex items-baseline space-x-1.5">
              <span className="font-mono text-lg font-bold text-foreground">
                {perfMetrics.renderTime.toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground">ms</span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              {perfMetrics.renderTime > 16.67 ? '⚠️ Exceeds 60fps budget' : '✓ Within 60fps budget'}
            </div>
          </div>
        </div>

        {/* Metric 2: Worker Stats Processing Time */}
        <div className="flex items-center space-x-3.5 px-6 py-4">
          <Cpu className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Worker Thread Latency</div>
            <div className="flex items-baseline space-x-1.5">
              <span className="font-mono text-lg font-bold text-foreground">
                {perfMetrics.processingTime.toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground">ms</span>
            </div>
            <div className="text-[10px] text-muted-foreground">Offloaded computations</div>
          </div>
        </div>

        {/* Metric 3: Dropped Frames */}
        <div className="flex items-center space-x-3.5 px-6 py-4">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Dropped Frames</div>
            <div className="flex items-baseline space-x-1.5">
              <span className={`font-mono text-lg font-bold ${perfMetrics.droppedFrames > 10 ? 'text-amber-500' : 'text-foreground'}`}>
                {perfMetrics.droppedFrames}
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground">Accumulated delta drops</div>
          </div>
        </div>

        {/* Metric 4: Sliding Window Points count */}
        <div className="flex items-center space-x-3.5 px-6 py-4">
          <Database className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Active Memory Points</div>
            <div className="flex items-baseline space-x-1.5">
              <span className="font-mono text-lg font-bold text-foreground">
                {perfMetrics.totalPoints.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">pts</span>
            </div>
            <div className="text-[10px] text-muted-foreground">Sliding queue size</div>
          </div>
        </div>
      </div>

      {/* Mini console output */}
      <div className="border-t border-border bg-muted/30 px-6 py-2.5 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-2 text-muted-foreground">
          <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold text-foreground">Console Log:</span>
          {recentLogs.length > 0 ? (
            <span className="text-[11px] truncate max-w-xl text-muted-foreground">
              [{new Date(recentLogs[0].timestamp).toLocaleTimeString()}] [{recentLogs[0].category.toUpperCase()}] {recentLogs[0].message}
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground">Engine connected. Waiting for logs...</span>
          )}
        </div>
        <div className="text-[10px] text-muted-foreground font-sans">
          {isStressTesting ? 'STRESS_MODE_RUNNING' : 'SYSTEM_OK'}
        </div>
      </div>
    </footer>
  );
}
