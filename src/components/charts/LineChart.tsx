'use client';

import React, { useMemo, useCallback } from 'react';
import { useDashboard } from '../providers/DashboardProvider';
import BaseChart from './BaseChart';

export default function LineChart() {
  const { downsampledData, updateRenderTime } = useDashboard();

  // Find boundaries
  const domains = useMemo(() => {
    if (downsampledData.length === 0) {
      return {
        x: [Date.now() - 60000, Date.now()] as [number, number],
        y: [0, 100] as [number, number]
      };
    }
    
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < downsampledData.length; i++) {
      const pt = downsampledData[i];
      if (pt.timestamp < minX) minX = pt.timestamp;
      if (pt.timestamp > maxX) maxX = pt.timestamp;
      if (pt.value < minY) minY = pt.value;
      if (pt.value > maxY) maxY = pt.value;
    }

    // Give Y axis some breathing room (15% padding)
    const ySpan = maxY - minY || 1;
    return {
      x: [minX, maxX] as [number, number],
      y: [Math.max(0, minY - ySpan * 0.1), maxY + ySpan * 0.15] as [number, number]
    };
  }, [downsampledData]);

  // Main Canvas line drawing logic
  const drawLine = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    xScale: (x: number) => number,
    yScale: (y: number) => number
  ) => {
    if (downsampledData.length === 0) return;

    const start = performance.now();

    // Determine current theme accent colors from CSS
    const isDark = document.documentElement.classList.contains('dark');
    const strokeColor = isDark ? '#60A5FA' : '#2563EB'; // Chart-1 colors
    const fillGradientStart = isDark ? 'rgba(96, 165, 250, 0.1)' : 'rgba(37, 99, 235, 0.08)';
    const fillGradientStop = 'rgba(0, 0, 0, 0)';

    // Step 1: Draw gradient area under the curve
    ctx.beginPath();
    const firstX = xScale(downsampledData[0].timestamp);
    const chartBottom = yScale(domains.y[0]);
    ctx.moveTo(firstX, chartBottom);

    for (let i = 0; i < downsampledData.length; i++) {
      const pt = downsampledData[i];
      ctx.lineTo(xScale(pt.timestamp), yScale(pt.value));
    }
    const lastX = xScale(downsampledData[downsampledData.length - 1].timestamp);
    ctx.lineTo(lastX, chartBottom);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, yScale(domains.y[1]), 0, chartBottom);
    gradient.addColorStop(0, fillGradientStart);
    gradient.addColorStop(1, fillGradientStop);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Step 2: Draw the line path (batched)
    ctx.beginPath();
    ctx.lineWidth = 1.75;
    ctx.strokeStyle = strokeColor;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.moveTo(xScale(downsampledData[0].timestamp), yScale(downsampledData[0].value));
    for (let i = 1; i < downsampledData.length; i++) {
      const pt = downsampledData[i];
      ctx.lineTo(xScale(pt.timestamp), yScale(pt.value));
    }
    ctx.stroke();

    const end = performance.now();
    updateRenderTime(end - start);
  }, [downsampledData, domains, updateRenderTime]);

  return (
    <div className="w-full">
      <BaseChart
        title="Real-time Stream metrics"
        xDomain={domains.x}
        yDomain={domains.y}
        renderCanvas={drawLine}
      >
        {/* Tooltip Overlay */}
        <TooltipOverlay data={downsampledData} />
      </BaseChart>
    </div>
  );
}

// Separate overlay component to find the nearest point and render tooltip
interface TooltipOverlayProps {
  data: { timestamp: number; value: number }[];
  xScale?: (x: number) => number;
  yScale?: (y: number) => number;
  xScaleInv?: (pixel: number) => number;
  hoverPos?: { x: number; y: number } | null;
  dimensions?: { width: number; height: number };
  padding?: { top: number; right: number; bottom: number; left: number };
}

function TooltipOverlay({
  data,
  xScale,
  yScale,
  xScaleInv,
  hoverPos,
  dimensions,
  padding
}: TooltipOverlayProps) {
  const tooltipInfo = useMemo(() => {
    if (!hoverPos || !xScaleInv || !xScale || !yScale || data.length === 0 || !padding || !dimensions) return null;

    // Binary search for nearest data point by timestamp
    const hoverValX = xScaleInv(hoverPos.x);
    let low = 0;
    let high = data.length - 1;
    let nearestIdx = 0;
    let minDiff = Infinity;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const diff = Math.abs(data[mid].timestamp - hoverValX);
      if (diff < minDiff) {
        minDiff = diff;
        nearestIdx = mid;
      }
      if (data[mid].timestamp < hoverValX) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    const nearestPt = data[nearestIdx];
    const ptX = xScale(nearestPt.timestamp);
    const ptY = yScale(nearestPt.value);

    // Make sure we only show tooltip if mouse is within reasonable hover proximity
    const isProximity = Math.abs(hoverPos.x - ptX) < 40;
    if (!isProximity) return null;

    // Tooltip position (keep on screen)
    const tooltipWidth = 130;
    let tooltipX = ptX + 15;
    let tooltipY = ptY - 30;

    const plotRight = dimensions.width - padding.right;
    if (tooltipX + tooltipWidth > plotRight) {
      tooltipX = ptX - tooltipWidth - 15;
    }
    if (tooltipY < padding.top) {
      tooltipY = padding.top + 10;
    }

    return {
      x: ptX,
      y: ptY,
      tx: tooltipX,
      ty: tooltipY,
      value: nearestPt.value,
      time: new Date(nearestPt.timestamp).toLocaleTimeString()
    };
  }, [data, hoverPos, xScale, yScale, xScaleInv, padding, dimensions]);

  if (!tooltipInfo || !yScale) return null;

  return (
    <svg className="absolute inset-0 h-full w-full pointer-events-none">
      {/* Circle highlight on the path */}
      <circle
        cx={tooltipInfo.x}
        cy={tooltipInfo.y}
        r={4.5}
        className="fill-accent stroke-background"
        strokeWidth={1.5}
      />
      {/* Tooltip Card */}
      <g transform={`translate(${tooltipInfo.tx}, ${tooltipInfo.ty})`}>
        <rect
          width={130}
          height={60}
          rx={6}
          className="fill-card/90 stroke-border shadow-sm backdrop-blur-sm"
          strokeWidth={1}
        />
        <text x={10} y={20} className="fill-muted-foreground text-[10px] font-medium font-sans">
          Time: {tooltipInfo.time}
        </text>
        <text x={10} y={38} className="fill-foreground text-xs font-bold font-mono">
          Value: {tooltipInfo.value.toFixed(2)}
        </text>
        <text x={10} y={50} className="fill-muted-foreground text-[9px] font-sans">
          Status: Normal
        </text>
      </g>
    </svg>
  );
}
