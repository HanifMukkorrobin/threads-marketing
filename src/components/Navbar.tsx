'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  FileText,
  Settings,
  Sparkles,
  Menu,
  X,
  Radio,
  Lock,
  LogOut,
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
      label: 'Dashboard',
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
      label: 'Draft Konten',
      href: '/drafts',
      icon: FileText,
      active: pathname.startsWith('/drafts'),
    },
    {
      label: 'Pengaturan',
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
    <header className="sticky top-0 z-40 w-full border-b border-threads-border bg-threads-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-6">
          <Link
            href="/"
            className="group flex items-center space-x-2.5 transition-opacity hover:opacity-90"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-threads-accent to-sky-400 font-bold text-white shadow-sm shadow-threads-accent/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight text-threads-text">
                Threads Engine
              </span>
              <span className="text-[10px] font-medium text-threads-secondary">
                Marketing & Copy Automation
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
                    'flex items-center space-x-2 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150',
                    item.active
                      ? 'bg-threads-surface text-threads-text border border-threads-border shadow-sm'
                      : 'text-threads-secondary hover:bg-threads-card hover:text-threads-text'
                  )}
                >
                  <Icon className={cn('h-4 w-4', item.active ? 'text-threads-accent' : 'text-threads-secondary')} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side status & lock button */}
        <div className="hidden sm:flex items-center space-x-3">
          <div className="flex items-center space-x-2 rounded-full border border-threads-border bg-threads-card px-3 py-1 text-xs text-threads-secondary">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-threads-success opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-threads-success"></span>
            </span>
            <span className="font-mono text-[11px] text-zinc-300">Hermes API</span>
            <span className="text-[10px] text-threads-secondary">v1.0</span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            title="Kunci Dashboard / Logout"
            className="flex items-center space-x-1.5 rounded-lg border border-threads-border bg-threads-card px-2.5 py-1.5 text-xs text-threads-secondary hover:border-zinc-700 hover:bg-threads-surface hover:text-rose-400 transition-all disabled:opacity-50"
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
            className="inline-flex items-center justify-center rounded-lg p-2 text-threads-secondary hover:bg-threads-card hover:text-rose-400 focus:outline-none"
          >
            <Lock className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-threads-secondary hover:bg-threads-card hover:text-threads-text focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="border-b border-threads-border bg-threads-card px-4 pt-2 pb-4 md:hidden">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    item.active
                      ? 'bg-threads-surface text-threads-text border border-threads-border'
                      : 'text-threads-secondary hover:bg-threads-surface hover:text-threads-text'
                  )}
                >
                  <Icon className={cn('h-5 w-5', item.active ? 'text-threads-accent' : 'text-threads-secondary')} />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>Kunci Dashboard</span>
            </button>
          </div>
          <div className="mt-4 pt-3 border-t border-threads-border flex items-center justify-between text-xs text-threads-secondary">
            <span className="flex items-center space-x-1.5">
              <Radio className="h-3.5 w-3.5 text-threads-success" />
              <span>Hermes Engine Connected</span>
            </span>
            <span className="font-mono text-[10px] text-zinc-500">Autonomous</span>
          </div>
        </div>
      )}
    </header>
  );
}
