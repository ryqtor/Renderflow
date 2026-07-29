# Renderflow Real-Time Analytics Engine

**Renderflow** is a production-quality, high-performance real-time telemetry dashboard designed using a minimalist aesthetic. It is built to stream and render over 10,000+ live data points at a stable, fluid 60 FPS. 

The visualization layer is custom-built using a **hybrid Canvas/SVG** rendering pipeline, achieving professional SaaS data density without the memory overhead of commercial visualization packages.

---

## Key Features

* **Custom Canvas/SVG Hybrid Pipeline**: Millions of chart segments are painted to a raw pixel canvas, while grids, borders, ticks, interactive crosshairs, and tooltips are overlayed in SVG.
* **Asynchronous Calculations Worker**: Offloads statistical aggregates, standard deviation anomaly triggers, LTTB downsampling, and regional bucket matrices to a background Web Worker.
* **Custom Virtualized Table**: Renders 100,000+ streaming log rows smoothly by recycling DOM nodes, maintaining a virtual scroll container height of less than 40 rows.
* **Diagnostic Telemetry Console**: Provides real-time information of FPS, canvas render budgets, web worker execution latency, and heap allocations.
* **Load Stress Benchmarking**: Instantly load and profile 10k, 25k, 50k, or 100k data points to run engine benchmarks.
* **Stripe-Inspired Design**: Professional slate/neutral light and dark themes using spacing and typography hierarchy, thin borders, and subtle hover animations.
* **API Streaming Handler**: Simulates server-side streaming using App Router Route Handlers and Server-Sent Events (SSE).

---

## Folder Structure

```
renderflow/
├── src/
│   ├── app/                      # Next.js App Router Pages
│   │   ├── api/data/route.ts     # SSE Data Stream route
│   │   ├── dashboard/            # Dashboard landing page
│   │   ├── globals.css           # Tailwind custom variable tokens
│   │   ├── layout.tsx            # Global metadata configuration
│   │   └── page.tsx              # Root index router
│   ├── components/
│   │   ├── charts/               # BaseChart, LineChart, BarChart, ScatterPlot, HeatmapChart
│   │   ├── controls/             # PerformanceMonitor, StressTestControls
│   │   ├── layout/               # Header, Sidebar, BottomPanel
│   │   └── providers/            # DashboardProvider (Context manager)
│   │   └── ui/                   # VirtualizedTable component
│   ├── hooks/                    # useFps, useWebWorker, useVirtualScroll
│   ├── lib/                      # dataGenerator, canvasUtils (LTTB downsampling)
│   ├── types/                    # dashboard.ts TypeScript declarations
│   └── workers/                  # analytics.worker.ts calculations thread
├── PERFORMANCE.md                # Telemetry optimization strategies
└── package.json                  # Next.js configurations
```

---

## Installation & Setup

1. **Clone and Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

3. **Verify Production Build**:
   ```bash
   npm run build
   ```

---

## Optimization Telemetry

* **Largest Triangle Three Buckets (LTTB)**: Downsamples dense client coordinates dynamically in a separate thread, reducing canvas paths from 5,000+ points to exactly 1,000, maintaining visual shape and peaks.
* **Viewport Culling**: Renders only canvas items currently visible in the active zoom bounds, skipping processing of out-of-bounds coordinates.
* **Point Optimization**: Replaces circular vector paths with `fillRect` pixel blocks inside the Scatter Plot to maximize CPU rasterization times.
* **Ref Buffering**: Throttles raw streams in React Refs, updating React state only on worker outputs, saving hundreds of re-render loops.
* **DPI Auto-Scaling**: Normalizes lines against High-DPI screens to prevent blurry stroke artifacts.

---

## Future Roadmap

1. **WebGL Integration**: Transition the 2D Canvas context to WebGL for rendering million-point datasets under 60 FPS.
2. **Transferable Arrays**: Transition Web Worker messaging to use zero-copy transferable ArrayBuffers.
3. **Historical Querying**: Add database adapters to query historical ranges.
