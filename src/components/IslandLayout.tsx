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
    return <main className="min-h-screen bg-[#D9C5A3] flex items-center justify-center p-4">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-[#D9C5A3] p-4 sm:p-7 lg:p-10 flex flex-col items-center justify-start">
      {/* Top Retro Banner Title */}
      <div className="w-full max-w-7xl text-center pb-4 select-none">
        <span className="text-white text-lg sm:text-2xl font-black tracking-[0.25em] uppercase drop-shadow-[0_2px_2px_rgba(0,0,0,0.15)]">
          THREADS MARKETING STUDIO
        </span>
      </div>

      {/* Main Retro Paper Frame Window */}
      <div className="w-full max-w-7xl bg-[#FAF6EE] rounded-none sm:rounded-retro-sm border-[2.5px] sm:border-[3px] border-[#181816] shadow-[6px_6px_0px_0px_#181816] sm:shadow-[12px_12px_0px_0px_#181816] flex flex-col overflow-hidden relative z-10 min-h-[calc(100vh-8rem)]">
        {/* Top Retro Header Bar */}
        <SidebarDock />

        {/* Interior Workspace */}
        <main className="flex-1 w-full bg-[#FAF6EE]">
          {children}
        </main>
      </div>
    </div>
  );
}
