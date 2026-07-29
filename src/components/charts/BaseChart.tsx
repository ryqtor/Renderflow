'use client';

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Maximize2, Download, ZoomIn, Move } from 'lucide-react';
import { setupCanvasDpi } from '../../lib/canvasUtils';

interface BaseChartProps {
  title: string;
  xDomain: [number, number]; // [min, max] timestamps
  yDomain: [number, number]; // [min, max] values
  onExportPng?: () => void;
  renderCanvas: (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    xScale: (x: number) => number,
    yScale: (y: number) => number,
    xScaleInv: (xPixel: number) => number,
    yScaleInv: (yPixel: number) => number
  ) => void;
  children?: React.ReactNode; // Extra overlays if needed
}

export default function BaseChart({
  title,
  xDomain,
  yDomain,
  renderCanvas,
  children
}: BaseChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Layout dimensions
  const [dimensions, setDimensions] = useState({ width: 600, height: 350 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [interactionMode, setInteractionMode] = useState<'pan' | 'zoom-box'>('pan');

  // Chart padding
  const padding = useMemo(() => ({ top: 20, right: 30, bottom: 40, left: 55 }), []);

  // Zoom/Pan State - offset and scale multipliers
  const [zoomState, setZoomState] = useState({
    xScale: 1,
    yScale: 1,
    xOffset: 0,
    yOffset: 0
  });

  // Crosshair / Hover state
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  // Selection box state
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);

  // Drag pan states
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragOffsetStart = useRef({ x: 0, y: 0 });

  // Reset zoom state
  const resetZoom = useCallback(() => {
    setZoomState({ xScale: 1, yScale: 1, xOffset: 0, yOffset: 0 });
    setSelectionBox(null);
  }, []);

  // Set up resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver(entries => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      setDimensions({
        width: Math.max(200, width),
        height: Math.max(150, height)
      });
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Calculations for scale functions based on dimensions and zoomState
  const scaleHelpers = useMemo(() => {
    const plotWidth = dimensions.width - padding.left - padding.right;
    const plotHeight = dimensions.height - padding.top - padding.bottom;

    // Base limits
    const [xMinBase, xMaxBase] = xDomain;
    const [yMinBase, yMaxBase] = yDomain;

    const xSpanBase = xMaxBase - xMinBase || 1;
    const ySpanBase = yMaxBase - yMinBase || 1;

    // Zoomed bounds
    // Zoom factor reduces the visible span, Offset moves the bounds
    const xSpan = xSpanBase / zoomState.xScale;
    const ySpan = ySpanBase / zoomState.yScale;

    // Offset is percentage based relative to base span
    const xMin = xMinBase + zoomState.xOffset * xSpanBase;
    const xMax = xMin + xSpan;

    const yMin = yMinBase + zoomState.yOffset * ySpanBase;
    const yMax = yMin + ySpan;

    // Value mapping to canvas pixels
    const xScale = (val: number) => {
      const pct = (val - xMin) / (xMax - xMin || 1);
      return padding.left + pct * plotWidth;
    };

    const yScale = (val: number) => {
      const pct = (val - yMin) / (yMax - yMin || 1);
      // SVG / Canvas coordinates increase top-to-bottom
      return padding.top + (1 - pct) * plotHeight;
    };

    // Pixel mapping back to values (for tooltips and zoom select)
    const xScaleInv = (pixel: number) => {
      const pct = (pixel - padding.left) / plotWidth;
      return xMin + pct * (xMax - xMin);
    };

    const yScaleInv = (pixel: number) => {
      const pct = (pixel - padding.top) / plotHeight;
      return yMax - pct * (yMax - yMin);
    };

    return { xScale, yScale, xScaleInv, yScaleInv, xMin, xMax, yMin, yMax, plotWidth, plotHeight };
  }, [dimensions, padding, xDomain, yDomain, zoomState]);

  // Execute Canvas Drawing whenever data, zoom or dimensions change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = setupCanvasDpi(canvas, dimensions.width, dimensions.height);
    if (!ctx) return;

    // Clear previous drawing
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // Run custom drawer
    ctx.save();
    // Clip drawing area to plot width/height so points don't bleed onto axis lines
    ctx.beginPath();
    ctx.rect(
      padding.left,
      padding.top,
      dimensions.width - padding.left - padding.right,
      dimensions.height - padding.top - padding.bottom
    );
    ctx.clip();

    renderCanvas(
      ctx,
      dimensions.width,
      dimensions.height,
      scaleHelpers.xScale,
      scaleHelpers.yScale,
      scaleHelpers.xScaleInv,
      scaleHelpers.yScaleInv
    );

    ctx.restore();
  }, [dimensions, padding, renderCanvas, scaleHelpers]);

  // Scrollwheel zooming centered on mouse x-coordinate
  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Only zoom if mouse is in plot area
    if (
      mouseX < padding.left ||
      mouseX > dimensions.width - padding.right ||
      mouseY < padding.top ||
      mouseY > dimensions.height - padding.bottom
    ) {
      return;
    }

    const zoomIntensity = 0.1;
    const zoomFactor = e.deltaY < 0 ? (1 + zoomIntensity) : (1 - zoomIntensity);

    setZoomState(prev => {
      const nextXScale = Math.max(1, Math.min(100, prev.xScale * zoomFactor));
      const nextYScale = Math.max(1, Math.min(100, prev.yScale * zoomFactor));

      if (nextXScale === prev.xScale) return prev;

      // Center the zoom around mouse pointer
      const mouseValX = scaleHelpers.xScaleInv(mouseX);
      const mouseValY = scaleHelpers.yScaleInv(mouseY);

      const [xMinBase, xMaxBase] = xDomain;
      const xSpanBase = xMaxBase - xMinBase;
      const newXSpan = xSpanBase / nextXScale;

      const pctX = (mouseX - padding.left) / (dimensions.width - padding.left - padding.right);
      const newXMin = mouseValX - pctX * newXSpan;
      const nextXOffset = (newXMin - xMinBase) / xSpanBase;

      // Same for Y
      const [yMinBase, yMaxBase] = yDomain;
      const ySpanBase = yMaxBase - yMinBase;
      const newYSpan = ySpanBase / nextYScale;

      const pctY = 1 - (mouseY - padding.top) / (dimensions.height - padding.top - padding.bottom);
      const newYMin = mouseValY - pctY * newYSpan;
      const nextYOffset = (newYMin - yMinBase) / ySpanBase;

      return {
        xScale: nextXScale,
        yScale: nextYScale,
        xOffset: Math.max(-0.5, Math.min(1.5, nextXOffset)),
        yOffset: Math.max(-0.5, Math.min(1.5, nextYOffset))
      };
    });
  }, [dimensions, padding, scaleHelpers, xDomain, yDomain]);

  // Pointer drag/zoom handlers
  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if within bounds
    if (
      x < padding.left ||
      x > dimensions.width - padding.right ||
      y < padding.top ||
      y > dimensions.height - padding.bottom
    ) {
      return;
    }

    svgRef.current.setPointerCapture(e.pointerId);

    // If Shift is pressed or interactionMode is zoom-box, trigger selection box
    if (e.shiftKey || interactionMode === 'zoom-box') {
      setSelectionBox({ startX: x, startY: y, currentX: x, currentY: y });
    } else {
      // Default Pan mode
      isDragging.current = true;
      dragStart.current = { x, y };
      dragOffsetStart.current = { x: zoomState.xOffset, y: zoomState.yOffset };
    }
  }, [dimensions, padding, zoomState, interactionMode]);

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Hover crosshair position (limited to inside plot area)
    if (
      x >= padding.left &&
      x <= dimensions.width - padding.right &&
      y >= padding.top &&
      y <= dimensions.height - padding.bottom
    ) {
      setHoverPos({ x, y });
    } else {
      setHoverPos(null);
    }

    if (selectionBox) {
      setSelectionBox(prev => prev ? { ...prev, currentX: x, currentY: y } : null);
    } else if (isDragging.current) {
      const dx = x - dragStart.current.x;
      const dy = y - dragStart.current.y;

      const plotWidth = dimensions.width - padding.left - padding.right;
      const plotHeight = dimensions.height - padding.top - padding.bottom;

      // Translate delta pixels to domain ratios
      const xRangeFrac = dx / plotWidth;
      const yRangeFrac = dy / plotHeight;

      setZoomState(prev => {
        // Adjusting offset moves the visible range
        const nextXOffset = prev.xOffset - xRangeFrac / prev.xScale;
        const nextYOffset = prev.yOffset + yRangeFrac / prev.yScale; // Y is inverted

        return {
          ...prev,
          xOffset: nextXOffset,
          yOffset: nextYOffset
        };
      });
    }
  }, [dimensions, padding, selectionBox]);

  const handlePointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    svgRef.current.releasePointerCapture(e.pointerId);

    if (selectionBox) {
      // Execute Box Zoom
      const { startX, startY, currentX, currentY } = selectionBox;
      const x1 = Math.min(startX, currentX);
      const x2 = Math.max(startX, currentX);
      const y1 = Math.min(startY, currentY);
      const y2 = Math.max(startY, currentY);

      // Only perform zoom if box is large enough (e.g. 5x5 pixels)
      if (x2 - x1 > 5 && y2 - y1 > 5) {
        const valX1 = scaleHelpers.xScaleInv(x1);
        const valX2 = scaleHelpers.xScaleInv(x2);
        const valY1 = scaleHelpers.yScaleInv(y2); // inverted coordinates
        const valY2 = scaleHelpers.yScaleInv(y1);

        const [xMinBase, xMaxBase] = xDomain;
        const [yMinBase, yMaxBase] = yDomain;
        const xSpanBase = xMaxBase - xMinBase;
        const ySpanBase = yMaxBase - yMinBase;

        const newXScale = xSpanBase / (valX2 - valX1);
        const newYScale = ySpanBase / (valY2 - valY1);

        const nextXOffset = (valX1 - xMinBase) / xSpanBase;
        const nextYOffset = (valY1 - yMinBase) / ySpanBase;

        setZoomState({
          xScale: Math.max(1, Math.min(100, newXScale)),
          yScale: Math.max(1, Math.min(100, newYScale)),
          xOffset: nextXOffset,
          yOffset: nextYOffset
        });
      }
      setSelectionBox(null);
    }

    isDragging.current = false;
  }, [selectionBox, scaleHelpers, xDomain, yDomain]);

  // Export to PNG helper
  const exportPng = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a temporary link
    const link = document.createElement('a');
    link.download = `${title.toLowerCase().replace(/\s+/g, '_')}_export.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [title]);

  // SVG grid lines and axis ticks calculation
  const gridLines = useMemo(() => {
    const plotWidth = dimensions.width - padding.left - padding.right;
    const plotHeight = dimensions.height - padding.top - padding.bottom;

    const xTicksCount = 6;
    const yTicksCount = 5;

    const xTicks: number[] = [];
    for (let i = 0; i < xTicksCount; i++) {
      const pct = i / (xTicksCount - 1);
      const pixelX = padding.left + pct * plotWidth;
      xTicks.push(scaleHelpers.xScaleInv(pixelX));
    }

    const yTicks: number[] = [];
    for (let i = 0; i < yTicksCount; i++) {
      const pct = i / (yTicksCount - 1);
      const pixelY = padding.top + pct * plotHeight;
      yTicks.push(scaleHelpers.yScaleInv(pixelY));
    }

    return { xTicks, yTicks };
  }, [dimensions, padding, scaleHelpers]);

  // Handle Fullscreen state
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Keep state sync with fullscreen changes (e.g. ESC key pressed)
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col rounded-xl border border-border bg-card p-4 transition-all duration-200 ${
        isFullscreen ? 'h-screen w-screen p-8' : 'h-[380px] w-full'
      }`}
    >
      {/* Header Controls */}
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h4>
        <div className="flex items-center space-x-1">
          {/* Interaction Mode Toggle */}
          <button
            onClick={() => setInteractionMode('pan')}
            className={`rounded-md p-1 transition-all ${
              interactionMode === 'pan' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50'
            }`}
            title="Drag to Pan"
          >
            <Move className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setInteractionMode('zoom-box')}
            className={`rounded-md p-1 transition-all ${
              interactionMode === 'zoom-box' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50'
            }`}
            title="Drag to Zoom Box (or Shift+Drag)"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>

          <span className="h-4 w-px bg-border mx-1"></span>

          {/* Reset Zoom Button */}
          {(zoomState.xScale > 1 || zoomState.xOffset !== 0) && (
            <button
              onClick={resetZoom}
              className="rounded-md px-1.5 py-0.5 text-[10px] font-medium border border-border text-foreground hover:bg-muted"
            >
              Reset Zoom
            </button>
          )}

          {/* Export PNG */}
          <button
            onClick={exportPng}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Export PNG"
          >
            <Download className="h-3.5 w-3.5" />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main Canvas and SVG Plot Wrapper */}
      <div className="relative flex-1 select-none overflow-hidden">
        {/* Layer 1: The Canvas for drawing high-speed primitives */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
        />

        {/* Layer 2: The SVG for grids, ticks, labels, overlays and mouse events */}
        <svg
          ref={svgRef}
          className="absolute inset-0 h-full w-full cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
          onDoubleClick={resetZoom}
        >
          {/* SVG Grid Lines */}
          {gridLines.xTicks.map((xVal, idx) => {
            const x = scaleHelpers.xScale(xVal);
            if (x < padding.left || x > dimensions.width - padding.right) return null;
            return (
              <line
                key={`grid-x-${idx}`}
                x1={x}
                y1={padding.top}
                x2={x}
                y2={dimensions.height - padding.bottom}
                stroke="currentColor"
                className="text-border/60"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            );
          })}

          {gridLines.yTicks.map((yVal, idx) => {
            const y = scaleHelpers.yScale(yVal);
            if (y < padding.top || y > dimensions.height - padding.bottom) return null;
            return (
              <line
                key={`grid-y-${idx}`}
                x1={padding.left}
                y1={y}
                x2={dimensions.width - padding.right}
                y2={y}
                stroke="currentColor"
                className="text-border/60"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            );
          })}

          {/* SVG Outer border lines */}
          <line
            x1={padding.left}
            y1={dimensions.height - padding.bottom}
            x2={dimensions.width - padding.right}
            y2={dimensions.height - padding.bottom}
            stroke="currentColor"
            className="text-border"
            strokeWidth={1}
          />
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={dimensions.height - padding.bottom}
            stroke="currentColor"
            className="text-border"
            strokeWidth={1}
          />

          {/* Tick Labels - X Axis (Timestamps) */}
          {gridLines.xTicks.map((xVal, idx) => {
            const x = scaleHelpers.xScale(xVal);
            if (x < padding.left - 5 || x > dimensions.width - padding.right + 5) return null;

            const timeLabel = new Date(xVal).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });

            return (
              <text
                key={`tick-label-x-${idx}`}
                x={x}
                y={dimensions.height - padding.bottom + 18}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px] font-mono select-none"
              >
                {timeLabel}
              </text>
            );
          })}

          {/* Tick Labels - Y Axis (Values) */}
          {gridLines.yTicks.map((yVal, idx) => {
            const y = scaleHelpers.yScale(yVal);
            if (y < padding.top - 5 || y > dimensions.height - padding.bottom + 5) return null;

            return (
              <text
                key={`tick-label-y-${idx}`}
                x={padding.left - 8}
                y={y + 3.5}
                textAnchor="end"
                className="fill-muted-foreground text-[10px] font-mono select-none"
              >
                {yVal.toFixed(1)}
              </text>
            );
          })}

          {/* Render Crosshairs on Hover */}
          {hoverPos && (
            <>
              {/* Vertical line */}
              <line
                x1={hoverPos.x}
                y1={padding.top}
                x2={hoverPos.x}
                y2={dimensions.height - padding.bottom}
                stroke="currentColor"
                className="text-muted-foreground/45"
                strokeWidth={1}
              />
              {/* Horizontal line */}
              <line
                x1={padding.left}
                y1={hoverPos.y}
                x2={dimensions.width - padding.right}
                y2={hoverPos.y}
                stroke="currentColor"
                className="text-muted-foreground/45"
                strokeWidth={1}
              />
              {/* Hover Value Labels */}
              <rect
                x={padding.left - 48}
                y={hoverPos.y - 8}
                width={44}
                height={16}
                rx={3}
                className="fill-accent stroke-border"
                strokeWidth={0.5}
              />
              <text
                x={padding.left - 6}
                y={hoverPos.y + 3}
                textAnchor="end"
                className="fill-accent-foreground font-mono text-[9px] font-bold"
              >
                {scaleHelpers.yScaleInv(hoverPos.y).toFixed(1)}
              </text>

              <rect
                x={hoverPos.x - 30}
                y={dimensions.height - padding.bottom + 2}
                width={60}
                height={16}
                rx={3}
                className="fill-accent stroke-border"
                strokeWidth={0.5}
              />
              <text
                x={hoverPos.x}
                y={dimensions.height - padding.bottom + 13}
                textAnchor="middle"
                className="fill-accent-foreground font-mono text-[9px] font-bold"
              >
                {new Date(scaleHelpers.xScaleInv(hoverPos.x)).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </text>
            </>
          )}

          {/* Selection Box Overlay */}
          {selectionBox && (
            <rect
              x={Math.min(selectionBox.startX, selectionBox.currentX)}
              y={Math.min(selectionBox.startY, selectionBox.currentY)}
              width={Math.abs(selectionBox.currentX - selectionBox.startX)}
              height={Math.abs(selectionBox.currentY - selectionBox.startY)}
              className="fill-primary/10 stroke-primary"
              strokeWidth={1.5}
              strokeDasharray="3 2"
            />
          )}
        </svg>

        {/* Children Render for tooltip overlay boxes if provided */}
        {children && (
          <div className="absolute inset-0 pointer-events-none">
            {React.Children.map(children, child => {
              if (React.isValidElement(child)) {
                return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
                  // Pass scales down
                  xScale: scaleHelpers.xScale,
                  yScale: scaleHelpers.yScale,
                  xScaleInv: scaleHelpers.xScaleInv,
                  yScaleInv: scaleHelpers.yScaleInv,
                  hoverPos,
                  dimensions,
                  padding
                });
              }
              return child;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
