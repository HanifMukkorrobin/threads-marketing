'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { SidebarDock } from '@/components/SidebarDock';

interface IslandLayoutProps {
  children: React.ReactNode;
}

export function IslandLayout({ children }: IslandLayoutProps) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <main className="min-h-screen bg-canvas">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-canvas p-3 sm:p-5 lg:p-7 flex gap-4 lg:gap-6">
      {/* Persistent Left Dock */}
      <SidebarDock />

      {/* Main Floating Island Container */}
      <main className="flex-1 bg-island rounded-[28px] sm:rounded-[36px] shadow-island border border-surface-border/60 overflow-hidden flex flex-col min-h-[calc(100vh-2.5rem)] lg:min-h-[calc(100vh-3.5rem)] mt-12 lg:mt-0">
        {children}
      </main>
    </div>
  );
}
