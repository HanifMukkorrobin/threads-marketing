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
  FileText,
  Terminal,
} from 'lucide-react';
import { ContentDraft } from '@/types/draft';
import { Product, CreateProductInput } from '@/types/product';
import { CreateDraftModal } from '@/components/CreateDraftModal';
import { ProductModal } from '@/components/ProductModal';
import { DraftStatusBadge, BatteryCapacityDots } from '@/components/DraftStatusBadge';
import { ThreadsInsightsChart } from '@/components/ThreadsInsightsChart';
import { fireRetroConfetti } from '@/lib/confetti';
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
        setRecentPendingDrafts(overviewData.recentPendingDrafts || overviewData.recentPending || []);
        setRecentPublishedDrafts(overviewData.recentPublishedDrafts || overviewData.recentPublished || []);
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

      fireRetroConfetti(0.5, 0.6);
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
    fireRetroConfetti(0.5, 0.5);
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

  return (
    <div className="w-full p-6 sm:p-8 lg:p-10 space-y-8 animate-fadeIn bg-[#FAF6EE]">
      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-center justify-between gap-3 px-4 py-2.5 rounded-retro-xs border-2 border-[#181816] shadow-[3px_3px_0px_0px_#181816] text-xs font-black animate-scale-in transition-all',
              toast.type === 'success' && 'bg-[#6B9AC4] text-white',
              toast.type === 'error' && 'bg-[#C95D53] text-white',
              toast.type === 'info' && 'bg-white text-[#181816]'
            )}
          >
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-black/60 hover:text-black"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Main 90s Split-Panel Layout (Left Hero & Bento Cards vs Right Showcase Poster Frame) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* LEFT COLUMN: Editorial Hero, Vintage Stamp Cards, and Triage Queue */}
        <div className="lg:col-span-7 space-y-8">
          {/* Retro Headline with Denim Blue Highlight Box */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#181816] tracking-tight leading-none uppercase">
              <span>Threads </span>
              <span className="inline-block bg-[#6B9AC4] text-white px-3 py-0.5 border-2 border-[#181816] shadow-[3px_3px_0px_0px_#181816]">
                Marketing
              </span>
            </h1>
            <p className="text-lg sm:text-xl font-black text-[#181816] tracking-tight">
              Threads Autonomous Engine Content
            </p>
            <p className="text-xs sm:text-sm text-[#4A463F] font-semibold leading-relaxed">
              Pusat kendali konten autopilot Threads, katalog produk digital, dan antrean posting mandiri berskala tinggi.
            </p>
          </div>

          {/* Dual 90s Stamp Bento Cards (Sand & Denim Blue from Reference) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Card 1: Sand Vintage Stamp Card (LATEST DRAFTS) */}
            <div className="rounded-retro-xs bg-[#D8C49D] border-[2.5px] border-[#181816] p-5 flex flex-col justify-between space-y-5 shadow-[4px_4px_0px_0px_#181816] hover:shadow-[6px_6px_0px_0px_#181816] transition-all">
              <div className="space-y-4">
                {/* Thin Top Accent Line */}
                <div className="w-12 h-[2px] bg-[#C95D53]" />

                <div className="space-y-1">
                  <span className="text-xs font-black tracking-widest text-[#C95D53] uppercase">
                    Katalog & Draf
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-[#181816] uppercase leading-tight">
                    {counts.totalDrafts} Drafts Aktif
                  </h3>
                  <p className="text-xs text-[#181816] font-bold">
                    {counts.activeProducts} Produk Terdaftar
                  </p>
                </div>
              </div>

              <Link
                href="/products"
                className="w-full text-center py-2 bg-white/70 hover:bg-white text-[#181816] text-xs font-black border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all uppercase tracking-wider block"
              >
                [ LIHAT KATALOG ]
              </Link>
            </div>

            {/* Card 2: Denim Blue Vintage Stamp Card (ON QUEUE) */}
            <div className="rounded-retro-xs bg-[#6B9AC4] border-[2.5px] border-[#181816] p-5 flex flex-col justify-between space-y-5 text-white shadow-[4px_4px_0px_0px_#181816] hover:shadow-[6px_6px_0px_0px_#181816] transition-all">
              <div className="space-y-4">
                {/* Thin Top White Line */}
                <div className="w-12 h-[2px] bg-white" />

                <div className="space-y-1">
                  <span className="text-xs font-black tracking-widest text-white/90 uppercase">
                    Siap Posting
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white uppercase leading-tight">
                    {counts.approvedDrafts} Draft Disetujui
                  </h3>
                  <p className="text-xs text-white font-bold">
                    Approval Rate: {approvalRate}%
                  </p>
                </div>
              </div>

              <Link
                href="/drafts"
                className="w-full text-center py-2 bg-white hover:bg-[#FAF6EE] text-[#181816] text-xs font-black border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all uppercase tracking-wider block"
              >
                [ REVIEW DRAFT ]
              </Link>
            </div>
          </div>

          {/* Triage & Review Queue Section */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b-2 border-[#181816] pb-3">
              <div className="space-y-0.5">
                <h3 className="text-sm sm:text-base font-black text-[#181816] flex items-center gap-2 uppercase tracking-wide">
                  <span>Antrean Triage Review</span>
                  {recentPendingDrafts.length > 0 && (
                    <span className="rounded-retro-xs bg-[#D8C49D] px-2 py-0.5 text-[11px] font-black text-[#181816] border border-[#181816] shadow-[1px_1px_0px_0px_#181816]">
                      {recentPendingDrafts.length} butuh review
                    </span>
                  )}
                </h3>
              </div>

              <Link
                href="/drafts"
                className="flex items-center gap-1 text-xs font-black text-[#181816] hover:underline uppercase tracking-wider"
              >
                <span>Lihat Semua</span>
                <ChevronRight className="h-4 w-4 stroke-[3]" />
              </Link>
            </div>

            {recentPendingDrafts.length === 0 ? (
              <div className="rounded-retro-xs border-2 border-dashed border-[#181816] p-7 text-center bg-white shadow-[3px_3px_0px_0px_#181816]">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-retro-xs bg-[#6B9AC4] border-2 border-[#181816] text-white mb-2 shadow-[2px_2px_0px_0px_#181816]">
                  <CheckCircle2 className="h-5 w-5 stroke-[2.5]" />
                </div>
                <h4 className="text-xs font-black text-[#181816] uppercase">Antrean Review Bersih</h4>
                <p className="text-xs text-[#7A7468] mt-1 font-medium">
                  Semua draft sudah disetujui atau dipublikasikan ke Threads.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingDraft(null);
                    setCreateDraftModalOpen(true);
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-retro-xs bg-[#C95D53] text-white text-xs font-black border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all uppercase tracking-wider"
                >
                  <Sparkles className="h-3.5 w-3.5 fill-white" />
                  <span>+ Generate Draft AI</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentPendingDrafts.slice(0, 3).map((draft) => (
                  <div
                    key={draft.id}
                    className="rounded-retro-xs border-2 border-[#181816] bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[3px_3px_0px_0px_#181816] hover:shadow-[4px_4px_0px_0px_#181816] transition-all"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <DraftStatusBadge status={draft.status} size="xs" />
                        {draft.product && (
                          <span className="rounded-retro-xs bg-[#E8DBC0] px-2 py-0.2 text-[10px] font-black text-[#181816] border border-[#181816]">
                            {draft.product.name}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-black text-[#181816] truncate uppercase">
                        {draft.title}
                      </h4>
                      <p className="text-[11px] text-[#4A463F] font-medium line-clamp-1">
                        {draft.posts && draft.posts[0] ? draft.posts[0].content : 'Draft tanpa konten'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#181816]/10">
                      <Link
                        href={`/drafts/${draft.id}`}
                        className="px-3 py-1 rounded-retro-xs bg-white hover:bg-[#FAF6EE] text-[#181816] text-xs font-black border-2 border-[#181816] shadow-[1.5px_1.5px_0px_0px_#181816] uppercase"
                      >
                        Edit
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleQuickApprove(draft.id)}
                        disabled={approvingId === draft.id}
                        className="flex items-center gap-1 px-3.5 py-1 rounded-retro-xs bg-[#C95D53] hover:bg-[#D45D52] text-white text-xs font-black border-2 border-[#181816] shadow-[1.5px_1.5px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all uppercase"
                      >
                        {approvingId === draft.id ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3 stroke-[3]" />
                        )}
                        <span>Setujui</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Showcase Poster Window (Analytics Chart & Runner Status) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Framed Showcase Poster Container */}
          <div className="rounded-retro-sm bg-[#FAF6EE] border-[3px] border-[#181816] p-4 sm:p-5 shadow-[8px_8px_0px_0px_#181816] space-y-5">
            {/* Top Frame Label */}
            <div className="flex items-center justify-between border-b-2 border-[#181816] pb-3">
              <span className="text-xs font-black tracking-widest text-[#181816] uppercase flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#C95D53]" />
                Interactive Showcase
              </span>
              <span className="text-[10px] font-black uppercase text-[#181816] bg-[#D8C49D] px-2 py-0.5 rounded-retro-xs border border-[#181816] shadow-[1px_1px_0px_0px_#181816]">
                90s Studio Edition
              </span>
            </div>

            {/* Interactive Insights Visualizer Chart */}
            <ThreadsInsightsChart onToast={addToast} />

            {/* Hermes Gateway Runner Box */}
            <div className="rounded-retro-xs bg-white p-4 text-[#181816] border-2 border-[#181816] space-y-3 shadow-[3px_3px_0px_0px_#181816]">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-retro-xs bg-[#D8C49D] text-[10px] font-black text-[#181816] uppercase tracking-wider border border-[#181816]">
                  <Terminal className="h-3.5 w-3.5" />
                  Hermes Gateway Runner
                </span>
                <span className="text-[10px] font-mono font-bold text-[#7A7468]">Port :4000</span>
              </div>

              <p className="text-[11px] text-[#4A463F] font-semibold leading-relaxed">
                Jalankan scheduler lokal atau cron VPS untuk generate draft dan posting otomatis ke Threads.
              </p>

              <button
                type="button"
                onClick={handleCopyCliCommand}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-retro-xs bg-[#C95D53] hover:bg-[#D45D52] text-white text-xs font-black border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all uppercase tracking-wider"
              >
                {copiedKey ? (
                  <>
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                    <span>Perintah CLI Disalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Salin Perintah Runner CLI</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateDraftModal
        isOpen={createDraftModalOpen}
        onClose={() => setCreateDraftModalOpen(false)}
        onSuccess={() => {
          fetchOverviewData();
          fireRetroConfetti(0.5, 0.5);
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
