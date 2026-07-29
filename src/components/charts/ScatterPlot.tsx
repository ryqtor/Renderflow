'use client';

import React, { useMemo, useCallback } from 'react';
import { useDashboard } from '../providers/DashboardProvider';
import BaseChart from './BaseChart';

export default function ScatterPlot() {
  const { rawData } = useDashboard();

  // Find dynamic y domain (latency)
  const domains = useMemo(() => {
    if (rawData.length === 0) {
      return {
        x: [0, 100] as [number, number],
        y: [0, 250] as [number, number]
      };
    }

    let maxLatency = 200;
    for (let i = 0; i < rawData.length; i++) {
      if (rawData[i].latency > maxLatency) {
        maxLatency = rawData[i].latency;
      }
    }

    return {
      x: [0, 100] as [number, number],
      y: [0, Math.ceil(maxLatency * 1.1)] as [number, number]
    };
  }, [rawData]);

  // High performance batch scatter point drawing
  const drawScatter = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    xScale: (x: number) => number,
    yScale: (y: number) => number
  ) => {
    if (rawData.length === 0) return;

    const isDark = document.documentElement.classList.contains('dark');
    // Muted blue (Chart-1) with alpha transparency to reveal dense cluster zones
    const pointColor = isDark ? 'rgba(96, 165, 250, 0.45)' : 'rgba(37, 99, 235, 0.35)';

    ctx.save();
    ctx.fillStyle = pointColor;

    const padding = { left: 55, right: 30, top: 20, bottom: 40 };

    for (let i = 0; i < rawData.length; i++) {
      const pt = rawData[i];
      const cx = xScale(pt.cpu);
      const cy = yScale(pt.latency);

      // Viewport culling - skip drawing if outside plot area boundaries
      if (
        cx >= padding.left &&
        cx <= width - padding.right &&
        cy >= padding.top &&
        cy <= height - padding.bottom
      ) {
        // High performance: fillRect is substantially faster than arc pathing
        ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
      }
    }

    ctx.restore();
  }, [rawData]);

  return (
    <div className="w-full">
      <BaseChart
        title="Latency vs CPU usage correlation"
        xDomain={domains.x}
        yDomain={domains.y}
        renderCanvas={drawScatter}
      >
        <ScatterLabels xDomain={domains.x} yDomain={domains.y} />
      </BaseChart>
    </div>
  );
}

// Labels and axis description overlay
interface ScatterLabelsProps {
  xDomain: [number, number];
  yDomain: [number, number];
  xScale?: (x: number) => number;
  yScale?: (y: number) => number;
  hoverPos?: { x: number; y: number } | null;
  dimensions?: { width: number; height: number };
  padding?: { top: number; right: number; bottom: number; left: number };
}

function ScatterLabels({
  xScale,
  yScale,
  hoverPos,
  dimensions,
  padding
}: ScatterLabelsProps) {
  if (!dimensions || !padding || !xScale || !yScale) return null;

  return (
    <svg className="absolute inset-0 h-full w-full pointer-events-none">
      {/* Axis Description Labels */}
      <text
        x={dimensions.width - padding.right - 5}
        y={dimensions.height - padding.bottom - 6}
        textAnchor="end"
        className="fill-muted-foreground text-[9px] font-mono uppercase tracking-wider"
      >
        CPU Usage → (%)
      </text>
      
      <text
        x={padding.left + 8}
        y={padding.top + 12}
        textAnchor="start"
        className="fill-muted-foreground text-[9px] font-mono uppercase tracking-wider"
      >
        Latency ↑ (ms)
      </text>

      {/* Hover tooltip for coordinates */}
      {hoverPos && (
        <g transform={`translate(${Math.min(dimensions.width - 135, hoverPos.x + 10)}, ${Math.max(padding.top + 5, hoverPos.y - 45)})`}>
          <rect
            width={120}
            height={36}
            rx={4}
            className="fill-card/90 stroke-border shadow-md backdrop-blur-sm"
            strokeWidth={1}
          />
          <text x={10} y={14} className="fill-muted-foreground text-[9px] font-sans">
            CPU: {xScale.name ? '' : ''} {((hoverPos.x - padding.left) / (dimensions.width - padding.left - padding.right) * 100).toFixed(1)}%
          </text>
          <text x={10} y={26} className="fill-foreground text-[10px] font-bold font-mono">
            Lat: {yScale.name ? '' : ''} {Math.round(250 - (hoverPos.y - padding.top) / (dimensions.height - padding.top - padding.bottom) * 250)} ms
          </text>
        </g>
      )}
    </svg>
  );
}
