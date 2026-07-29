'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useDashboard } from '../providers/DashboardProvider';
import { useVirtualScroll } from '../../hooks/useVirtualScroll';
import { AlertCircle, AlertTriangle, Info, Search } from 'lucide-react';

const ROW_HEIGHT = 38; // px

export default function VirtualizedTable() {
  const { logs } = useDashboard();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(400);
  const [filterText, setFilterText] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');

  // Filter logs locally if user searches / filters
  const filteredLogs = React.useMemo(() => {
    return logs.filter(log => {
      const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
      const matchesSearch = filterText === '' ||
        log.message.toLowerCase().includes(filterText.toLowerCase()) ||
        log.category.toLowerCase().includes(filterText.toLowerCase());
      return matchesLevel && matchesSearch;
    });
  }, [logs, filterText, levelFilter]);

  // Adjust container height dynamically on resize
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver(entries => {
      if (entries.length > 0) {
        setContainerHeight(Math.max(150, entries[0].contentRect.height - 48)); // subtract header/filter offset
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Hook up custom virtual scrolling
  const {
    indices,
    topSpacerHeight,
    bottomSpacerHeight,
    onScroll
  } = useVirtualScroll({
    itemCount: filteredLogs.length,
    rowHeight: ROW_HEIGHT,
    containerHeight,
    overscan: 12
  });

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card">
      {/* Filtering Header Toolbar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Active Logs Stream</span>
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">
            {filteredLogs.length.toLocaleString()} of {logs.length.toLocaleString()} rows
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {/* Search bar */}
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 h-3 w-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search logs..."
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              className="h-7 w-40 rounded-md border border-border bg-background pl-7 pr-2.5 text-xs text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none md:w-56"
            />
          </div>

          {/* Level Filter dropdown */}
          <select
            value={levelFilter}
            onChange={e => setLevelFilter(e.target.value as 'all' | 'info' | 'warn' | 'error')}
            className="h-7 rounded-md border border-border bg-background px-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            <option value="all">All Levels</option>
            <option value="info">Info</option>
            <option value="warn">Warnings</option>
            <option value="error">Errors</option>
          </select>
        </div>
      </div>

      {/* Scrollable Container */}
      <div
        ref={containerRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto w-full"
        style={{ height: `${containerHeight}px` }}
      >
        {filteredLogs.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-12 text-muted-foreground">
            <Info className="h-8 w-8 mb-2 stroke-1 text-muted-foreground/60" />
            <p className="text-xs">No matching log entries found</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="sticky top-0 z-10 bg-card border-b border-border shadow-[0_1px_0_0_rgba(229,231,235,1)] dark:shadow-[0_1px_0_0_rgba(31,31,35,1)]">
              <tr className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground h-9">
                <th className="w-24 px-4 font-semibold">Timestamp</th>
                <th className="w-20 px-2 font-semibold">Level</th>
                <th className="w-24 px-2 font-semibold">Category</th>
                <th className="px-2 font-semibold">Message</th>
                <th className="w-16 px-2 font-semibold text-right">CPU</th>
                <th className="w-20 px-4 font-semibold text-right">Latency</th>
              </tr>
            </thead>
            <tbody>
              {/* Top Padding Spacer */}
              <tr style={{ height: `${topSpacerHeight}px` }}>
                <td colSpan={6} className="p-0 border-0" />
              </tr>

              {/* Rendered Visible Log Rows */}
              {indices.map(idx => {
                const log = filteredLogs[idx];
                if (!log) return null;

                const dateStr = new Date(log.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                }) + `.${String(log.timestamp % 1000).padStart(3, '0')}`;

                return (
                  <tr
                    key={log.id}
                    className="border-b border-border hover:bg-muted/30 text-xs font-mono group transition-colors duration-150"
                    style={{ height: `${ROW_HEIGHT}px` }}
                  >
                    <td className="px-4 text-muted-foreground truncate select-all">{dateStr}</td>
                    <td className="px-2 truncate">
                      <span className={`inline-flex items-center space-x-1 font-sans text-[10px] font-semibold uppercase`}>
                        {log.level === 'error' && (
                          <span className="text-red-600 dark:text-red-400 flex items-center">
                            <AlertCircle className="h-3 w-3 mr-0.5" /> Error
                          </span>
                        )}
                        {log.level === 'warn' && (
                          <span className="text-amber-600 dark:text-amber-400 flex items-center">
                            <AlertTriangle className="h-3 w-3 mr-0.5" /> Warn
                          </span>
                        )}
                        {log.level === 'info' && (
                          <span className="text-blue-600 dark:text-blue-400 flex items-center">
                            <Info className="h-3 w-3 mr-0.5" /> Info
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-2 truncate">
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-foreground capitalize">
                        {log.category}
                      </span>
                    </td>
                    <td className="px-2 truncate text-foreground font-sans group-hover:text-clip" title={log.message}>
                      {log.message}
                    </td>
                    <td className="px-2 text-right font-semibold text-muted-foreground">{log.cpu}%</td>
                    <td className="px-4 text-right font-semibold text-foreground">{log.latency}ms</td>
                  </tr>
                );
              })}

              {/* Bottom Padding Spacer */}
              <tr style={{ height: `${bottomSpacerHeight}px` }}>
                <td colSpan={6} className="p-0 border-0" />
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
