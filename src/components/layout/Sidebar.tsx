'use client';

import React from 'react';
import { useDashboard } from '../providers/DashboardProvider';
import { ActiveTab } from '../../types/dashboard';
import {
  LayoutDashboard,
  Activity,
  Grid3X3,
  BarChart3,
  Cpu,
  Zap,
  Settings as SettingsIcon
} from 'lucide-react';

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'live-charts', label: 'Live Charts', icon: Activity },
  { id: 'heatmap', label: 'Heatmap Matrix', icon: Grid3X3 },
  { id: 'analytics', label: 'Worker Analytics', icon: BarChart3 },
  { id: 'performance', label: 'Perf Monitor', icon: Cpu },
  { id: 'stress-test', label: 'Stress Benchmark', icon: Zap },
  { id: 'settings', label: 'Settings', icon: SettingsIcon }
];

export default function Sidebar() {
  const { activeTab, setActiveTab, isStressTesting } = useDashboard();

  return (
    <aside className="w-16 flex-shrink-0 border-r border-border bg-card transition-colors duration-200 md:w-60">
      <div className="flex h-full flex-col justify-between py-4">
        {/* Navigation list */}
        <nav className="space-y-1 px-3">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                disabled={isStressTesting && item.id !== 'stress-test'}
                className={`flex w-full items-center justify-center rounded-md py-2 text-xs font-medium transition-all md:justify-start md:px-3 md:py-2 md:text-sm ${
                  isActive
                    ? 'bg-accent text-accent-foreground font-semibold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                } ${isStressTesting && item.id !== 'stress-test' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Icon className={`h-4 w-4 md:mr-3 ${isActive ? 'text-accent-foreground' : 'text-muted-foreground'}`} />
                <span className="hidden md:inline">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer info in sidebar */}
        <div className="hidden border-t border-border px-6 pt-4 text-[11px] text-muted-foreground md:block">
          <p className="font-semibold text-foreground">Renderflow Engine</p>
          <p className="mt-0.5">Dual-Buffer Canvas + SVG</p>
        </div>
      </div>
    </aside>
  );
}
