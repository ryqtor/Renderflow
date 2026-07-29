import React from 'react';

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Skeleton Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 rounded-xl border border-border bg-card p-4">
            <div className="h-3 w-16 bg-muted rounded"></div>
            <div className="mt-3 h-6 w-24 bg-muted rounded"></div>
          </div>
        ))}
      </div>

      {/* Skeleton Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-[380px] rounded-xl border border-border bg-card p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="h-4 w-32 bg-muted rounded"></div>
              <div className="h-6 w-20 bg-muted rounded"></div>
            </div>
            <div className="h-64 bg-muted/40 rounded-lg"></div>
          </div>
        ))}
      </div>

      {/* Skeleton Logs Table */}
      <div className="h-[400px] rounded-xl border border-border bg-card p-4">
        <div className="flex justify-between items-center mb-4 border-b border-border pb-3">
          <div className="h-4 w-28 bg-muted rounded"></div>
          <div className="h-7 w-40 bg-muted rounded"></div>
        </div>
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-6 bg-muted/40 rounded w-full"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
