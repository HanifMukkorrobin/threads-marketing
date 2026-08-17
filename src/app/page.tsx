'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Package,
  Plus,
  RefreshCw,
  AlertCircle,
  Copy,
  Check,
  ChevronRight,
  Sliders,
  ExternalLink,
  Bot,
  Zap,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowUpRight,
  Radio,
  FileText,
  Play,
  Terminal,
} from 'lucide-react';
import { ContentDraft } from '@/types/draft';
import { Product, CreateProductInput } from '@/types/product';
import { CreateDraftModal } from '@/components/CreateDraftModal';
import { ProductModal } from '@/components/ProductModal';
import { DraftStatusBadge, BatteryCapacityDots } from '@/components/DraftStatusBadge';
import { cn } from '@/lib/utils';

interface OverviewCounts {
  totalProducts: number;
  activeProducts: number;
  pendingDrafts: number;
  approvedDrafts: number;
  scheduledDrafts: number;
  publishedDrafts: number;
  failedDrafts: number;
  totalDrafts: number;
}

interface HermesStatus {
  isConfigured: boolean;
  hasApiKey: boolean;
  apiKeyPreview: string | null;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

export default function DashboardOverviewPage() {
  const [counts, setCounts] = useState<OverviewCounts>({
    totalProducts: 0,
    activeProducts: 0,
    pendingDrafts: 0,
    approvedDrafts: 0,
    scheduledDrafts: 0,
    publishedDrafts: 0,
    failedDrafts: 0,
    totalDrafts: 0,
  });
  const [recentPendingDrafts, setRecentPendingDrafts] = useState<ContentDraft[]>([]);
  const [recentPublishedDrafts, setRecentPublishedDrafts] = useState<ContentDraft[]>([]);
  const [hermesStatus, setHermesStatus] = useState<HermesStatus>({
    isConfigured: false,
    hasApiKey: false,
    apiKeyPreview: null,
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active navigation tab filter in dashboard
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'published'>('all');

  // Modals
  const [createDraftModalOpen, setCreateDraftModalOpen] = useState(false);
  const [createProductModalOpen, setCreateProductModalOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState<ContentDraft | null>(null);

  // Approving state
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [copiedKey, setCopiedKey] = useState(false);

  const addToast = useCallback(
    (message: string, type: 'success' | 'info' | 'error' = 'info') => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    },
    []
  );

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchOverviewData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [overviewRes, productsRes] = await Promise.all([
        fetch('/api/overview', { cache: 'no-store' }),
        fetch('/api/products', { cache: 'no-store' }),
      ]);

      const overviewData = await overviewRes.json();
      const productsData = await productsRes.json();

      if (overviewData.success) {
        setCounts(overviewData.counts || {});
        setRecentPendingDrafts(overviewData.recentPending || []);
        setRecentPublishedDrafts(overviewData.recentPublished || []);
        setHermesStatus(
          overviewData.hermesStatus || {
            isConfigured: false,
            hasApiKey: false,
            apiKeyPreview: null,
          }
        );
      } else {
        throw new Error(overviewData.error || 'Gagal memuat ringkasan data');
      }

      if (productsData.success) {
        setProducts(productsData.data || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan saat memuat dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverviewData();
  }, [fetchOverviewData]);

  const handleQuickApprove = async (draftId: string) => {
    try {
      setApprovingId(draftId);
      const res = await fetch(`/api/drafts/${draftId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyetujui draft');
      }

      addToast('Draft disetujui & masuk antrean posting!', 'success');
      setRecentPendingDrafts((prev) => prev.filter((d) => d.id !== draftId));
      setCounts((prev) => ({
        ...prev,
        pendingDrafts: Math.max(0, prev.pendingDrafts - 1),
        approvedDrafts: prev.approvedDrafts + 1,
      }));
    } catch (err: any) {
      addToast(err?.message || 'Terjadi kesalahan', 'error');
    } finally {
      setApprovingId(null);
    }
  };

  const handleSaveProduct = async (productData: CreateProductInput, id?: string) => {
    const isEdit = !!id;
    const url = isEdit ? `/api/products/${id}` : '/api/products';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Gagal menyimpan produk');
    }

    await fetchOverviewData();
    addToast('Produk baru berhasil disimpan!', 'success');
  };

  const handleCopyCliCommand = () => {
    const cmd = `npx tsx scripts/hermes-runner/hermes_mock_cron.ts --action=all --base-url=http://localhost:3000 --api-key=${hermesStatus.apiKeyPreview || 'hermes-secret-key-2026'}`;
    navigator.clipboard.writeText(cmd);
    setCopiedKey(true);
    addToast('Perintah runner Hermes berhasil disalin!', 'success');
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const approvalRate = counts.totalDrafts > 0
    ? Math.round(((counts.approvedDrafts + counts.publishedDrafts) / counts.totalDrafts) * 100)
    : 0;

  const batteryApproved = counts.totalDrafts > 0
    ? Math.min(8, Math.max(1, Math.round((counts.approvedDrafts / counts.totalDrafts) * 8)))
    : 0;

  const batteryTotal = counts.totalDrafts > 0
    ? Math.min(8, Math.max(1, Math.round((counts.totalDrafts / 50) * 8)))
    : 4;

  return (
    <div className="p-6 sm:p-8 lg:p-10 space-y-8 animate-fadeIn">
      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-center justify-between gap-3 px-4 py-2.5 rounded-full shadow-lg text-xs font-semibold animate-scale-in transition-all',
              toast.type === 'success' && 'bg-ink text-white border border-black',
              toast.type === 'error' && 'bg-rose-500 text-white',
              toast.type === 'info' && 'bg-surface text-ink border border-surface-border'
            )}
          >
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-white/60 hover:text-white"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Top Header: Expressive Headline with Inline Sticker Badges */}
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-ink tracking-tight flex flex-wrap items-center gap-x-2.5 gap-y-2">
            <span>Managing</span>
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-surface border border-surface-border text-ink shadow-sm">
              <Bot className="h-4 w-4" />
            </span>
            <span>Your Content</span>
            <span>and</span>
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-lime border border-lime-dark/30 text-ink text-sm font-black shadow-sm">
              ✦
            </span>
            <span>Workflows</span>
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary">
            Pusat kendali konten autopilot Threads, katalog produk, dan antrean posting mandiri.
          </p>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/settings"
            title="Settings"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface hover:bg-surface-hover border border-surface-border text-ink transition-all tap-effect"
          >
            <Sliders className="h-4 w-4" />
          </Link>

          <button
            type="button"
            onClick={() => {
              setEditingDraft(null);
              setCreateDraftModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-ink hover:bg-zinc-800 text-white font-bold text-xs shadow-pill transition-all tap-effect"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>+ Create a New Draft</span>
          </button>
        </div>
      </header>

      {/* Segmented Pill Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={cn(
            'px-5 py-2 rounded-full text-xs font-semibold transition-all tap-effect shrink-0',
            activeTab === 'all'
              ? 'bg-ink text-white shadow-pill'
              : 'bg-surface text-ink-secondary border border-surface-border hover:bg-surface-hover'
          )}
        >
          Overview
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all tap-effect shrink-0',
            activeTab === 'pending'
              ? 'bg-ink text-white shadow-pill'
              : 'bg-surface text-ink-secondary border border-surface-border hover:bg-surface-hover'
          )}
        >
          <span>Menunggu Review</span>
          <span className="rounded-full bg-amber-500/20 px-2 py-0.2 text-[10px] font-bold text-amber-700">
            {counts.pendingDrafts}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('approved')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all tap-effect shrink-0',
            activeTab === 'approved'
              ? 'bg-ink text-white shadow-pill'
              : 'bg-surface text-ink-secondary border border-surface-border hover:bg-surface-hover'
          )}
        >
          <span>Siap Posting</span>
          <span className="rounded-full bg-lime px-2 py-0.2 text-[10px] font-bold text-ink">
            {counts.approvedDrafts}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('published')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all tap-effect shrink-0',
            activeTab === 'published'
              ? 'bg-ink text-white shadow-pill'
              : 'bg-surface text-ink-secondary border border-surface-border hover:bg-surface-hover'
          )}
        >
          <span>Live Threads</span>
          <span className="rounded-full bg-sky-100 px-2 py-0.2 text-[10px] font-bold text-sky-800">
            {counts.publishedDrafts}
          </span>
        </button>

        <Link
          href="/products"
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface text-ink-secondary border border-surface-border hover:bg-surface-hover text-xs font-medium transition-all tap-effect shrink-0"
        >
          <span>Katalog Produk</span>
          <span className="rounded-full bg-zinc-200 px-2 py-0.2 text-[10px] font-bold text-zinc-700">
            {counts.activeProducts}
          </span>
        </Link>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchOverviewData}
            className="flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1 text-white font-medium hover:bg-rose-700"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Coba Lagi</span>
          </button>
        </div>
      )}

      {/* Top Bento Metric Cards Grid (3 Columns like Reference) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Card 1: Neutral Operations KPI */}
        <div className="rounded-bento bg-surface border border-surface-border p-6 flex flex-col justify-between space-y-6 bento-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white border border-surface-border text-ink">
                <FileText className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-bold text-ink">Total Drafts</span>
            </div>
            <button
              type="button"
              onClick={fetchOverviewData}
              title="Refresh"
              className="p-1 text-zinc-400 hover:text-ink transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-ink tracking-tight">
                {counts.totalDrafts}
              </span>
              <span className="text-xs font-semibold text-ink-muted">
                / {counts.activeProducts} Produk Aktif
              </span>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold text-ink border border-surface-border">
                {counts.totalDrafts > 0 ? `${counts.totalDrafts * 3} Posts` : '0 Posts'} ◯
              </span>
            </div>

            {/* Battery Capacity Dots */}
            <BatteryCapacityDots current={batteryTotal} total={8} variant="dark" />
          </div>
        </div>

        {/* Card 2: Electric Lime Highlight Card */}
        <div className="rounded-bento bg-lime border border-lime-dark/30 p-6 flex flex-col justify-between space-y-6 bento-card text-ink shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-lime">
                <Zap className="h-3.5 w-3.5 fill-lime" />
              </div>
              <span className="text-xs font-extrabold tracking-tight text-ink uppercase">
                Siap Diposting
              </span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-ink/10 px-2.5 py-0.5 text-[11px] font-bold text-ink border border-ink/10">
              {approvalRate}% ◯
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-ink tracking-tight">
                {counts.approvedDrafts}
              </span>
              <span className="text-xs font-bold text-ink/70">
                / Antrean Terjadwal
              </span>
            </div>

            {/* Battery Dots on Lime */}
            <BatteryCapacityDots current={batteryApproved} total={8} variant="lime" />
          </div>
        </div>

        {/* Card 3: Pitch Black Hero Action Card */}
        <div className="rounded-bento bg-dock p-6 flex flex-col justify-between space-y-6 text-white bento-card relative overflow-hidden group">
          <div className="space-y-2 relative z-10">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-lime/20 text-lime px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-lime animate-pulse" />
                Hermes Engine
              </span>
              <Link href="/settings" className="text-zinc-400 hover:text-white text-xs">
                CLI ↗
              </Link>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
              Take Your Automation ↗ to the Next Level
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Generate ratusan hook viral dan posting otomatis ke Threads tanpa intervensi manual.
            </p>
          </div>

          <div className="relative z-10 pt-2">
            <button
              type="button"
              onClick={handleCopyCliCommand}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 font-bold text-xs text-ink transition-all hover:bg-lime tap-effect shadow-md"
            >
              {copiedKey ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Perintah CLI Disalin!</span>
                </>
              ) : (
                <>
                  <span>Salin Perintah Runner</span>
                  <span className="text-[10px]">▷</span>
                </>
              )}
            </button>
          </div>

          {/* Ambient Glow */}
          <div className="absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-lime/10 blur-2xl pointer-events-none" />
        </div>
      </div>

      {/* Middle Split Section: Statistics Visualizer & Quick Action Directory */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Interactive Statistics & Capsule Bar Schedule Chart */}
        <div className="lg:col-span-2 rounded-bento bg-surface border border-surface-border p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <span>Statistics</span>
                <span className="text-xs font-normal text-ink-muted">// Pipeline Performance</span>
              </h3>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium text-ink-secondary">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-ink" />
                <span>Drafts Active</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-lime" />
                <span>Approved / Live</span>
              </div>
            </div>
          </div>

          {/* Capsule Pill Double-Bar Chart Visualizer */}
          <div className="pt-4 pb-2">
            <div className="grid grid-cols-7 gap-3 sm:gap-6 items-end h-48 border-b border-surface-border pb-4">
              {[
                { day: 'Sen', draftVal: 70, liveVal: 40, pill: '87%' },
                { day: 'Sel', draftVal: 50, liveVal: 25, pill: null },
                { day: 'Rab', draftVal: 85, liveVal: 60, pill: null },
                { day: 'Kam', draftVal: 30, liveVal: 15, pill: null },
                { day: 'Jum', draftVal: 95, liveVal: 75, pill: '92%' },
                { day: 'Sab', draftVal: 60, liveVal: 45, pill: null },
                { day: 'Min', draftVal: 75, liveVal: 50, pill: '68%' },
              ].map((bar, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end group">
                  {bar.pill && (
                    <span className="rounded-full bg-ink px-2 py-0.5 text-[9px] font-bold text-white shadow-sm mb-1 animate-pulse-subtle">
                      {bar.pill}
                    </span>
                  )}
                  <div className="relative w-6 sm:w-8 flex flex-col justify-end items-center h-36 bg-surface-muted rounded-full p-1">
                    {/* Dark Upper Capsule */}
                    <div
                      style={{ height: `${bar.draftVal}%` }}
                      className="w-full bg-ink rounded-full transition-all duration-500 relative group-hover:bg-zinc-800"
                    >
                      {/* Lime Lower Capsule Overlay */}
                      <div
                        style={{ height: `${(bar.liveVal / bar.draftVal) * 100}%` }}
                        className="w-full absolute bottom-0 bg-lime rounded-full"
                      />
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-ink-secondary">
                    {bar.day}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Quick Directory Navigation Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/products"
            className="rounded-2xl bg-surface border border-surface-border p-4 flex flex-col justify-between hover:border-ink/30 transition-all bento-card group"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-surface-border text-ink">
                <Package className="h-4 w-4" />
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400 group-hover:text-ink transition-colors" />
            </div>
            <div className="pt-4 space-y-0.5">
              <h4 className="text-xs font-bold text-ink">Produk</h4>
              <p className="text-[10px] text-ink-muted">Kelola katalog & harga</p>
            </div>
          </Link>

          <Link
            href="/drafts"
            className="rounded-2xl bg-surface border border-surface-border p-4 flex flex-col justify-between hover:border-ink/30 transition-all bento-card group"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-surface-border text-ink">
                <FileText className="h-4 w-4" />
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400 group-hover:text-ink transition-colors" />
            </div>
            <div className="pt-4 space-y-0.5">
              <h4 className="text-xs font-bold text-ink">Drafts Hub</h4>
              <p className="text-[10px] text-ink-muted">Semua status thread</p>
            </div>
          </Link>

          <Link
            href="/settings"
            className="rounded-2xl bg-surface border border-surface-border p-4 flex flex-col justify-between hover:border-ink/30 transition-all bento-card group"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-surface-border text-ink">
                <Sliders className="h-4 w-4" />
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400 group-hover:text-ink transition-colors" />
            </div>
            <div className="pt-4 space-y-0.5">
              <h4 className="text-xs font-bold text-ink">Integrasi</h4>
              <p className="text-[10px] text-ink-muted">Hermes & Meta API</p>
            </div>
          </Link>

          <div
            onClick={handleCopyCliCommand}
            className="rounded-2xl bg-surface border border-surface-border p-4 flex flex-col justify-between hover:border-ink/30 transition-all bento-card cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-lime text-ink">
                <Terminal className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-bold text-ink">CLI</span>
            </div>
            <div className="pt-4 space-y-0.5">
              <h4 className="text-xs font-bold text-ink">Runner Cron</h4>
              <p className="text-[10px] text-ink-muted">Salin perintah terminal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Triage & Review Queue Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              <span>Antrean Triage Review Konten</span>
              {recentPendingDrafts.length > 0 && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                  {recentPendingDrafts.length} butuh review
                </span>
              )}
            </h3>
            <p className="text-xs text-ink-secondary">
              Review draft yang diracik Hermes AI sebelum dipublikasikan secara otomatis ke Threads
            </p>
          </div>

          <Link
            href="/drafts"
            className="flex items-center gap-1 text-xs font-bold text-ink hover:underline"
          >
            <span>Lihat Semua Draft</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentPendingDrafts.length === 0 ? (
          <div className="rounded-bento border border-dashed border-surface-border p-8 text-center bg-surface/50">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white border border-surface-border text-emerald-600 mb-3">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-bold text-ink">Semua Draft Sudah Bersih & Disetujui!</h4>
            <p className="text-[11px] text-ink-muted mt-1 max-w-sm mx-auto">
              Tidak ada draft yang menumpuk di antrean review. Anda dapat memicu Hermes AI untuk membuat rangkaian thread baru.
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingDraft(null);
                setCreateDraftModalOpen(true);
              }}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-white text-xs font-bold tap-effect"
            >
              <Sparkles className="h-3.5 w-3.5 text-lime" />
              <span>Generate Draft Baru</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentPendingDrafts.slice(0, 3).map((draft) => (
              <div
                key={draft.id}
                className="rounded-2xl border border-surface-border bg-surface p-5 flex flex-col justify-between space-y-4 bento-card"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <DraftStatusBadge status={draft.status} size="xs" />
                    {draft.product && (
                      <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold text-ink border border-surface-border">
                        {draft.product.name}
                      </span>
                    )}
                  </div>

                  <h4 className="text-xs font-bold text-ink line-clamp-1">
                    {draft.title}
                  </h4>

                  <p className="text-xs text-ink-secondary line-clamp-3 bg-white p-3 rounded-xl border border-surface-border/60">
                    {draft.posts && draft.posts[0]
                      ? draft.posts[0].content
                      : 'Draft tanpa konten'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-surface-border">
                  <Link
                    href={`/drafts/${draft.id}`}
                    className="text-xs font-semibold text-ink hover:underline"
                  >
                    Edit & Simulator ↗
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleQuickApprove(draft.id)}
                    disabled={approvingId === draft.id}
                    className="flex items-center gap-1 rounded-full bg-lime hover:bg-lime-hover px-3.5 py-1.5 text-xs font-bold text-ink transition-all tap-effect shadow-sm"
                  >
                    {approvingId === draft.id ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3 stroke-[2.5]" />
                    )}
                    <span>Setujui</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modals */}
      <CreateDraftModal
        isOpen={createDraftModalOpen}
        onClose={() => setCreateDraftModalOpen(false)}
        onSuccess={() => {
          fetchOverviewData();
          addToast('Draft baru berhasil dibuat!', 'success');
        }}
        products={products}
        editingDraft={editingDraft}
      />

      <ProductModal
        isOpen={createProductModalOpen}
        onClose={() => setCreateProductModalOpen(false)}
        onSave={handleSaveProduct}
      />
    </div>
  );
}
