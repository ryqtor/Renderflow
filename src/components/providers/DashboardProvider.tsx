'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { DataPoint, AggregatedStats, LogEntry, ActiveTab, PerformanceMetrics } from '../../types/dashboard';
import { generateInitialHistory, generateSinglePoint } from '../../lib/dataGenerator';
import { useWebWorker } from '../../hooks/useWebWorker';

interface DashboardContextType {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  
  // Streaming state
  isStreaming: boolean;
  setIsStreaming: (streaming: boolean) => void;
  streamSpeed: number;
  setStreamSpeed: (speed: number) => void;
  
  // Data
  rawData: DataPoint[]; // Sliding window active data
  downsampledData: { timestamp: number; value: number }[];
  heatmapData: { region: string; latencyBucket: number; count: number }[];
  stats: AggregatedStats | null;
  logs: LogEntry[];
  clearLogs: () => void;
  
  // Performance
  perfMetrics: PerformanceMetrics;
  updateRenderTime: (ms: number) => void;
  
  // Stress Test
  runStressTest: (pointsCount: number) => void;
  isStressTesting: boolean;
  benchmarkResult: {
    pointsCount: number;
    processingTime: number;
    renderTime: number;
    fps: number;
  } | null;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

const MAX_WINDOW_SIZE = 5000; // Sliding window size for live view

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isStreaming, setIsStreaming] = useState(true);
  const [streamSpeed, setStreamSpeed] = useState(100); // ms
  
  // High-frequency raw data stored in a ref to bypass React rendering cycles
  const rawDataRef = useRef<DataPoint[]>([]);
  const [rawDataState, setRawDataState] = useState<DataPoint[]>([]);
  
  // Throttled UI states driven by the Web Worker
  const [downsampledData, setDownsampledData] = useState<{ timestamp: number; value: number }[]>([]);
  const [heatmapData, setHeatmapData] = useState<{ region: string; latencyBucket: number; count: number }[]>([]);
  const [stats, setStats] = useState<AggregatedStats | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // Stress test states
  const [isStressTesting, setIsStressTesting] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<DashboardContextType['benchmarkResult']>(null);
  
  // Performance indicators
  const [perfMetrics, setPerfMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    renderTime: 0,
    processingTime: 0,
    droppedFrames: 0,
    memoryUsage: 0,
    memoryLimit: 0,
    workerTime: 0,
    totalPoints: 0
  });

  const lastRenderTime = useRef(0);
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize theme from document class list or localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
      setTheme(initialTheme);
      
      if (initialTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const nextTheme = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', nextTheme);
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return nextTheme;
    });
  }, []);

  // Helper to add logs efficiently
  const addLogEntry = useCallback((level: LogEntry['level'], message: string, category: string, latency = 0) => {
    setLogs(prev => {
      const newEntry: LogEntry = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        level,
        message,
        category,
        latency,
        cpu: rawDataRef.current[rawDataRef.current.length - 1]?.cpu || 0
      };
      // Keep up to 500 logs in the scroll buffer unless stress testing virtual scroll
      const list = prev.length > 500 ? prev.slice(-500) : prev;
      return [...list, newEntry];
    });
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Web Worker messaging interfaces
  interface WorkerOutputMessage {
    action: 'analyze_result';
    payload: {
      stats: AggregatedStats | null;
      downsampledLineData: { timestamp: number; value: number }[];
      heatmapData: { region: string; latencyBucket: number; count: number }[];
      duration: number;
    };
  }

  interface WorkerInputMessage {
    action: 'analyze';
    payload: {
      data: DataPoint[];
      downsampleThreshold?: number;
    };
  }

  // Web Worker for asynchronous analysis & downsampling
  const handleWorkerResult = useCallback((message: WorkerOutputMessage) => {
    const { action, payload } = message;
    if (action === 'analyze_result') {
      const { stats: workerStats, downsampledLineData, heatmapData: workerHeatmap, duration } = payload;
      
      // Update UI states
      setStats(workerStats);
      setDownsampledData(downsampledLineData);
      setHeatmapData(workerHeatmap);
      
      const perf = typeof window !== 'undefined' ? window.performance as Performance & {
        memory?: { usedJSHeapSize: number; jsHeapLimit: number };
      } : null;

      // Update performance metrics
      setPerfMetrics(prev => ({
        ...prev,
        processingTime: duration,
        totalPoints: rawDataRef.current.length,
        memoryUsage: perf?.memory 
          ? Math.round(perf.memory.usedJSHeapSize / (1024 * 1024))
          : 0,
        memoryLimit: perf?.memory 
          ? Math.round(perf.memory.jsHeapLimit / (1024 * 1024))
          : 0
      }));

      // Add a log entry for statistical aggregation completeness
      if (Math.random() > 0.85) {
        addLogEntry('info', `Analyzed ${rawDataRef.current.length} points in worker (${duration}ms)`, 'worker', duration);
      }
    }
  }, [addLogEntry]);

  const { postMessage } = useWebWorker<WorkerInputMessage, WorkerOutputMessage>(handleWorkerResult);

  // Set up initial history data
  useEffect(() => {
    const initialData = generateInitialHistory(1000, 100);
    rawDataRef.current = initialData;
    setRawDataState([...initialData]);
    
    // Perform initial worker analysis
    postMessage({
      action: 'analyze',
      payload: { data: initialData, downsampleThreshold: 1000 }
    });

    // Populate a large set of mock logs for virtual scrolling validation (100k entries)
    const initLogs: LogEntry[] = [];
    const categories = ['network', 'database', 'auth', 'renderer', 'worker'];
    
    for (let i = 0; i < 100000; i++) {
      initLogs.push({
        id: `log-${i}`,
        timestamp: Date.now() - (100000 - i) * 50,
        level: i % 100 === 0 ? 'error' : i % 25 === 0 ? 'warn' : 'info',
        message: i % 100 === 0 
          ? `Connection timeout on cluster node ${i % 5}` 
          : i % 25 === 0 
            ? `Memory threshold warning: heap size exceeded 85%` 
            : `API request processed successfully for category ${categories[i % categories.length]}`,
        category: categories[i % categories.length],
        latency: Math.floor(10 + Math.random() * 90),
        cpu: Math.floor(10 + Math.random() * 80)
      });
    }
    setLogs(initLogs);
    addLogEntry('info', 'Initialized 100,000 virtual log rows for stress testing virtualization', 'system');
  }, [postMessage, addLogEntry]);

  // Live Streaming data loop
  useEffect(() => {
    if (!isStreaming || isStressTesting) {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
      return;
    }

    const runStream = () => {
      const nextPoint = generateSinglePoint();
      
      // Update ref (O(1) insertion)
      const data = rawDataRef.current;
      data.push(nextPoint);
      
      // Sliding window crop
      if (data.length > MAX_WINDOW_SIZE) {
        data.shift();
      }
      
      // Trigger Web Worker calculation
      postMessage({
        action: 'analyze',
        payload: { data, downsampleThreshold: 1000 }
      });

      // Update state for components that need the raw list
      // (throttled to avoid heavy react DOM cycles)
      if (data.length % 2 === 0) {
        setRawDataState([...data]);
      }
    };

    streamIntervalRef.current = setInterval(runStream, streamSpeed);

    return () => {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    };
  }, [isStreaming, streamSpeed, isStressTesting, postMessage]);

  // Trigger manual render profiling time
  const updateRenderTime = useCallback((ms: number) => {
    lastRenderTime.current = ms;
    setPerfMetrics(prev => ({
      ...prev,
      renderTime: parseFloat(ms.toFixed(2))
    }));
  }, []);

  // Stress Test Functionality
  const runStressTest = useCallback((pointsCount: number) => {
    setIsStressTesting(true);
    addLogEntry('info', `Starting Stress Test with ${pointsCount} data points...`, 'stress-test');
    
    // Turn off streaming during stress test
    setIsStreaming(false);

    // Run in a setTimeout to allow UI to render spinner / loading state
    setTimeout(() => {
      const startT = performance.now();
      const testData = generateInitialHistory(pointsCount, 10);
      rawDataRef.current = testData;
      setRawDataState(testData);

      // Perform direct analysis in worker
      postMessage({
        action: 'analyze',
        payload: { data: testData, downsampleThreshold: 2000 }
      });

      const prepTime = performance.now() - startT;
      addLogEntry('info', `Generated ${pointsCount} points in ${prepTime.toFixed(1)}ms. Downsampling in worker.`, 'stress-test');

      // Listen for next worker message to measure render completion
      if (workerRef.current) {
        workerRef.current.onmessage = (event: MessageEvent) => {
          const { action: callbackAction, payload: callbackPayload } = event.data;
          if (callbackAction === 'analyze_result') {
            const { stats: wStats, downsampledLineData, heatmapData: wHeatmap, duration: wDuration } = callbackPayload;
            
            setStats(wStats);
            setDownsampledData(downsampledLineData);
            setHeatmapData(wHeatmap);

            // Wait brief moment for canvas render loop to paint
            setTimeout(() => {
              const renderTime = lastRenderTime.current;
              
              setBenchmarkResult({
                pointsCount,
                processingTime: parseFloat(wDuration.toFixed(2)),
                renderTime,
                fps: 60 - Math.min(20, Math.floor(renderTime / 4)) // Estimated frame score
              });
              
              setIsStressTesting(false);
              addLogEntry('info', `Stress test completed: Processed ${pointsCount} points in worker (${wDuration.toFixed(1)}ms), painted canvas in ${renderTime.toFixed(1)}ms`, 'stress-test');
              
              // Restore normal worker handler
              if (workerRef.current) {
                workerRef.current.onmessage = (ev: MessageEvent) => handleWorkerResult(ev.data);
              }
            }, 50);
          }
        };
      }
    }, 100);
  }, [postMessage, addLogEntry, handleWorkerResult]);

  // Keep a reference to worker for stress test interceptor
  const workerRef = useRef<Worker | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const tempWorker = new Worker(
        new URL('../../workers/analytics.worker.ts', import.meta.url),
        { type: 'module' }
      );
      workerRef.current = tempWorker;
      tempWorker.onmessage = (ev) => handleWorkerResult(ev.data);
      return () => {
        tempWorker.terminate();
      };
    } catch(e) {
      console.error(e);
    }
  }, [handleWorkerResult]);

  return (
    <DashboardContext.Provider
      value={{
        activeTab,
        setActiveTab,
        theme,
        toggleTheme,
        isStreaming,
        setIsStreaming,
        streamSpeed,
        setStreamSpeed,
        rawData: rawDataState,
        downsampledData,
        heatmapData,
        stats,
        logs,
        clearLogs,
        perfMetrics,
        updateRenderTime,
        runStressTest,
        isStressTesting,
        benchmarkResult
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
