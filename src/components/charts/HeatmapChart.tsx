'use client';

import React, { useMemo, useCallback } from 'react';
import { useDashboard } from '../providers/DashboardProvider';
import BaseChart from './BaseChart';

const REGIONS = ['us-east-1', 'us-west-2', 'eu-central-1', 'ap-northeast-1', 'sa-east-1'];
const BUCKETS = ['0-50ms', '50-100ms', '100-150ms', '150-200ms', '200ms+'];

export default function HeatmapChart() {
  const { heatmapData } = useDashboard();

  // Find max count in cells for normalization
  const maxCount = useMemo(() => {
    if (heatmapData.length === 0) return 1;
    let max = 0;
    for (let i = 0; i < heatmapData.length; i++) {
      if (heatmapData[i].count > max) {
        max = heatmapData[i].count;
      }
    }
    return max || 1;
  }, [heatmapData]);

  // Main cell drawer
  const drawHeatmap = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    xScale: (x: number) => number,
    yScale: (y: number) => number
  ) => {
    if (heatmapData.length === 0) return;

    const plotWidth = width - 55 - 30;
    const plotHeight = height - 20 - 40;
    const cellW = plotWidth / REGIONS.length;
    const cellH = plotHeight / BUCKETS.length;

    const isDark = document.documentElement.classList.contains('dark');
    const accentBaseColor = isDark ? '96, 165, 250' : '37, 99, 235'; // Chart-1 rgb components

    ctx.save();

    for (let i = 0; i < heatmapData.length; i++) {
      const cell = heatmapData[i];
      const rIdx = REGIONS.indexOf(cell.region);
      const bIdx = cell.latencyBucket;

      if (rIdx === -1) continue;

      const cx = xScale(rIdx);
      const cy = yScale(bIdx);

      // Draw cell rectangle with 2px padding for spacing
      const gap = 2;
      const x = cx - cellW / 2 + gap;
      const y = cy - cellH / 2 + gap;
      const w = cellW - gap * 2;
      const h = cellH - gap * 2;

      // Opacity proportional to density count
      const alpha = Math.max(0.04, cell.count / maxCount);
      ctx.fillStyle = `rgba(${accentBaseColor}, ${alpha})`;
      
      // Draw smooth rounded cell corners
      const radius = 3;
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();

      // Write count text inside cells under light load
      if (cell.count > 0 && w > 40 && h > 20) {
        ctx.fillStyle = isDark 
          ? (alpha > 0.5 ? '#0A0A0C' : '#FFFFFF') 
          : (alpha > 0.5 ? '#FFFFFF' : '#111827');
        ctx.font = 'bold 9px ui-monospace, SFMono-Regular, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(cell.count), cx, cy);
      }
    }

    ctx.restore();
  }, [heatmapData, maxCount]);

  return (
    <div className="w-full">
      <BaseChart
        title="Regional Latency Grid Density"
        xDomain={[-0.5, 4.5] as [number, number]}
        yDomain={[-0.5, 4.5] as [number, number]}
        renderCanvas={drawHeatmap}
      >
        <HeatmapLabels overlayData={heatmapData} />
      </BaseChart>
    </div>
  );
}

// Labels overlay
interface HeatmapLabelsProps {
  overlayData: { region: string; latencyBucket: number; count: number }[];
  xScale?: (x: number) => number;
  yScale?: (y: number) => number;
  hoverPos?: { x: number; y: number } | null;
  dimensions?: { width: number; height: number };
  padding?: { top: number; right: number; bottom: number; left: number };
}

function HeatmapLabels({
  overlayData,
  xScale,
  yScale,
  hoverPos,
  dimensions,
  padding
}: HeatmapLabelsProps) {
  const hoveredCell = useMemo(() => {
    if (!hoverPos || !xScale || !yScale || !dimensions || !padding || overlayData.length === 0) return null;

    const plotWidth = dimensions.width - padding.left - padding.right;
    const plotHeight = dimensions.height - padding.top - padding.bottom;

    const cellW = plotWidth / REGIONS.length;
    const cellH = plotHeight / BUCKETS.length;

    // Map pixel back to grid indices
    const rIdx = Math.floor((hoverPos.x - padding.left) / cellW);
    const bIdx = Math.floor((hoverPos.y - padding.top) / cellH);

    // Grid coordinates start from top-left, buckets are on Y-scale which represents indices
    // Wait, yScale maps index to pixel, but Y index increases bottom-to-top in BaseChart scales,
    // so we invert the Y index calculation:
    const invertedBIdx = 4 - bIdx;

    if (rIdx >= 0 && rIdx < REGIONS.length && invertedBIdx >= 0 && invertedBIdx < BUCKETS.length) {
      const region = REGIONS[rIdx];
      
      // Find matching item in overlayData
      const cell = overlayData.find(c => c.region === region && c.latencyBucket === invertedBIdx);
      if (!cell) return null;

      const cellX = xScale(rIdx);
      const cellY = yScale(invertedBIdx);

      return {
        region,
        bucket: BUCKETS[invertedBIdx],
        count: cell.count,
        x: cellX,
        y: cellY
      };
    }

    return null;
  }, [hoverPos, xScale, yScale, dimensions, padding, overlayData]);

  if (!xScale || !yScale || !dimensions || !padding) return null;

  return (
    <svg className="absolute inset-0 h-full w-full pointer-events-none">
      {/* Region labels on X-axis */}
      {REGIONS.map((r, idx) => (
        <text
          key={`region-label-${idx}`}
          x={xScale(idx)}
          y={dimensions.height - padding.bottom + 16}
          textAnchor="middle"
          className="fill-foreground text-[10px] font-medium font-sans uppercase tracking-wider"
        >
          {r.split('-')[0]}..
        </text>
      ))}

      {/* Latency buckets on Y-axis */}
      {BUCKETS.map((b, idx) => (
        <text
          key={`bucket-label-${idx}`}
          x={padding.left - 8}
          y={yScale(idx) + 3}
          textAnchor="end"
          className="fill-muted-foreground text-[10px] font-medium font-sans"
        >
          {b}
        </text>
      ))}

      {/* Tooltip on hover */}
      {hoveredCell && (
        <g transform={`translate(${Math.min(dimensions.width - 150, hoveredCell.x - 70)}, ${Math.max(padding.top + 5, hoveredCell.y - 50)})`}>
          <rect
            width={140}
            height={44}
            rx={4}
            className="fill-card/90 stroke-border shadow-md backdrop-blur-sm"
            strokeWidth={1}
          />
          <text x={10} y={15} className="fill-muted-foreground text-[9px] font-sans uppercase">
            {hoveredCell.region} ({hoveredCell.bucket})
          </text>
          <text x={10} y={30} className="fill-foreground text-[11px] font-bold font-mono">
            Count: {hoveredCell.count.toLocaleString()} points
          </text>
        </g>
      )}
    </svg>
  );
}
