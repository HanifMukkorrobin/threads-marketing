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
  Globe,
  MoreHorizontal,
  ChevronRight,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function SidebarDock() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  // If on login page, hide dock
  if (pathname === '/login') {
    return null;
  }

  const navItems = [
    { href: '/', label: 'Overview', icon: LayoutGrid },
    { href: '/drafts', label: 'Drafts Hub', icon: FileText },
    { href: '/products', label: 'Products', icon: Package },
    { href: '/settings', label: 'Settings', icon: Sliders },
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
      {/* Desktop Vertical Pill Dock */}
      <aside className="hidden lg:flex flex-col items-center justify-between w-16 py-5 bg-[#121214] rounded-[28px] shadow-dock select-none shrink-0 sticky top-7 h-[calc(100vh-3.5rem)] z-30">
        {/* Top: Circular Add Button */}
        <div className="flex flex-col items-center gap-4">
          <Link
            href="/drafts?create=true"
            title="Create New Draft"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#222226] text-white hover:bg-lime hover:text-ink transition-all duration-200 tap-effect group"
          >
            <Plus className="h-5 w-5 transition-transform duration-200 group-hover:rotate-90 stroke-[2.5]" />
          </Link>

          <div className="w-6 h-[1px] bg-white/10" />

          {/* Navigation Links */}
          <nav className="flex flex-col items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={cn(
                    'relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 tap-effect',
                    isActive
                      ? 'bg-white text-ink shadow-pill font-bold'
                      : 'text-zinc-400 hover:text-white hover:bg-white/10'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {isActive && (
                    <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-3 rounded-full bg-lime" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions: Hermes Status & Lock & Avatar */}
        <div className="flex flex-col items-center gap-3">
          {/* Hermes Agent Pulse Badge */}
          <div
            title="Hermes Autonomous Engine: Active"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1C1C20] text-lime border border-lime/20"
          >
            <Zap className="h-3.5 w-3.5 animate-pulse" />
          </div>

          {/* Quick Lock Action */}
          <button
            type="button"
            onClick={handleQuickLock}
            title="Lock Dashboard (PIN)"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors tap-effect"
          >
            <Lock className="h-3.5 w-3.5" />
          </button>

          {/* User / Store Avatar */}
          <Link
            href="/settings"
            title="Store Profile & Settings"
            className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-lime to-emerald-400 p-[2px] tap-effect"
          >
            <div className="flex h-full w-full items-center justify-center rounded-full bg-[#121214] text-[10px] font-bold text-white uppercase">
              @
            </div>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-lime border-2 border-[#121214]" />
          </Link>
        </div>
      </aside>

      {/* Mobile Top App Bar & Drawer */}
      <div className="lg:hidden fixed top-3 left-3 right-3 z-40 bg-[#121214]/95 backdrop-blur-md rounded-full px-4 py-2.5 shadow-dock flex items-center justify-between border border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-lime text-ink font-extrabold text-xs">
            @
          </div>
          <span className="font-bold text-xs tracking-tight text-white">
            Threads Studio
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/drafts?create=true"
            className="flex h-7 px-3 items-center justify-center rounded-full bg-lime text-ink text-[11px] font-bold tap-effect"
          >
            + Draft
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 rounded-full bg-white/10 text-white"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm pt-16 px-4 pb-6">
          <div className="bg-[#121214] rounded-[28px] p-5 shadow-2xl border border-white/10 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Navigation
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-lime font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-lime animate-pulse" />
                Hermes Online
              </span>
            </div>

            <nav className="grid grid-cols-2 gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
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
                      'flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-semibold transition-all',
                      isActive
                        ? 'bg-white text-ink shadow-sm'
                        : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <button
                type="button"
                onClick={handleQuickLock}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Kunci Dashboard</span>
              </button>

              <Link
                href="/settings"
                onClick={() => setMobileOpen(false)}
                className="text-xs text-lime font-medium"
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
