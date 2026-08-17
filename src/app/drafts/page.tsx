'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  FileText,
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  Package,
  Layers,
  Sparkles,
  X,
  Trash2,
  Filter,
} from 'lucide-react';
import { ContentDraft } from '@/types/draft';
import { Product } from '@/types/product';
import { DraftCard } from '@/components/DraftCard';
import { CreateDraftModal } from '@/components/CreateDraftModal';
import { ModalPortal } from '@/components/ModalPortal';
import { cn } from '@/lib/utils';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

type TabKey = 'ALL' | 'PENDING_REVIEW' | 'APPROVED' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED';

function DraftsContent() {
  const searchParams = useSearchParams();
  const shouldOpenCreate = searchParams.get('create') === 'true';

  const [drafts, setDrafts] = useState<ContentDraft[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabKey>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('ALL');

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState<ContentDraft | null>(null);
  const [deletingDraft, setDeletingDraft] = useState<ContentDraft | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [toasts, setToasts] = useState<Toast[]>([]);

  // Automatically open create modal if URL has ?create=true
  useEffect(() => {
    if (shouldOpenCreate) {
      setCreateModalOpen(true);
    }
  }, [shouldOpenCreate]);

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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [draftsRes, productsRes] = await Promise.all([
        fetch('/api/drafts', { cache: 'no-store' }),
        fetch('/api/products', { cache: 'no-store' }),
      ]);

      const draftsData = await draftsRes.json();
      const productsData = await productsRes.json();

      if (draftsData.success && Array.isArray(draftsData.data)) {
        setDrafts(draftsData.data);
      } else {
        throw new Error(draftsData.error || 'Gagal memuat daftar draft');
      }

      if (productsData.success && Array.isArray(productsData.data)) {
        setProducts(productsData.data);
      }
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const tabCounts = useMemo(() => {
    return {
      ALL: drafts.length,
      PENDING_REVIEW: drafts.filter((d) => d.status === 'PENDING_REVIEW').length,
      APPROVED: drafts.filter((d) => d.status === 'APPROVED').length,
      SCHEDULED: drafts.filter((d) => d.status === 'SCHEDULED').length,
      PUBLISHED: drafts.filter((d) => d.status === 'PUBLISHED').length,
      FAILED: drafts.filter((d) => d.status === 'FAILED').length,
    };
  }, [drafts]);

  const filteredDrafts = useMemo(() => {
    return drafts.filter((draft) => {
      if (activeTab !== 'ALL' && draft.status !== activeTab) return false;
      if (selectedProductId !== 'ALL') {
        if (selectedProductId === 'NONE' && draft.productId !== null) return false;
        if (selectedProductId !== 'NONE' && draft.productId !== selectedProductId) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          draft.title.toLowerCase().includes(q) ||
          draft.hookAngle?.toLowerCase().includes(q) ||
          draft.product?.name.toLowerCase().includes(q) ||
          draft.posts?.some((p) => p.content.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [drafts, activeTab, selectedProductId, searchQuery]);

  const handleApprove = async (draftId: string) => {
    try {
      const res = await fetch(`/api/drafts/${draftId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      });
      if (!res.ok) throw new Error('Gagal menyetujui draft');
      setDrafts((prev) => prev.map((d) => (d.id === draftId ? { ...d, status: 'APPROVED' } : d)));
      addToast('Draft disetujui & masuk antrean siap posting!', 'success');
    } catch (err: any) {
      addToast(err?.message || 'Gagal menyetujui draft', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingDraft) return;
    try {
      setDeleteLoading(true);
      const res = await fetch(`/api/drafts/${deletingDraft.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus draft');
      setDrafts((prev) => prev.filter((d) => d.id !== deletingDraft.id));
      addToast('Draft berhasil dihapus', 'success');
      setDeletingDraft(null);
    } catch (err: any) {
      addToast(err?.message || 'Gagal menghapus draft', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'ALL', label: 'Semua', count: tabCounts.ALL },
    { key: 'PENDING_REVIEW', label: 'Review', count: tabCounts.PENDING_REVIEW },
    { key: 'APPROVED', label: 'Siap Posting', count: tabCounts.APPROVED },
    { key: 'PUBLISHED', label: 'Live', count: tabCounts.PUBLISHED },
    { key: 'SCHEDULED', label: 'Jadwal', count: tabCounts.SCHEDULED },
    { key: 'FAILED', label: 'Gagal', count: tabCounts.FAILED },
  ];

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
            <button type="button" onClick={() => removeToast(toast.id)} className="text-white/60 hover:text-white">✕</button>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-ink tracking-tight flex flex-wrap items-center gap-x-2.5 gap-y-2">
            <span>Managing</span>
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-surface border border-surface-border text-ink shadow-sm">
              <Layers className="h-4 w-4" />
            </span>
            <span>Your Drafts</span>
            <span>and</span>
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-lime border border-lime-dark/30 text-ink text-sm font-black shadow-sm">
              ⚡
            </span>
            <span>Pipeline</span>
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary">
            Kelola, review, atau minta Hermes AI meracik rangkaian thread baru berkonversi tinggi.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface hover:bg-surface-hover border border-surface-border text-ink transition-all tap-effect"
            title="Refresh Data"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingDraft(null);
              setCreateModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-ink hover:bg-zinc-800 text-white font-bold text-xs shadow-pill transition-all tap-effect"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>+ Buat Draft Baru</span>
          </button>
        </div>
      </header>

      {/* Status Segmented Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all tap-effect shrink-0',
                isActive
                  ? 'bg-ink text-white shadow-pill'
                  : 'bg-surface text-ink-secondary border border-surface-border hover:bg-surface-hover'
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.2 text-[10px] font-bold',
                  isActive
                    ? 'bg-lime text-ink'
                    : 'bg-white text-ink-secondary border border-surface-border'
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search and Product Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari draft berdasarkan judul, isi konten, atau angle..."
            className="w-full rounded-full bg-surface border border-surface-border pl-10 pr-4 py-2.5 text-xs text-ink placeholder-ink-muted focus:border-ink focus:bg-white focus:outline-none transition-all shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="relative w-full sm:w-64">
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="w-full appearance-none rounded-full bg-surface border border-surface-border px-4 py-2.5 text-xs text-ink font-medium focus:border-ink focus:bg-white focus:outline-none transition-all shadow-xs cursor-pointer"
          >
            <option value="ALL">Semua Produk ({products.length})</option>
            <option value="NONE">Organik / Non-Produk</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <Filter className="absolute right-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-muted pointer-events-none" />
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchData}
            className="flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1 text-white font-medium hover:bg-rose-700"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Coba Lagi</span>
          </button>
        </div>
      )}

      {/* Drafts Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-64 rounded-bento bg-surface border border-surface-border animate-pulse p-6 space-y-4"
            >
              <div className="h-4 w-1/3 bg-zinc-200 rounded-full" />
              <div className="h-5 w-3/4 bg-zinc-200 rounded-full" />
              <div className="h-24 bg-white rounded-2xl" />
            </div>
          ))}
        </div>
      ) : filteredDrafts.length === 0 ? (
        <div className="rounded-bento border border-dashed border-surface-border p-12 text-center bg-surface/50 space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white border border-surface-border text-ink-secondary">
            <FileText className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-ink">Tidak Ada Draft Konten Ditemukan</h3>
          <p className="text-xs text-ink-secondary max-w-md mx-auto">
            {searchQuery || selectedProductId !== 'ALL' || activeTab !== 'ALL'
              ? 'Tidak ada draft yang cocok dengan kriteria filter saat ini. Silakan coba reset pencarian.'
              : 'Belum ada draft konten di akun Anda. Mulai dengan meracik draft pertama Anda.'}
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setEditingDraft(null);
                setCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-ink text-white text-xs font-bold tap-effect shadow-pill"
            >
              <Sparkles className="h-4 w-4 text-lime" />
              <span>+ Buat Draft Baru</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDrafts.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              onApprove={handleApprove}
              onDelete={(d) => setDeletingDraft(d)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ModalPortal
        isOpen={!!deletingDraft}
        onClose={() => setDeletingDraft(null)}
        maxWidth="sm"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <Trash2 className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-ink">Hapus Draft Ini?</h3>
              <p className="text-xs text-ink-muted">Tindakan ini permanen.</p>
            </div>
          </div>
          <p className="text-xs text-ink-secondary bg-surface p-3 rounded-xl border border-surface-border/80 font-medium">
            &quot;{deletingDraft?.title}&quot;
          </p>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDeletingDraft(null)}
              disabled={deleteLoading}
              className="px-4 py-2 rounded-full border border-surface-border text-xs font-semibold text-ink hover:bg-surface transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all tap-effect"
            >
              {deleteLoading ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              <span>Hapus Sekarang</span>
            </button>
          </div>
        </div>
      </ModalPortal>

      {/* Create / Edit Modal */}
      <CreateDraftModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          fetchData();
          addToast('Draft berhasil disimpan!', 'success');
        }}
        products={products}
        editingDraft={editingDraft}
      />
    </div>
  );
}

export default function DraftsPage() {
  return (
    <Suspense fallback={<div className="p-8 animate-pulse text-zinc-500">Memuat data drafts...</div>}>
      <DraftsContent />
    </Suspense>
  );
}
