'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Package,
  Clock,
  CheckCircle2,
  Send,
  ExternalLink,
  Plus,
  RefreshCw,
  AlertCircle,
  Radio,
  Copy,
  Check,
  ChevronRight,
  Edit3,
  Flame,
  Layers,
  ArrowUpRight,
  Terminal,
  ShieldCheck,
  X,
} from 'lucide-react';
import { ContentDraft } from '@/types/draft';
import { Product, CreateProductInput } from '@/types/product';
import { CreateDraftModal } from '@/components/CreateDraftModal';
import { ProductModal } from '@/components/ProductModal';
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
        setRecentPendingDrafts(overviewData.recentPendingDrafts || []);
        setRecentPublishedDrafts(overviewData.recentPublishedDrafts || []);
        setHermesStatus(overviewData.hermesStatus || {});
      } else {
        throw new Error(overviewData.error || 'Gagal mengambil data ringkasan');
      }

      if (productsData.success && Array.isArray(productsData.data)) {
        setProducts(productsData.data);
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

  // Quick Approve Action from Dashboard
  const handleQuickApprove = async (draftId: string, title: string) => {
    try {
      setApprovingId(draftId);
      const res = await fetch(`/api/drafts/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyetujui draft');
      }

      // Optimistically update counts and remove from pending queue
      setRecentPendingDrafts((prev) => prev.filter((d) => d.id !== draftId));
      setCounts((prev) => ({
        ...prev,
        pendingDrafts: Math.max(0, prev.pendingDrafts - 1),
        approvedDrafts: prev.approvedDrafts + 1,
      }));

      addToast(`Draft "${title}" disetujui! Siap diposting oleh Hermes Agent.`, 'success');
    } catch (err: any) {
      addToast(err?.message || 'Gagal mengubah status draft', 'error');
    } finally {
      setApprovingId(null);
    }
  };

  const handleSaveProduct = async (productData: CreateProductInput) => {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menambah produk');
      }

      addToast(`Produk "${productData.name}" berhasil ditambahkan!`, 'success');
      setCreateProductModalOpen(false);
      fetchOverviewData();
    } catch (err: any) {
      addToast(err?.message || 'Gagal menyimpan produk', 'error');
    }
  };

  const handleDraftSaved = (savedDraft: ContentDraft) => {
    addToast(
      editingDraft
        ? 'Perubahan draft berhasil disimpan!'
        : 'Draft konten baru berhasil dibuat!',
      'success'
    );
    setCreateDraftModalOpen(false);
    setEditingDraft(null);
    fetchOverviewData();
  };

  const copyHermesSnippet = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    addToast('Perintah runner disalin ke clipboard!', 'info');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="min-h-screen bg-threads-bg pb-16">
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-center justify-between rounded-xl border p-4 shadow-xl backdrop-blur-md transition-all duration-300',
              toast.type === 'success' && 'border-emerald-500/40 bg-zinc-900/95 text-emerald-400',
              toast.type === 'error' && 'border-rose-500/40 bg-zinc-900/95 text-rose-400',
              toast.type === 'info' && 'border-threads-border bg-zinc-900/95 text-threads-text'
            )}
          >
            <div className="flex items-center space-x-2.5 text-xs font-medium">
              {toast.type === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
              {toast.type === 'error' && <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />}
              {toast.type === 'info' && <Sparkles className="h-4 w-4 shrink-0 text-threads-accent" />}
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-3 text-threads-secondary hover:text-threads-text"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Top Header Banner & Quick Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-threads-border pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-threads-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-threads-success"></span>
              </span>
              <span className="font-mono text-[11px] uppercase tracking-wider text-threads-success font-semibold">
                Autonomous Engine Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-threads-text">
              Dashboard Operasional Threads
            </h1>
            <p className="text-xs text-threads-secondary">
              Pantau funnel konversi konten, triage review antrean draft AI, dan status publishing Threads secara real-time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={fetchOverviewData}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-threads-border bg-threads-surface px-3.5 py-2 text-xs font-medium text-threads-text transition-colors hover:bg-threads-border disabled:opacity-50"
              title="Refresh Dashboard"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => setCreateProductModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-threads-border bg-threads-surface px-3.5 py-2 text-xs font-medium text-threads-text transition-colors hover:bg-threads-border hover:text-threads-text"
            >
              <Package className="h-3.5 w-3.5 text-threads-accent" />
              <span>+ Tambah Produk</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingDraft(null);
                setCreateDraftModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-threads-accent px-4 py-2 text-xs font-semibold text-white shadow-md shadow-threads-accent/20 transition-all hover:opacity-90 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              <span>+ Buat Draft</span>
            </button>
          </div>
        </div>

        {/* Error Alert if any */}
        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-center justify-between text-xs text-rose-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchOverviewData}
              className="underline font-semibold hover:text-white"
            >
              Coba lagi
            </button>
          </div>
        )}

        {/* 4 Primary Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Active Products */}
          <Link
            href="/products"
            className="group relative rounded-2xl border border-threads-border bg-threads-card p-5 transition-all duration-200 hover:border-threads-border/80 hover:bg-threads-card/80 hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                <Package className="h-5 w-5" />
              </div>
              <span className="flex items-center text-[11px] font-medium text-threads-secondary group-hover:text-threads-text transition-colors">
                Kelola Produk <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
              </span>
            </div>
            <div className="mt-4">
              <p className="text-xs font-medium text-threads-secondary">Produk Aktif</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-threads-text">
                  {counts.activeProducts}
                </span>
                <span className="text-xs text-threads-secondary">
                  / {counts.totalProducts} total katalog
                </span>
              </div>
            </div>
          </Link>

          {/* Card 2: Drafts Pending Review (with pulse beacon) */}
          <Link
            href="/drafts"
            className={cn(
              'group relative rounded-2xl border p-5 transition-all duration-200 hover:shadow-lg',
              counts.pendingDrafts > 0
                ? 'border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-threads-card'
                : 'border-threads-border bg-threads-card hover:border-threads-border/80'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <Clock className="h-5 w-5" />
              </div>
              {counts.pendingDrafts > 0 ? (
                <span className="flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300 animate-pulse">
                  <Flame className="h-3 w-3" /> Butuh Review
                </span>
              ) : (
                <span className="text-[11px] text-emerald-400 font-medium flex items-center">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Antrean Bersih
                </span>
              )}
            </div>
            <div className="mt-4">
              <p className="text-xs font-medium text-threads-secondary">Menunggu Review</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-amber-300">
                  {counts.pendingDrafts}
                </span>
                <span className="text-xs text-threads-secondary">draft siap di-triage</span>
              </div>
            </div>
          </Link>

          {/* Card 3: Ready to Post (Approved) */}
          <Link
            href="/drafts"
            className="group relative rounded-2xl border border-threads-border bg-threads-card p-5 transition-all duration-200 hover:border-threads-border/80 hover:bg-threads-card/80 hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                Siap Diposting
              </span>
            </div>
            <div className="mt-4">
              <p className="text-xs font-medium text-threads-secondary">Draft Approved</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-emerald-400">
                  {counts.approvedDrafts}
                </span>
                <span className="text-xs text-threads-secondary">siap cron publisher</span>
              </div>
            </div>
          </Link>

          {/* Card 4: Published Posts */}
          <div className="relative rounded-2xl border border-threads-border bg-threads-card p-5">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Send className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-indigo-500/15 border border-indigo-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-400">
                Live di Threads
              </span>
            </div>
            <div className="mt-4">
              <p className="text-xs font-medium text-threads-secondary">Postingan Terbit</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-threads-text">
                  {counts.publishedDrafts}
                </span>
                <span className="text-xs text-threads-secondary">
                  {counts.failedDrafts > 0 ? `(${counts.failedDrafts} gagal)` : '100% success rate'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Hermes Agent Integration Status Card */}
        <div className="rounded-2xl border border-threads-border bg-threads-card p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-threads-surface border border-threads-border text-threads-accent shadow-inner">
                <Radio className="h-5 w-5 text-threads-accent" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-threads-text">
                    Hermes Agent Connection Hub
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                    <ShieldCheck className="h-3 w-3" />
                    Autonomous Ready
                  </span>
                </div>
                <p className="text-xs text-threads-secondary max-w-2xl">
                  Hermes Agent berkomunikasi melalui REST API dengan otentikasi Bearer token untuk mengambil katalog produk, generate draft multi-post, dan mengeksekusi publikasi otomatis.
                </p>
                <div className="flex items-center gap-3 pt-1 text-xs text-zinc-400 font-mono">
                  <span>API Key: <span className="text-threads-text bg-threads-surface px-2 py-0.5 rounded border border-threads-border">{hermesStatus.apiKeyPreview || '••••••••'}</span></span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0">
              <button
                type="button"
                onClick={() => copyHermesSnippet('npx tsx scripts/hermes-runner/hermes_mock_cron.ts --action=all')}
                className="flex items-center gap-1.5 rounded-xl border border-threads-border bg-threads-surface px-3.5 py-2 text-xs font-medium text-threads-text hover:bg-threads-border transition-colors"
                title="Salin CLI Runner Command"
              >
                {copiedKey ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Terminal className="h-3.5 w-3.5 text-zinc-400" />}
                <span>Salin Runner CLI</span>
              </button>

              <Link
                href="/settings"
                className="flex items-center gap-1.5 rounded-xl bg-threads-surface border border-threads-border px-3.5 py-2 text-xs font-semibold text-threads-text hover:border-threads-accent hover:text-threads-accent transition-colors"
              >
                <span>Kelola API & Integrasi</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Section 1: Quick Review Queue ("Antrean Review Cepat") */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-threads-text">
                  Antrean Review Cepat (Triage)
                </h2>
                {recentPendingDrafts.length > 0 && (
                  <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                    {recentPendingDrafts.length} Menunggu
                  </span>
                )}
              </div>
              <p className="text-xs text-threads-secondary">
                1-klik untuk menyetujui draft sebelum diposting otomatis oleh cron runner Hermes Agent.
              </p>
            </div>

            <Link
              href="/drafts"
              className="text-xs font-medium text-threads-accent hover:underline flex items-center"
            >
              Lihat Semua ({counts.totalDrafts}) <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-48 rounded-2xl border border-threads-border bg-threads-card/40 animate-pulse p-5 space-y-3"
                >
                  <div className="h-4 w-1/3 bg-threads-surface rounded" />
                  <div className="h-4 w-3/4 bg-threads-surface rounded" />
                  <div className="h-16 bg-threads-bg/60 rounded-xl" />
                  <div className="h-8 bg-threads-surface rounded-xl" />
                </div>
              ))}
            </div>
          ) : recentPendingDrafts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-threads-border bg-threads-card/30 p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-threads-text">
                Semua Draft Sudah Direview!
              </h3>
              <p className="text-xs text-threads-secondary mt-1 max-w-md mx-auto">
                Antrean review bersih. Draft baru akan muncul di sini secara otomatis saat dihasilkan oleh Hermes AI Agent.
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingDraft(null);
                    setCreateDraftModalOpen(true);
                  }}
                  className="rounded-xl border border-threads-border bg-threads-surface px-3.5 py-1.5 text-xs font-medium text-threads-text hover:bg-threads-border"
                >
                  + Buat Draft Manual
                </button>
                <Link
                  href="/settings"
                  className="rounded-xl bg-threads-accent px-3.5 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                >
                  Jalankan Hermes Agent
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentPendingDrafts.map((draft) => {
                const firstPost = draft.posts?.[0]?.content || 'Tidak ada konten';
                const isApproving = approvingId === draft.id;

                return (
                  <div
                    key={draft.id}
                    className="flex flex-col justify-between rounded-2xl border border-threads-border bg-threads-card p-5 transition-all duration-200 hover:border-threads-border/90 hover:shadow-md"
                  >
                    <div className="space-y-3">
                      {/* Header tags */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate rounded-md bg-threads-surface border border-threads-border px-2 py-0.5 text-[10px] font-medium text-threads-accent">
                          {draft.product?.name || 'Umum / Toko'}
                        </span>
                        {draft.hookAngle && (
                          <span className="rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                            {draft.hookAngle}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-semibold text-threads-text line-clamp-1">
                        {draft.title}
                      </h3>

                      {/* Snippet box */}
                      <div className="rounded-xl border border-threads-border bg-threads-bg/70 p-3 text-xs text-zinc-300 whitespace-pre-wrap line-clamp-3 leading-relaxed font-sans">
                        {firstPost}
                      </div>

                      {/* Posts chain count */}
                      <div className="flex items-center gap-1.5 text-[11px] text-threads-secondary">
                        <Layers className="h-3.5 w-3.5 text-zinc-500" />
                        <span>{draft.posts?.length || 1} Bagian Thread</span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-zinc-400 capitalize">{draft.source?.toLowerCase().replace('_', ' ')}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-4 pt-3 border-t border-threads-border flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDraft(draft);
                          setCreateDraftModalOpen(true);
                        }}
                        className="flex items-center gap-1 rounded-xl border border-threads-border bg-threads-surface px-3 py-1.5 text-xs font-medium text-threads-text hover:bg-threads-border transition-colors"
                      >
                        <Edit3 className="h-3 w-3 text-zinc-400" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickApprove(draft.id, draft.title)}
                        disabled={isApproving}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition-all disabled:opacity-50 active:scale-95"
                      >
                        {isApproving ? (
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        <span>Setujui (Approve)</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Section 2: Live Threads Publication History */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-lg font-bold tracking-tight text-threads-text">
                Riwayat Postingan Live
              </h2>
              <p className="text-xs text-threads-secondary">
                Daftar thread yang telah berhasil dipublikasikan ke platform Threads.
              </p>
            </div>

            <span className="rounded-full bg-threads-surface border border-threads-border px-2.5 py-1 text-[11px] font-medium text-threads-secondary">
              Total Terbit: {counts.publishedDrafts}
            </span>
          </div>

          {recentPublishedDrafts.length === 0 ? (
            <div className="rounded-2xl border border-threads-border bg-threads-card/40 p-8 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-threads-surface text-threads-secondary border border-threads-border mb-2.5">
                <Send className="h-5 w-5" />
              </div>
              <p className="text-xs text-threads-secondary">
                Belum ada postingan yang terpublikasi ke Threads. Setujui draft di antrean untuk mulai mempublikasikan konten.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-threads-border bg-threads-card shadow-sm">
              <div className="divide-y divide-threads-border">
                {recentPublishedDrafts.map((draft) => {
                  const publishedDate = draft.publishedAt
                    ? new Date(draft.publishedAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Baru saja';

                  return (
                    <div
                      key={draft.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:px-6 hover:bg-threads-surface/40 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                            PUBLISHED
                          </span>
                          <span className="text-xs font-semibold text-threads-text">
                            {draft.title}
                          </span>
                          {draft.product && (
                            <span className="text-[11px] text-threads-secondary">
                              • {draft.product.name}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-threads-secondary line-clamp-1 max-w-2xl font-sans">
                          {draft.posts?.[0]?.content || ''}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 text-xs">
                        <span className="text-threads-secondary font-mono text-[11px]">
                          {publishedDate}
                        </span>

                        {draft.threadPostUrl ? (
                          <a
                            href={draft.threadPostUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 rounded-xl bg-threads-surface border border-threads-border px-3 py-1 text-xs font-medium text-threads-text hover:border-threads-accent hover:text-threads-accent transition-colors"
                          >
                            <span>Buka Thread</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-threads-secondary text-[11px]">
                            ID: {draft.threadPostId || 'N/A'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Create / Edit Draft Modal */}
      <CreateDraftModal
        isOpen={createDraftModalOpen}
        onClose={() => {
          setCreateDraftModalOpen(false);
          setEditingDraft(null);
        }}
        onSuccess={handleDraftSaved}
        products={products}
        editingDraft={editingDraft}
      />

      {/* Create Product Modal */}
      <ProductModal
        isOpen={createProductModalOpen}
        onClose={() => setCreateProductModalOpen(false)}
        onSave={handleSaveProduct}
        initialData={null}
      />
    </div>
  );
}
