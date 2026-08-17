'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  FileText,
  Settings,
  Menu,
  X,
  Radio,
  Lock,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  if (pathname === '/login') {
    return null;
  }

  const navItems = [
    {
      label: 'Overview',
      href: '/',
      icon: LayoutDashboard,
      active: pathname === '/',
    },
    {
      label: 'Produk',
      href: '/products',
      icon: Package,
      active: pathname.startsWith('/products'),
    },
    {
      label: 'Draft Threads',
      href: '/drafts',
      icon: FileText,
      active: pathname.startsWith('/drafts'),
    },
    {
      label: 'Konfigurasi',
      href: '/settings',
      icon: Settings,
      active: pathname.startsWith('/settings'),
    },
  ];

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (err) {
      window.location.href = '/login';
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-threads-border bg-[#0A0A0A]/90 backdrop-blur-md">
      <div className="mx-auto flex h-15 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo (Swiss Minimalist Editorial) */}
        <div className="flex items-center space-x-6">
          <Link
            href="/"
            className="group flex items-center space-x-2.5 transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black font-bold text-sm tracking-tighter shadow-sm transition-transform duration-200 group-hover:scale-105">
              @
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-white flex items-center gap-1">
                THREADS <span className="text-zinc-400 font-normal">STUDIO</span>
              </span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-400">
                Marketing Engine
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-threads-border">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative flex items-center space-x-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 active:scale-[0.97]',
                    item.active
                      ? 'bg-[#181818] text-white border border-[#282828] shadow-xs'
                      : 'text-zinc-400 hover:bg-[#141414] hover:text-zinc-200'
                  )}
                >
                  <Icon className={cn('h-3.5 w-3.5', item.active ? 'text-white' : 'text-zinc-400')} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side status & lock button */}
        <div className="hidden sm:flex items-center space-x-3">
          <div className="flex items-center space-x-2 rounded-full border border-threads-border bg-[#121212] px-3 py-1 text-xs text-zinc-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span className="font-mono text-[11px] text-zinc-300 font-medium">Hermes AI</span>
            <span className="font-mono text-[10px] text-zinc-400 border-l border-zinc-800 pl-1.5">v1.0</span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            title="Kunci Dashboard / Logout"
            className="flex items-center space-x-1.5 rounded-lg border border-threads-border bg-[#121212] px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-700 hover:bg-[#181818] hover:text-zinc-200 transition-all duration-150 active:scale-[0.96] disabled:opacity-50"
          >
            <Lock className="h-3.5 w-3.5" />
            <span className="hidden lg:inline text-[11px] font-medium">Kunci</span>
          </button>
        </div>

        {/* Mobile menu button */}
        <div className="flex items-center space-x-2 md:hidden">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            title="Kunci Dashboard"
            className="inline-flex items-center justify-center rounded-lg p-2 text-zinc-400 hover:bg-[#141414] hover:text-zinc-200 focus:outline-none"
          >
            <Lock className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-zinc-400 hover:bg-[#141414] hover:text-white focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="border-b border-threads-border bg-[#121212] px-4 pt-2 pb-4 md:hidden animate-fadeIn">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    item.active
                      ? 'bg-[#181818] text-white border border-[#282828]'
                      : 'text-zinc-400 hover:bg-[#181818] hover:text-white'
                  )}
                >
                  <Icon className={cn('h-4 w-4', item.active ? 'text-white' : 'text-zinc-400')} />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Kunci Dashboard</span>
            </button>
          </div>
          <div className="mt-3 pt-3 border-t border-threads-border flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center space-x-1.5">
              <Radio className="h-3 w-3 text-emerald-400" />
              <span>Hermes Engine Connected</span>
            </span>
            <span className="font-mono text-[10px] text-zinc-400 uppercase">Autonomous</span>
          </div>
        </div>
      )}
    </header>
  );
}

