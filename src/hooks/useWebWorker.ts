import { useEffect, useRef, useCallback } from 'react';

export function useWebWorker<TInput, TOutput>(
  onMessage: (data: TOutput) => void
) {
  const workerRef = useRef<Worker | null>(null);
  const onMessageRef = useRef(onMessage);

  // Sync onMessage callback without re-triggering effects
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      // Standard Next.js Web Worker syntax supported by Webpack/Turbopack
      const worker = new Worker(
        new URL('../workers/analytics.worker.ts', import.meta.url),
        { type: 'module' }
      );

      workerRef.current = worker;

      worker.onmessage = (event: MessageEvent<TOutput>) => {
        onMessageRef.current(event.data);
      };

      return () => {
        worker.terminate();
        workerRef.current = null;
      };
    } catch (error) {
      console.error('Failed to initialize analytics web worker:', error);
    }
  }, []);

  const postMessage = useCallback((message: TInput) => {
    if (workerRef.current) {
      workerRef.current.postMessage(message);
    }
  }, []);

  return { postMessage, isSupported: typeof window !== 'undefined' && !!window.Worker };
}
