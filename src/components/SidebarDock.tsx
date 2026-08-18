'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutGrid,
  FileText,
  Package,
  Sliders,
  Plus,
  Lock,
  Zap,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function SidebarDock() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  // If on login page, hide dock/nav
  if (pathname === '/login') {
    return null;
  }

  const navItems = [
    { href: '/', label: 'OVERVIEW' },
    { href: '/drafts', label: 'DRAFTS PIPELINE' },
    { href: '/products', label: 'KATALOG PRODUK' },
    { href: '/settings', label: 'PENGATURAN' },
  ];

  const handleQuickLock = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    router.push('/login');
  };

  return (
    <>
      {/* Top Editorial Retro Navigation Bar */}
      <header className="w-full bg-[#FAF6EE] border-b-[2.5px] border-[#181816] px-5 sm:px-8 py-3.5 flex items-center justify-between select-none z-30">
        {/* Left: Retro Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex items-center gap-1">
            <span className="h-3 w-3 bg-[#6B9AC4] border border-[#181816] inline-block shadow-[1px_1px_0px_0px_#181816]" />
            <span className="h-3 w-3 bg-[#C95D53] border border-[#181816] inline-block shadow-[1px_1px_0px_0px_#181816]" />
            <span className="h-3 w-3 bg-[#D8C49D] border border-[#181816] inline-block shadow-[1px_1px_0px_0px_#181816]" />
          </div>
          <span className="font-black text-xs sm:text-sm tracking-wider uppercase text-[#181816]">
            Threads Marketing
          </span>
        </Link>

        {/* Center: Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8">
          {navItems.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'text-xs font-black tracking-widest transition-all uppercase py-1',
                  isActive
                    ? 'text-[#181816] border-b-2 border-[#181816] shadow-[0_2px_0px_0px_#6B9AC4]'
                    : 'text-[#4A463F] hover:text-[#181816] hover:border-b-2 hover:border-[#181816]'
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Lock Dashboard */}
          <button
            type="button"
            onClick={handleQuickLock}
            title="Kunci Dashboard (PIN)"
            className="hidden sm:flex h-9 w-9 items-center justify-center rounded-retro-xs bg-white hover:bg-[#D8C49D] text-[#181816] border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
          >
            <Lock className="h-4 w-4 stroke-[2.5]" />
          </button>

          {/* Primary Action Button (Dusty Coral with shopping bag / draft icon) */}
          <Link
            href="/drafts?create=true"
            className="flex items-center gap-2 px-4 sm:px-5 py-2 rounded-retro-xs bg-[#C95D53] hover:bg-[#D45D52] text-white text-xs font-black border-2 border-[#181816] shadow-[3px_3px_0px_0px_#181816] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none transition-all tap-effect"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span className="tracking-wider uppercase">Buat Draft</span>
          </Link>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-retro-xs bg-white text-[#181816] border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816]"
          >
            {mobileOpen ? <X className="h-4 w-4 stroke-[3]" /> : <Menu className="h-4 w-4 stroke-[3]" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs pt-16 px-4 pb-6">
          <div className="bg-[#FAF6EE] rounded-retro p-5 shadow-[6px_6px_0px_0px_#181816] border-2 border-[#181816] space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#181816]">
              <span className="text-xs font-black text-[#181816] uppercase tracking-wider">
                Navigasi Menu
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-retro-xs bg-[#D8C49D] text-[#181816] border border-[#181816] text-[10px] font-black">
                <span className="h-1.5 w-1.5 rounded-full bg-[#181816] animate-pulse" />
                Hermes 90s
              </span>
            </div>

            <nav className="flex flex-col gap-2">
              {navItems.map((item) => {
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center justify-between px-4 py-2.5 rounded-retro-xs text-xs font-black border-2 border-[#181816] transition-all',
                      isActive
                        ? 'bg-[#6B9AC4] text-white shadow-[2px_2px_0px_0px_#181816]'
                        : 'bg-white text-[#181816] hover:bg-[#FAF6EE] shadow-[1.5px_1.5px_0px_0px_#181816]'
                    )}
                  >
                    <span>{item.label}</span>
                    <span>→</span>
                  </Link>
                );
              })}
            </nav>

            <div className="pt-2 border-t-2 border-[#181816] flex items-center justify-between">
              <button
                type="button"
                onClick={handleQuickLock}
                className="flex items-center gap-1.5 text-xs font-bold text-[#181816] hover:underline"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Kunci Dashboard</span>
              </button>

              <Link
                href="/settings"
                onClick={() => setMobileOpen(false)}
                className="text-xs font-black text-[#181816] underline"
              >
                Pengaturan ↗
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
