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
import { fireRetroConfetti } from '@/lib/confetti';
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
      fireRetroConfetti(0.5, 0.5);
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
    <div className="p-6 sm:p-8 lg:p-10 space-y-7 animate-fadeIn bg-[#FAF6EE]">
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
            <button type="button" onClick={() => removeToast(toast.id)} className="text-black/60 hover:text-black">✕</button>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 border-b-2 border-[#181816] pb-5">
        <div className="space-y-1.5 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#181816] tracking-tight flex flex-wrap items-center gap-x-2.5 gap-y-2 uppercase">
            <span>Managing</span>
            <span className="inline-flex items-center justify-center px-3 py-0.5 rounded-retro-xs bg-[#6B9AC4] border-2 border-[#181816] text-white shadow-[2px_2px_0px_0px_#181816]">
              Drafts Pipeline
            </span>
            <span>// 90s Edition</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#4A463F] font-semibold">
            Kelola, review, atau minta Hermes AI meracik rangkaian thread baru berkonversi tinggi.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="flex h-10 w-10 items-center justify-center rounded-retro-xs bg-white hover:bg-[#FAF6EE] border-2 border-[#181816] text-[#181816] shadow-[2px_2px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all tap-effect"
            title="Refresh Data"
          >
            <RefreshCw className={cn('h-4 w-4 stroke-[2.5]', loading && 'animate-spin')} />
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingDraft(null);
              setCreateModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2 rounded-retro-xs bg-[#C95D53] hover:bg-[#D45D52] text-white font-black text-xs border-2 border-[#181816] shadow-[3px_3px_0px_0px_#181816] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none transition-all tap-effect uppercase tracking-wider"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
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
                'flex items-center gap-2 px-4 py-2 rounded-retro-xs text-xs font-black border-2 border-[#181816] transition-all tap-effect shrink-0 uppercase tracking-wider',
                isActive
                  ? 'bg-[#6B9AC4] text-white shadow-[2px_2px_0px_0px_#181816]'
                  : 'bg-white text-[#181816] hover:bg-[#FAF6EE] shadow-[1.5px_1.5px_0px_0px_#181816]'
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  'rounded-none px-1.5 py-0.2 text-[10px] font-black border border-[#181816]',
                  isActive
                    ? 'bg-[#FAF6EE] text-[#181816]'
                    : 'bg-[#D8C49D] text-[#181816]'
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
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#181816] stroke-[2.5]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari draft berdasarkan judul, isi konten, atau angle..."
            className="w-full rounded-retro-xs bg-white border-2 border-[#181816] pl-10 pr-10 py-2.5 text-xs sm:text-sm text-[#181816] placeholder-zinc-400 font-bold shadow-[3px_3px_0px_0px_#181816] focus:outline-none focus:bg-[#FAF6EE]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#181816] hover:text-[#C95D53] p-1"
            >
              <X className="h-4 w-4 stroke-[3]" />
            </button>
          )}
        </div>

        <div className="relative w-full sm:w-64">
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="w-full appearance-none rounded-retro-xs bg-white border-2 border-[#181816] px-4 py-2.5 text-xs text-[#181816] font-bold focus:outline-none shadow-[3px_3px_0px_0px_#181816] cursor-pointer"
          >
            <option value="ALL">Semua Produk ({products.length})</option>
            <option value="NONE">Organik / Non-Produk</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <Filter className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#181816] pointer-events-none stroke-[2.5]" />
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center justify-between rounded-retro-xs border-2 border-[#181816] bg-rose-100 p-4 text-xs text-[#181816] font-black shadow-[3px_3px_0px_0px_#181816]">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[#C95D53] stroke-[2.5]" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchData}
            className="flex items-center gap-1 rounded-retro-xs bg-[#C95D53] px-3 py-1 text-white font-black border border-[#181816] hover:bg-[#D45D52]"
          >
            <RefreshCw className="h-3 w-3 stroke-[2.5]" />
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
              className="h-64 rounded-retro-xs bg-white border-2 border-[#181816] animate-pulse p-6 space-y-4 shadow-[4px_4px_0px_0px_#181816]"
            >
              <div className="h-4 w-1/3 bg-[#D8C49D] rounded-retro-xs" />
              <div className="h-5 w-3/4 bg-zinc-200 rounded-retro-xs" />
              <div className="h-24 bg-[#FAF6EE] rounded-retro-xs" />
            </div>
          ))}
        </div>
      ) : filteredDrafts.length === 0 ? (
        <div className="rounded-retro-xs border-2 border-dashed border-[#181816] p-12 text-center bg-white space-y-3 shadow-[3px_3px_0px_0px_#181816]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-retro-xs bg-[#D8C49D] border-2 border-[#181816] text-[#181816] shadow-[2px_2px_0px_0px_#181816]">
            <FileText className="h-6 w-6 stroke-[2.5]" />
          </div>
          <h3 className="text-sm font-black text-[#181816] uppercase">Tidak Ada Draft Konten Ditemukan</h3>
          <p className="text-xs text-[#7A7468] max-w-md mx-auto font-medium">
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
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-retro-xs bg-[#C95D53] text-white text-xs font-black border-2 border-[#181816] shadow-[3px_3px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all tap-effect uppercase tracking-wider"
            >
              <Sparkles className="h-4 w-4 fill-white" />
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
            <div className="flex h-11 w-11 items-center justify-center rounded-retro-xs bg-rose-100 text-[#C95D53] border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816]">
              <Trash2 className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-sm font-black text-[#181816] uppercase">Hapus Draft Ini?</h3>
              <p className="text-xs text-[#7A7468] font-medium">Tindakan ini permanen.</p>
            </div>
          </div>
          <p className="text-xs text-[#181816] bg-[#FAF6EE] p-3 rounded-retro-xs border-2 border-[#181816] font-black shadow-[2px_2px_0px_0px_#181816]">
            &quot;{deletingDraft?.title}&quot;
          </p>
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setDeletingDraft(null)}
              disabled={deleteLoading}
              className="px-4 py-2 rounded-retro-xs border-2 border-[#181816] text-xs font-bold text-[#181816] hover:bg-white shadow-[2px_2px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all uppercase tracking-wider"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-retro-xs bg-[#C95D53] hover:bg-[#D45D52] text-white text-xs font-black border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all uppercase tracking-wider"
            >
              {deleteLoading ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin stroke-[2.5]" />
              ) : (
                <Trash2 className="h-3.5 w-3.5 stroke-[2.5]" />
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
          fireRetroConfetti(0.5, 0.5);
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
    <Suspense fallback={<div className="p-8 animate-pulse text-[#7A7468] font-bold">Memuat data drafts...</div>}>
      <DraftsContent />
    </Suspense>
  );
}
