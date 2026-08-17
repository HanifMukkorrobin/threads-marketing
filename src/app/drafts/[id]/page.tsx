'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  Trash2,
  Plus,
  Sparkles,
  Package,
  Clock,
  ExternalLink,
  AlertCircle,
  X,
  Bot,
  User,
  Layers,
  ChevronRight,
  Info,
  Wand2,
  Send,
  RefreshCw,
} from 'lucide-react';
import { ContentDraft, DraftStatus } from '@/types/draft';
import { Product } from '@/types/product';
import { DraftStatusBadge } from '@/components/DraftStatusBadge';
import { ThreadPartEditor } from '@/components/ThreadPartEditor';
import { ThreadsPreview } from '@/components/ThreadsPreview';
import {
  ThreadPartState,
  addThreadPart,
  removeThreadPart,
  moveThreadPartUp,
  moveThreadPartDown,
  updateThreadPartContent,
  updateThreadPartMedia,
  validateThreadDraft,
  prepareDraftPayload,
  getCharCountStatus,
} from '@/lib/thread-editor';
import { cn } from '@/lib/utils';

const HOOK_PRESETS = [
  'Problem & Solution',
  'Price Comparison',
  'Storytelling & Relate',
  'Productivity Hack',
  'FOMO & Promo Limit',
];

const REVISION_QUICK_PROMPTS = [
  { label: '💬 Post 3 Ajak DM Langsung', prompt: 'ubah post 3 menjadi ajak DM langsung admin untuk cek stok dan aktivasi kilat', target: 2 },
  { label: '🎭 Hook Lebih Santai & Relate', prompt: 'bikin hook post 1 lebih santai dan curhat relate', target: 0 },
  { label: '🔥 Gaya FOMO Promo Terbatas', prompt: 'bikin gaya FOMO kuota terbatas', target: null },
  { label: '💰 Rinci Varian Harga', prompt: 'tambahkan rincian varian harga hemat', target: 1 },
  { label: '⚡️ Lebih To-The-Point', prompt: 'ringkas lebih to the point dan padat', target: null },
];

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error' | 'warning';
}

