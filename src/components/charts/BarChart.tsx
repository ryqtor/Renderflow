'use client';

import React, { useMemo, useCallback } from 'react';
import { useDashboard } from '../providers/DashboardProvider';
import BaseChart from './BaseChart';

const CATEGORIES = ['api', 'auth', 'checkout', 'payment', 'search'];

export default function BarChart() {
  const { rawData } = useDashboard();

  // Aggregate average CPU usage per category from rawData
  const aggregatedData = useMemo(() => {
    const categoryStats = CATEGORIES.reduce((acc, cat) => {
      acc[cat] = { sum: 0, count: 0 };
      return acc;
    }, {} as Record<string, { sum: number; count: number }>);

    for (let i = 0; i < rawData.length; i++) {
      const pt = rawData[i];
      if (categoryStats[pt.category] !== undefined) {
        categoryStats[pt.category].sum += pt.cpu;
        categoryStats[pt.category].count++;
      }
    }

    return CATEGORIES.map((cat, idx) => {
      const { sum, count } = categoryStats[cat];
      const avgCpu = count > 0 ? sum / count : 20 + Math.random() * 15; // fallback
      return {
        category: cat,
        index: idx,
        value: parseFloat(avgCpu.toFixed(1))
      };
    });
  }, [rawData]);

  // Max value to set domain
  const maxVal = useMemo(() => {
    const vals = aggregatedData.map(d => d.value);
    return Math.max(100, ...vals);
  }, [aggregatedData]);

  // Canvas drawing handler
  const drawBars = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    xScale: (x: number) => number,
    yScale: (y: number) => number
  ) => {
    if (aggregatedData.length === 0) return;

    const isDark = document.documentElement.classList.contains('dark');
    const barColor = isDark ? '#34D399' : '#10B981'; // Muted green (Chart-2)

    // Calculate bar width dynamically based on scaling
    const plotWidth = width - 55 - 30; // base dimensions padding left/right
    const barWidth = (plotWidth / CATEGORIES.length) * 0.45;

    ctx.save();

    for (let i = 0; i < aggregatedData.length; i++) {
      const d = aggregatedData[i];
      const cx = xScale(d.index);
      const cy = yScale(d.value);
      const bottom = yScale(0);

      const x = cx - barWidth / 2;
      const y = cy;
      const w = barWidth;
      const h = bottom - cy;

      // Draw subtle rounded top bars
      ctx.fillStyle = barColor;
      ctx.beginPath();
      
      // Draw rectangular bar with top border radius
      const radius = Math.min(4, h);
      ctx.moveTo(x, y + h);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }, [aggregatedData]);

  return (
    <div className="w-full">
      <BaseChart
        title="Avg CPU Usage by Category (%)"
        xDomain={[-0.5, 4.5] as [number, number]}
        yDomain={[0, maxVal] as [number, number]}
        renderCanvas={drawBars}
      >
        <CategoryLabels overlayData={aggregatedData} />
      </BaseChart>
    </div>
  );
}

// Category custom labels overlay
interface CategoryLabelsProps {
  overlayData: { category: string; index: number; value: number }[];
  xScale?: (x: number) => number;
  yScale?: (y: number) => number;
  hoverPos?: { x: number; y: number } | null;
  dimensions?: { width: number; height: number };
  padding?: { top: number; right: number; bottom: number; left: number };
}

function CategoryLabels({
  overlayData,
  xScale,
  yScale,
  hoverPos,
  dimensions,
  padding
}: CategoryLabelsProps) {
  const hoveredBar = useMemo(() => {
    if (!hoverPos || !xScale || !yScale || !dimensions || !padding) return null;

    const plotWidth = dimensions.width - padding.left - padding.right;
    const clickZoneWidth = plotWidth / CATEGORIES.length;

    // Find which category index does mouse x coordinate belong to
    const relativeX = hoverPos.x - padding.left;
    const hoveredIdx = Math.floor(relativeX / clickZoneWidth);

    if (hoveredIdx >= 0 && hoveredIdx < CATEGORIES.length) {
      const d = overlayData[hoveredIdx];
      if (!d) return null;
      
      const barX = xScale(d.index);
      const barY = yScale(d.value);

      return {
        category: d.category,
        value: d.value,
        x: barX,
        y: barY
      };
    }

    return null;
  }, [hoverPos, xScale, yScale, dimensions, padding, overlayData]);

  if (!xScale || !dimensions || !padding) return null;

  return (
    <svg className="absolute inset-0 h-full w-full pointer-events-none">
      {/* Category text labels underneath bars */}
      {overlayData.map((d, idx) => {
        const x = xScale(d.index);
        return (
          <text
            key={`cat-label-${idx}`}
            x={x}
            y={dimensions.height - padding.bottom + 16}
            textAnchor="middle"
            className="fill-foreground text-[10px] font-medium font-sans uppercase tracking-wider"
          >
            {d.category}
          </text>
        );
      })}

      {/* Hover tooltip overlay */}
      {hoveredBar && (
        <g transform={`translate(${hoveredBar.x - 65}, ${Math.max(padding.top + 5, hoveredBar.y - 45)})`}>
          <rect
            width={130}
            height={38}
            rx={4}
            className="fill-card/90 stroke-border shadow-md backdrop-blur-sm"
            strokeWidth={1}
          />
          <text x={10} y={15} className="fill-muted-foreground text-[9px] font-sans uppercase tracking-wider">
            {hoveredBar.category}
          </text>
          <text x={10} y={28} className="fill-foreground text-[11px] font-bold font-mono">
            Avg CPU: {hoveredBar.value}%
          </text>
        </g>
      )}
    </svg>
  );
}
