'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  Calendar,
  ExternalLink,
  AlertTriangle,
  Package,
  Layers,
  Sparkles,
  X,
  Trash2,
  Filter,
} from 'lucide-react';
import { ContentDraft, DraftStatus } from '@/types/draft';
import { Product } from '@/types/product';
import { DraftCard } from '@/components/DraftCard';
import { CreateDraftModal } from '@/components/CreateDraftModal';
import { cn } from '@/lib/utils';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

type TabKey = 'ALL' | 'PENDING_REVIEW' | 'APPROVED' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED';

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<ContentDraft[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<TabKey>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('ALL');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState<ContentDraft | null>(null);
  const [deletingDraft, setDeletingDraft] = useState<ContentDraft | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

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

  // Fetch all drafts and products
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [draftsRes, productsRes] = await Promise.all([
        fetch('/api/drafts'),
        fetch('/api/products'),
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

  // Compute status counts
  const counts = useMemo(() => {
    const total = drafts.length;
    const pending = drafts.filter((d) => d.status === 'PENDING_REVIEW').length;
    const approved = drafts.filter((d) => d.status === 'APPROVED').length;
    const scheduled = drafts.filter((d) => d.status === 'SCHEDULED').length;
    const published = drafts.filter((d) => d.status === 'PUBLISHED').length;
    const failed = drafts.filter((d) => d.status === 'FAILED').length;

    return { total, pending, approved, scheduled, published, failed };
  }, [drafts]);

  // Tabs configuration
  const tabs = [
    {
      key: 'ALL' as TabKey,
      label: 'Semua',
      count: counts.total,
      badgeColor: 'bg-zinc-800 text-threads-text border-threads-border',
    },
    {
      key: 'PENDING_REVIEW' as TabKey,
      label: 'Menunggu Review',
      icon: Clock,
      count: counts.pending,
      badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    },
    {
      key: 'APPROVED' as TabKey,
      label: 'Siap Post / Approved',
      icon: CheckCircle2,
      count: counts.approved,
      badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    },
    {
      key: 'SCHEDULED' as TabKey,
      label: 'Dijadwalkan',
      icon: Calendar,
      count: counts.scheduled,
      badgeColor: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    },
    {
      key: 'PUBLISHED' as TabKey,
      label: 'Terpublikasi',
      icon: ExternalLink,
      count: counts.published,
      badgeColor: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    },
    {
      key: 'FAILED' as TabKey,
      label: 'Gagal',
      icon: AlertTriangle,
      count: counts.failed,
      badgeColor: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    },
  ];

  // Filtered drafts
  const filteredDrafts = useMemo(() => {
    return drafts.filter((draft) => {
      // Tab status filter
      if (activeTab !== 'ALL' && draft.status !== activeTab) {
        return false;
      }

      // Product filter
      if (selectedProductId !== 'ALL') {
        if (selectedProductId === 'NONE' && draft.productId) return false;
        if (selectedProductId !== 'NONE' && draft.productId !== selectedProductId) return false;
      }

      // Search query across title, hookAngle, and post content
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = draft.title.toLowerCase().includes(query);
        const matchHook = draft.hookAngle?.toLowerCase().includes(query) || false;
        const matchPosts = draft.posts?.some((p) =>
          p.content.toLowerCase().includes(query)
        );
        const matchProduct = draft.product?.name.toLowerCase().includes(query) || false;

        if (!matchTitle && !matchHook && !matchPosts && !matchProduct) {
          return false;
        }
      }

      return true;
    });
  }, [drafts, activeTab, selectedProductId, searchQuery]);

  // Quick Approve Action
  const handleQuickApprove = async (draftId: string) => {
    try {
      const res = await fetch(`/api/drafts/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyetujui draft');
      }

      setDrafts((prev) =>
        prev.map((d) => (d.id === draftId ? data.draft || data.data : d))
      );

      addToast('Draft berhasil disetujui (Approved)! Siap diposting.', 'success');
    } catch (err: any) {
      addToast(err?.message || 'Gagal mengubah status draft', 'error');
    }
  };

  // Delete Action Confirmation
  const confirmDelete = async () => {
    if (!deletingDraft) return;

    try {
      setDeleteLoading(true);
      const res = await fetch(`/api/drafts/${deletingDraft.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menghapus draft');
      }

      setDrafts((prev) => prev.filter((d) => d.id !== deletingDraft.id));
      addToast('Draft berhasil dihapus', 'info');
      setDeletingDraft(null);
    } catch (err: any) {
      addToast(err?.message || 'Gagal menghapus draft', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleModalSuccess = (savedDraft: ContentDraft) => {
    setDrafts((prev) => {
      const exists = prev.some((d) => d.id === savedDraft.id);
      if (exists) {
        return prev.map((d) => (d.id === savedDraft.id ? savedDraft : d));
      }
      return [savedDraft, ...prev];
    });

    addToast(
      editingDraft
        ? 'Perubahan draft berhasil disimpan!'
        : 'Draft konten baru berhasil dibuat!',
      'success'
    );
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
            <div className="flex items-center space-x-2 text-xs font-medium">
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

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Header & Title Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-threads-border pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-threads-surface border border-threads-border text-threads-accent shadow-sm">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-threads-text">
                  Manajemen Draft Konten
                </h1>
                <p className="text-xs text-threads-secondary">
                  Review & setujui copy yang digenerate oleh AI sebelum diterbitkan otomatis ke Threads
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-threads-border bg-threads-surface px-3.5 py-2 text-xs font-medium text-threads-text transition-colors hover:bg-threads-border disabled:opacity-50"
              title="Refresh Drafts"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingDraft(null);
                setCreateModalOpen(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-threads-accent px-4 py-2 text-xs font-semibold text-white shadow-md shadow-threads-accent/20 transition-all hover:opacity-90 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              <span>+ Buat Draft</span>
            </button>
          </div>
        </div>

        {/* Status Tab Navigation */}
        <div className="flex overflow-x-auto pb-1 scrollbar-none gap-2 border-b border-threads-border">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2 whitespace-nowrap px-4 py-2.5 text-xs font-medium transition-all duration-150 border-b-2 -mb-px',
                  isActive
                    ? 'border-threads-accent text-threads-text font-semibold'
                    : 'border-transparent text-threads-secondary hover:text-threads-text hover:border-threads-border'
                )}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'ml-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                    tab.badgeColor
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filters & Search Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Search bar */}
          <div className="relative sm:col-span-8">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-threads-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari draft berdasarkan judul, hook angle, isi post, atau produk..."
              className="w-full rounded-xl border border-threads-border bg-threads-card pl-10 pr-4 py-2 text-xs text-threads-text placeholder-threads-muted focus:border-threads-accent focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-threads-secondary hover:text-threads-text"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Product dropdown filter */}
          <div className="sm:col-span-4 flex items-center gap-2">
            <div className="relative w-full">
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full rounded-xl border border-threads-border bg-threads-card px-3.5 py-2 text-xs text-threads-text focus:border-threads-accent focus:outline-none appearance-none pr-8"
              >
                <option value="ALL">Semua Produk</option>
                <option value="NONE">-- Umum / Tanpa Produk --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-threads-secondary">
                <Filter className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Draft List / Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="h-64 rounded-xl border border-threads-border bg-threads-card/40 animate-pulse p-5 space-y-4"
              >
                <div className="flex justify-between">
                  <div className="h-5 w-24 rounded bg-threads-surface" />
                  <div className="h-5 w-20 rounded bg-threads-surface" />
                </div>
                <div className="h-5 w-3/4 rounded bg-threads-surface" />
                <div className="h-28 rounded-lg bg-threads-bg/50" />
                <div className="h-8 rounded bg-threads-surface" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/5 p-12 text-center">
            <AlertCircle className="h-10 w-10 text-rose-400 mb-3" />
            <h3 className="text-base font-semibold text-rose-300">Gagal Memuat Draft</h3>
            <p className="text-xs text-threads-secondary mt-1 max-w-md">{error}</p>
            <button
              onClick={fetchData}
              className="mt-4 rounded-xl bg-threads-surface border border-threads-border px-4 py-2 text-xs font-medium text-threads-text hover:bg-threads-border"
            >
              Coba Lagi
            </button>
          </div>
        ) : filteredDrafts.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-threads-border bg-threads-card/40 p-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-threads-surface border border-threads-border text-threads-secondary mb-4">
              <FileText className="h-7 w-7" />
            </div>
            <h3 className="text-base font-semibold text-threads-text">
              {searchQuery || selectedProductId !== 'ALL' || activeTab !== 'ALL'
                ? 'Tidak ada draft yang cocok dengan filter'
                : 'Belum ada draft konten'}
            </h3>
            <p className="text-xs text-threads-secondary mt-1.5 max-w-sm">
              {searchQuery || selectedProductId !== 'ALL' || activeTab !== 'ALL'
                ? 'Coba ganti kata kunci pencarian atau sesuaikan filter status / produk Anda.'
                : 'Mulai buat draft postingan Threads secara manual atau generate otomatis lewat AI.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingDraft(null);
                setCreateModalOpen(true);
              }}
              className="mt-5 flex items-center gap-2 rounded-xl bg-threads-accent px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-threads-accent/20 hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              <span>+ Buat Draft Pertama</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDrafts.map((draft) => (
              <DraftCard
                key={draft.id}
                draft={draft}
                onApprove={handleQuickApprove}
                onEdit={(d) => {
                  setEditingDraft(d);
                  setCreateModalOpen(true);
                }}
                onDelete={(d) => setDeletingDraft(d)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Draft Modal */}
      <CreateDraftModal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setEditingDraft(null);
        }}
        onSuccess={handleModalSuccess}
        products={products}
        editingDraft={editingDraft}
      />

      {/* Delete Confirmation Modal */}
      {deletingDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setDeletingDraft(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-rose-500/30 bg-threads-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-threads-text">
                Hapus Draft Konten?
              </h3>
            </div>
            <p className="text-xs text-threads-secondary leading-relaxed">
              Apakah Anda yakin ingin menghapus draft{' '}
              <span className="font-semibold text-threads-text">"{deletingDraft.title}"</span>?
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setDeletingDraft(null)}
                disabled={deleteLoading}
                className="rounded-xl border border-threads-border bg-threads-surface px-4 py-2 text-xs font-medium text-threads-text hover:bg-threads-border"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteLoading}
                className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {deleteLoading && (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                <span>Hapus Draft</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
