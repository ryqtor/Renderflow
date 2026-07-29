'use client';

import React, { useEffect } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default function DashboardError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log telemetry error
    console.error('Renderflow error boundary captured:', error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center py-12 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 text-red-500 mb-4">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">Dashboard Telemetry Error</h3>
      <p className="max-w-md text-xs text-muted-foreground mt-2 leading-relaxed">
        An unexpected error occurred during high-frequency data streams processing or canvas drawing.
      </p>
      <div className="rounded border border-border bg-muted/30 p-3 mt-4 text-[10px] text-muted-foreground font-mono truncate max-w-lg select-all">
        {error.message || 'ENGINE_INTERNAL_FATAL'}
      </div>
      <button
        onClick={() => reset()}
        className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-xs font-semibold text-foreground transition-all hover:bg-muted mt-6"
      >
        <RotateCcw className="mr-2 h-3.5 w-3.5" />
        Reset Engine
      </button>
    </div>
  );
}
