'use client';

import React from 'react';
import { useDashboard } from '../providers/DashboardProvider';
import { useFps } from '../../hooks/useFps';
import { Sun, Moon, Play, Pause, Activity } from 'lucide-react';

export default function Header() {
  const {
    isStreaming,
    setIsStreaming,
    theme,
    toggleTheme,
    perfMetrics,
    isStressTesting
  } = useDashboard();

  // Active FPS tracker
  const { fps } = useFps();

  // Format memory
  const memoryText = perfMetrics.memoryUsage > 0 ? `${perfMetrics.memoryUsage} MB` : 'N/A';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/85 backdrop-blur-md transition-colors duration-200">
      <div className="flex h-14 items-center justify-between px-6">
        {/* Logo and Brand */}
        <div className="flex items-center space-x-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-foreground font-semibold text-sm">
            R
          </div>
          <div>
            <span className="font-semibold text-foreground tracking-tight text-sm md:text-base">Renderflow</span>
            <span className="ml-2 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground uppercase font-medium">
              v1.0
            </span>
          </div>
        </div>

        {/* Live Metrics & Actions */}
        <div className="flex items-center space-x-4">
          {/* FPS Indicator */}
          <div className="hidden items-center space-x-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs md:flex">
            <Activity className="h-3 w-3 text-muted-foreground animate-pulse" />
            <span className="text-muted-foreground">FPS:</span>
            <span className={`font-mono font-semibold ${fps > 55 ? 'text-chart-2' : fps > 40 ? 'text-chart-3' : 'text-chart-5'}`}>
              {fps}
            </span>
          </div>

          {/* Memory Usage */}
          <div className="hidden items-center space-x-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs md:flex">
            <span className="text-muted-foreground">RAM:</span>
            <span className="font-mono font-semibold text-foreground">
              {memoryText}
            </span>
          </div>

          {/* Connection Status Indicator */}
          <div className="flex items-center space-x-2 rounded-full border border-border bg-background px-3 py-1 text-xs">
            <span className={`relative flex h-2 w-2`}>
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isStreaming ? 'animate-ping bg-emerald-400' : 'bg-amber-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                isStreaming ? 'bg-emerald-500' : 'bg-amber-500'
              }`}></span>
            </span>
            <span className="font-medium text-foreground">
              {isStressTesting ? 'Stress Testing' : isStreaming ? 'Live' : 'Paused'}
            </span>
          </div>

          {/* Stream control button */}
          <button
            onClick={() => setIsStreaming(!isStreaming)}
            disabled={isStressTesting}
            className={`flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-all hover:bg-muted hover:text-foreground disabled:opacity-50`}
            title={isStreaming ? 'Pause stream' : 'Resume stream'}
          >
            {isStreaming ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 text-emerald-500" />
            )}
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4 text-amber-500" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
