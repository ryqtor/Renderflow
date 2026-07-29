'use client';

import React from 'react';
import { DashboardProvider } from '../../components/providers/DashboardProvider';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import BottomPanel from '../../components/layout/BottomPanel';

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground transition-colors duration-200">
        {/* Header (Top Panel) */}
        <Header />

        {/* Sidebar & Content area */}
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-background p-6 transition-colors duration-200">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </div>

        {/* Footer (Developer telemetry logs) */}
        <BottomPanel />
      </div>
    </DashboardProvider>
  );
}