export default function DraftDetailPage() {
  const params = useParams();
  const router = useRouter();
  const draftId = params?.id as string;

  const [draft, setDraft] = useState<ContentDraft | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [productId, setProductId] = useState<string>('');
  const [hookAngle, setHookAngle] = useState<string>('');
  const [posts, setPosts] = useState<ThreadPartState[]>([
    { id: 'initial-1', orderIndex: 0, content: '', mediaUrl: null },
  ]);
  const [status, setStatus] = useState<DraftStatus>('PENDING_REVIEW');

  // AI Revision State
  const [revisionInstruction, setRevisionInstruction] = useState('');
  const [revisionTarget, setRevisionTarget] = useState<number | null>(null);
  const [revising, setRevising] = useState(false);
  const [isRevisionOpen, setIsRevisionOpen] = useState(true);

  // Action states
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (message: string, type: 'success' | 'info' | 'error' | 'warning' = 'info') => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const [storeProfile, setStoreProfile] = useState<{ name: string; username: string }>({
    name: 'Toko Digital ID',
    username: 'tokodigital.id',
  });

  // Fetch initial draft data and product list
  const fetchDraftAndProducts = useCallback(async () => {
    if (!draftId) return;

    try {
      setLoading(true);
      setError(null);

      const [draftRes, productsRes, settingsRes] = await Promise.all([
        fetch(`/api/drafts/${draftId}`, { cache: 'no-store' }),
        fetch('/api/products', { cache: 'no-store' }),
        fetch('/api/settings', { cache: 'no-store' }),
      ]);

      const draftData = await draftRes.json();
      const productsData = await productsRes.json();

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData.settings) {
          setStoreProfile({
            name: settingsData.settings.STORE_NAME || 'Toko Digital ID',
            username: settingsData.settings.STORE_USERNAME || 'tokodigital.id',
          });
        }
      }

      if (!draftRes.ok || !draftData.success || !draftData.data) {
        throw new Error(draftData.error || 'Draft tidak ditemukan');
      }

      const fetchedDraft: ContentDraft = draftData.draft || draftData.data;
      setDraft(fetchedDraft);
      setTitle(fetchedDraft.title || '');
      setProductId(fetchedDraft.productId || '');
      setHookAngle(fetchedDraft.hookAngle || '');
      setStatus((fetchedDraft.status as DraftStatus) || 'PENDING_REVIEW');

      if (Array.isArray(fetchedDraft.posts) && fetchedDraft.posts.length > 0) {
        setPosts(
          fetchedDraft.posts.map((p, idx) => ({
            id: p.id || `post-${idx}`,
            orderIndex: p.orderIndex ?? idx,
            content: p.content || '',
            mediaUrl: p.mediaUrl || null,
          }))
        );
      } else {
        setPosts([
          { id: 'part-0', orderIndex: 0, content: '', mediaUrl: null },
        ]);
      }

      if (productsData.success && Array.isArray(productsData.data)) {
        setProducts(productsData.data);
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat detail draft');
    } finally {
      setLoading(false);
    }
  }, [draftId]);

  useEffect(() => {
    fetchDraftAndProducts();
  }, [fetchDraftAndProducts]);

  // Thread Part Manipulation Handlers
  const handleContentChange = (index: number, content: string) => {
    setPosts((prev) => updateThreadPartContent(prev, index, content));
  };

  const handleMediaChange = (index: number, mediaUrl: string | null) => {
    setPosts((prev) => updateThreadPartMedia(prev, index, mediaUrl));
  };

  const handleMoveUp = (index: number) => {
    setPosts((prev) => moveThreadPartUp(prev, index));
  };

  const handleMoveDown = (index: number) => {
    setPosts((prev) => moveThreadPartDown(prev, index));
  };

  const handleRemovePart = (index: number) => {
    setPosts((prev) => removeThreadPart(prev, index));
  };

  const handleAddPart = () => {
    setPosts((prev) => addThreadPart(prev, ''));
  };

  // Selected product object
  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === productId) || null;
  }, [products, productId]);

  // Save Draft Changes (PUT /api/drafts/[id])
  const handleSaveDraft = async () => {
    const validation = validateThreadDraft(posts, title);
    if (!validation.isValid) {
      addToast(validation.errors[0], 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = prepareDraftPayload({
        title,
        hookAngle,
        productId,
        posts,
      });

      const res = await fetch(`/api/drafts/${draftId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyimpan perubahan draft');
      }

      const updatedDraft: ContentDraft = data.draft || data.data;
      setDraft(updatedDraft);
      if (updatedDraft.posts) {
        setPosts(
          updatedDraft.posts.map((p, idx) => ({
            id: p.id || `post-${idx}`,
            orderIndex: p.orderIndex ?? idx,
            content: p.content || '',
            mediaUrl: p.mediaUrl || null,
          }))
        );
      }

      addToast('Perubahan draft berhasil disimpan!', 'success');
    } catch (err: any) {
      addToast(err?.message || 'Terjadi kesalahan saat menyimpan draft', 'error');
    } finally {
      setSaving(false);
    }
  };

  // AI Instant Revision Execution (POST /api/drafts/[id]/revise)
  const handleExecuteRevision = async (customText?: string, explicitTarget?: number | null) => {
    const instr = (customText ?? revisionInstruction).trim();
    if (!instr) {
      addToast('Tulis instruksi revisi terlebih dahulu', 'warning');
      return;
    }

    const target = explicitTarget !== undefined ? explicitTarget : revisionTarget;

    try {
      setRevising(true);
      const res = await fetch(`/api/drafts/${draftId}/revise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: instr,
          targetPartIndex: target,
          autoSave: true,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal memproses revisi AI');
      }

      const revisedPosts = json.data?.posts || [];
      if (Array.isArray(revisedPosts) && revisedPosts.length > 0) {
        setPosts(
          revisedPosts.map((p: any, idx: number) => ({
            id: posts[idx]?.id || `post-${idx}`,
            orderIndex: idx,
            content: p.content || '',
            mediaUrl: p.mediaUrl || null,
          }))
        );
      }

      addToast(json.message || 'Revisi AI berhasil diterapkan!', 'success');
      setRevisionInstruction('');
    } catch (err: any) {
      addToast(err?.message || 'Terjadi kesalahan saat meminta revisi AI', 'error');
    } finally {
      setRevising(false);
    }
  };

  // Quick Approve Draft (PATCH /api/drafts/[id])
  const handleApproveDraft = async () => {
    const validation = validateThreadDraft(posts, title);
    if (!validation.isValid) {
      addToast(validation.errors[0], 'error');
      return;
    }

    try {
      setApproving(true);

      // Save latest content first
      const payload = prepareDraftPayload({
        title,
        hookAngle,
        productId,
        posts,
      });

      await fetch(`/api/drafts/${draftId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Then patch status to APPROVED
      const res = await fetch(`/api/drafts/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyetujui draft');
      }

      const updatedDraft: ContentDraft = data.draft || data.data;
      setDraft(updatedDraft);
      setStatus('APPROVED');

      addToast('Draft disetujui (Approved)! Siap dijadwalkan / diposting.', 'success');
    } catch (err: any) {
      addToast(err?.message || 'Gagal menyetujui draft', 'error');
    } finally {
      setApproving(false);
    }
  };

  // Delete Draft (DELETE /api/drafts/[id])
  const handleDeleteDraft = async () => {
    try {
      setDeleting(true);
      const res = await fetch(`/api/drafts/${draftId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menghapus draft');
      }

      addToast('Draft berhasil dihapus', 'info');
      router.push('/drafts');
    } catch (err: any) {
      addToast(err?.message || 'Gagal menghapus draft', 'error');
      setDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-threads-bg px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-24 rounded-lg bg-threads-surface animate-pulse" />
            <div className="h-6 w-36 rounded-full bg-threads-surface animate-pulse" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-4">
              <div className="h-12 rounded-xl bg-threads-card animate-pulse" />
              <div className="h-28 rounded-xl bg-threads-card animate-pulse" />
              <div className="h-44 rounded-xl bg-threads-card animate-pulse" />
              <div className="h-44 rounded-xl bg-threads-card animate-pulse" />
            </div>
            <div className="lg:col-span-5 hidden lg:block">
              <div className="h-[520px] rounded-3xl bg-threads-card/60 border border-threads-border animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !draft) {
    return (
      <div className="min-h-screen bg-threads-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-rose-500/30 bg-threads-card p-8 text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-rose-400 mx-auto" />
          <h2 className="text-lg font-bold text-threads-text">Draft Tidak Ditemukan</h2>
          <p className="text-xs text-threads-secondary leading-relaxed">
            {error || 'Draft konten yang Anda cari tidak ditemukan atau telah dihapus.'}
          </p>
          <Link
            href="/drafts"
            className="inline-flex items-center gap-2 rounded-xl bg-threads-surface border border-threads-border px-4 py-2.5 text-xs font-semibold text-threads-text hover:bg-threads-border transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Daftar Draft</span>
          </Link>
        </div>
      </div>
    );
  }

  const isThread = posts.length > 1;

  return (
    <div className="min-h-screen bg-threads-bg pb-28">
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-center justify-between rounded-xl border p-4 shadow-2xl backdrop-blur-md transition-all duration-300',
              toast.type === 'success' && 'border-emerald-500/40 bg-zinc-900/95 text-emerald-400',
              toast.type === 'error' && 'border-rose-500/40 bg-zinc-900/95 text-rose-400',
              toast.type === 'warning' && 'border-amber-500/40 bg-zinc-900/95 text-amber-400',
              toast.type === 'info' && 'border-threads-border bg-zinc-900/95 text-threads-text'
            )}
          >
            <div className="flex items-center space-x-2 text-xs font-medium">
              {toast.type === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
              {toast.type === 'error' && <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />}
              {toast.type === 'warning' && <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />}
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

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Top Navigation & Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-threads-border pb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/drafts"
              className="flex items-center gap-1.5 rounded-xl border border-threads-border bg-threads-surface px-3 py-1.5 text-xs font-medium text-threads-secondary hover:text-threads-text hover:bg-threads-border transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Daftar Draft</span>
            </Link>

            <ChevronRight className="h-3.5 w-3.5 text-threads-secondary/60 hidden sm:block" />

            <div className="flex items-center gap-2">
              <DraftStatusBadge status={status} size="sm" />

              {draft.source === 'HERMES_AI' ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-400 border border-purple-500/20">
                  <Bot className="h-3 w-3" />
                  Hermes AI
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400 border border-threads-border">
                  <User className="h-3 w-3" />
                  Manual
                </span>
              )}

              <span className="inline-flex items-center gap-1 rounded-md bg-threads-surface px-2 py-0.5 text-[10px] font-medium text-zinc-400 border border-threads-border">
                <Layers className="h-3 w-3" />
                {isThread ? `${posts.length} Post Thread` : 'Single Post'}
              </span>
            </div>
          </div>

          {/* Published info if already published */}
          {draft.status === 'PUBLISHED' && draft.threadPostUrl && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-sky-400 font-medium">Terpublikasi:</span>
              <a
                href={draft.threadPostUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-threads-accent hover:underline font-semibold"
              >
                <span>Lihat di Threads</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>

        {/* Dual-Pane Editor & Live Simulator */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Interactive Deep-Focus Editor */}
          <div className="lg:col-span-7 space-y-6">
            {/* Metadata Settings Card */}
            <div className="rounded-2xl border border-threads-border bg-threads-card p-5 space-y-4 shadow-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-threads-secondary flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-threads-accent" />
                Metadata Postingan
              </h2>

              {/* Title Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-threads-text">
                  Judul Internal Draft <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: 5 Alasan Kenapa Harus Pakai Canva Pro..."
                  className="w-full rounded-xl border border-threads-border bg-threads-bg px-3.5 py-2.5 text-sm text-threads-text placeholder-threads-muted focus:border-threads-accent focus:outline-none"
                />
              </div>

              {/* Product and Hook Angle Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Product Dropdown */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1 text-xs font-medium text-threads-text">
                    <Package className="h-3.5 w-3.5 text-threads-accent" />
                    Katalog Produk
                  </label>
                  <select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="w-full rounded-xl border border-threads-border bg-threads-bg px-3.5 py-2.5 text-xs text-threads-text focus:border-threads-accent focus:outline-none"
                  >
                    <option value="">-- Umum / Tanpa Produk Spesifik --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.category})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Hook Angle Field with Presets */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1 text-xs font-medium text-threads-text">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    Hook Angle / Sudut Copywriting
                  </label>
                  <input
                    type="text"
                    value={hookAngle}
                    onChange={(e) => setHookAngle(e.target.value)}
                    placeholder="e.g. Tips & Tricks, Price Comparison..."
                    className="w-full rounded-xl border border-threads-border bg-threads-bg px-3.5 py-2.5 text-xs text-threads-text placeholder-threads-muted focus:border-threads-accent focus:outline-none"
                  />
                </div>
              </div>

              {/* Hook Angle Quick Pills */}
              <div className="space-y-1 pt-1">
                <span className="text-[11px] text-threads-secondary">
                  Preset sudut copy:
                </span>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {HOOK_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setHookAngle(preset)}
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors border',
                        hookAngle === preset
                          ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                          : 'border-threads-border bg-threads-surface text-threads-secondary hover:text-threads-text'
                      )}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Interactive Revision Copilot */}
            <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-b from-purple-950/20 to-threads-card p-5 space-y-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 shrink-0">
                    <Wand2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                      AI Copilot Revision
                      <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-mono text-purple-300 border border-purple-500/30">
                        ecommerce-copy-humanizer-id
                      </span>
                    </h2>
                    <p className="text-[11px] text-threads-secondary">
                      Minta revisi instan dengan instruksi bahasa manusia (misal: "ubah post 3 jadi ajak DM").
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsRevisionOpen(!isRevisionOpen)}
                  className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors"
                >
                  {isRevisionOpen ? 'Sembunyikan' : 'Buka Panel'}
                </button>
              </div>

              {isRevisionOpen && (
                <div className="space-y-3.5 pt-1">
                  {/* Quick Prompts Chips */}
                  <div className="space-y-1">
                    <span className="text-[11px] text-threads-secondary font-medium">
                      Preset Instruksi Cepat:
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {REVISION_QUICK_PROMPTS.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          disabled={revising}
                          onClick={() => {
                            setRevisionInstruction(item.prompt);
                            setRevisionTarget(item.target);
                            handleExecuteRevision(item.prompt, item.target);
                          }}
                          className="rounded-full border border-purple-500/20 bg-purple-950/40 px-2.5 py-1 text-[11px] font-medium text-purple-200 hover:bg-purple-900/40 hover:border-purple-400/40 transition-colors active:scale-95 disabled:opacity-50"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Target Part Selector Pills */}
                  <div className="space-y-1">
                    <span className="text-[11px] text-threads-secondary font-medium">
                      Target Bagian yang Direvisi:
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setRevisionTarget(null)}
                        className={cn(
                          'rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors',
                          revisionTarget === null
                            ? 'border-purple-500/60 bg-purple-500/20 text-purple-200'
                            : 'border-threads-border bg-threads-surface text-threads-secondary hover:text-threads-text'
                        )}
                      >
                        Seluruh Thread
                      </button>
                      {posts.map((_, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => setRevisionTarget(pIdx)}
                          className={cn(
                            'rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors',
                            revisionTarget === pIdx
                              ? 'border-purple-500/60 bg-purple-500/20 text-purple-200'
                              : 'border-threads-border bg-threads-surface text-threads-secondary hover:text-threads-text'
                          )}
                        >
                          Post {pIdx + 1} {pIdx === 0 ? '(Hook)' : pIdx === posts.length - 1 ? '(CTA)' : '(Value)'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Input Box & Submit Button */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={revisionInstruction}
                      onChange={(e) => setRevisionInstruction(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleExecuteRevision();
                        }
                      }}
                      disabled={revising}
                      placeholder={
                        revisionTarget !== null
                          ? `Tulis instruksi revisi khusus untuk Post ${revisionTarget + 1}...`
                          : 'Contoh: ubah post 3 menjadi ajak DM langsung, atau bikin gaya FOMO promo...'
                      }
                      className="flex-1 rounded-xl border border-purple-500/30 bg-zinc-950/80 px-3.5 py-2.5 text-xs text-threads-text placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
                    />
                    <button
                      type="button"
                      disabled={revising || !revisionInstruction.trim()}
                      onClick={() => handleExecuteRevision()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-purple-900/30 hover:bg-purple-500 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {revising ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Memproses...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Revisi AI</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Thread Posts List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="space-y-0.5">
                  <h2 className="text-sm font-semibold text-threads-text flex items-center gap-2">
                    <Layers className="h-4 w-4 text-sky-400" />
                    Struktur Rantai Thread ({posts.length} Post)
                  </h2>
                  <p className="text-xs text-threads-secondary">
                    Setiap part dibatasi maksimal 500 karakter sesuai batasan resmi Threads API
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddPart}
                  className="flex items-center gap-1.5 rounded-xl border border-threads-accent/40 bg-threads-accent/10 px-3 py-1.5 text-xs font-semibold text-threads-accent hover:bg-threads-accent/20 transition-colors active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tambah Part</span>
                </button>
              </div>

              {/* Dynamic Post Editors */}
              <div className="space-y-3.5">
                {posts.map((part, index) => (
                  <ThreadPartEditor
                    key={part.id}
                    part={part}
                    index={index}
                    totalParts={posts.length}
                    onContentChange={handleContentChange}
                    onMediaChange={handleMediaChange}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                    onRemove={handleRemovePart}
                  />
                ))}
              </div>

              {/* Add Part Full Width Button */}
              <button
                type="button"
                onClick={handleAddPart}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-threads-border bg-threads-card/40 py-3.5 text-xs font-medium text-threads-secondary hover:text-threads-text hover:border-threads-accent/50 hover:bg-threads-surface/50 transition-all active:scale-[0.99]"
              >
                <Plus className="h-4 w-4 text-threads-accent" />
                <span>+ Tambah Part Post Lanjutan</span>
              </button>
            </div>
          </div>

          {/* Right Column: Live Authentic Threads Simulator */}
          <div className="lg:col-span-5 sticky top-6">
            <div className="rounded-2xl border border-threads-border bg-threads-card p-4 sm:p-5 shadow-sm">
              <ThreadsPreview
                posts={posts}
                accountName={storeProfile.name}
                accountHandle={storeProfile.username}
                productName={selectedProduct?.name || null}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Toolbar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-threads-border bg-threads-card/95 backdrop-blur-md px-4 py-3 sm:px-8 shadow-2xl">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-3">
          {/* Left: Delete & Status Info */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/20 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Hapus Draft</span>
            </button>

            <span className="text-[11px] text-threads-secondary hidden md:inline">
              ID: <span className="font-mono text-zinc-400">{draftId}</span>
            </span>
          </div>

          {/* Right: Save & Quick Approve */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving || approving}
              className="flex items-center gap-2 rounded-xl border border-threads-border bg-threads-surface px-4 py-2.5 text-xs font-semibold text-threads-text hover:bg-threads-border transition-colors disabled:opacity-50 active:scale-95"
            >
              {saving ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-threads-text border-t-transparent" />
              ) : (
                <Save className="h-3.5 w-3.5 text-threads-secondary" />
              )}
              <span>Simpan Perubahan</span>
            </button>

            <button
              type="button"
              onClick={handleApproveDraft}
              disabled={saving || approving}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 transition-all disabled:opacity-50 active:scale-95"
            >
              {approving ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              <span>Approve & Siap Posting</span>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setDeleteModalOpen(false)}
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
              <span className="font-semibold text-threads-text">"{title || draft.title}"</span>?
              Tindakan ini permanen dan tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
                className="rounded-xl border border-threads-border bg-threads-surface px-4 py-2 text-xs font-medium text-threads-text hover:bg-threads-border"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteDraft}
                disabled={deleting}
                className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {deleting && (
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
