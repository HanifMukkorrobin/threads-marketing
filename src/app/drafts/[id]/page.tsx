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
  Wand2,
  RefreshCw,
  Check,
} from 'lucide-react';
import { ContentDraft, DraftStatus } from '@/types/draft';
import { Product } from '@/types/product';
import { DraftStatusBadge } from '@/components/DraftStatusBadge';
import { ThreadPartEditor } from '@/components/ThreadPartEditor';
import { ThreadsPreview } from '@/components/ThreadsPreview';
import { ModalPortal } from '@/components/ModalPortal';
import {
  ThreadPartState,
  addThreadPart,
  removeThreadPart,
  moveThreadPartUp,
  moveThreadPartDown,
  updateThreadPartContent,
  updateThreadPartMedia,
  validateThreadDraft,
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
      }, 3500);
    },
    []
  );

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch draft details & products
  const fetchDraftDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [draftRes, productsRes] = await Promise.all([
        fetch(`/api/drafts/${draftId}`, { cache: 'no-store' }),
        fetch('/api/products', { cache: 'no-store' }),
      ]);

      const draftData = await draftRes.json();
      const productsData = await productsRes.json();

      if (!draftRes.ok || !draftData.success || !draftData.data) {
        throw new Error(draftData.error || 'Draft tidak ditemukan');
      }

      const d: ContentDraft = draftData.data;
      setDraft(d);
      setTitle(d.title || '');
      setProductId(d.productId || '');
      setHookAngle(d.hookAngle || '');
      setStatus(d.status as DraftStatus);

      if (d.posts && d.posts.length > 0) {
        setPosts(
          d.posts.map((p, idx) => ({
            id: p.id || `post-${idx}`,
            orderIndex: p.orderIndex ?? idx,
            content: p.content || '',
            mediaUrl: p.mediaUrl || null,
          }))
        );
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
    if (draftId) fetchDraftDetail();
  }, [draftId, fetchDraftDetail]);

  // Selected product object
  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId) || draft?.product || null,
    [products, productId, draft]
  );

  // Validation
  const validation = useMemo(() => validateThreadDraft(posts, title), [posts, title]);

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
    setPosts((prev) => addThreadPart(prev));
  };

  // Save Draft
  const handleSave = async () => {
    if (!validation.isValid) {
      addToast(validation.errors[0] || 'Draft tidak valid', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title,
        productId: productId || null,
        hookAngle: hookAngle || null,
        status,
        posts: posts.map((p, idx) => ({
          orderIndex: idx,
          content: p.content,
          mediaUrl: p.mediaUrl || null,
        })),
      };

      const res = await fetch(`/api/drafts/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal menyimpan');

      setDraft(data.data);
      addToast('Perubahan draft berhasil disimpan!', 'success');
    } catch (err: any) {
      addToast(err?.message || 'Gagal menyimpan draft', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Approve Draft
  const handleApprove = async () => {
    try {
      setApproving(true);
      const res = await fetch(`/api/drafts/${draftId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal menyetujui');

      setStatus('APPROVED');
      if (draft) setDraft({ ...draft, status: 'APPROVED' });
      addToast('Draft disetujui & masuk antrean siap posting!', 'success');
    } catch (err: any) {
      addToast(err?.message || 'Gagal menyetujui draft', 'error');
    } finally {
      setApproving(false);
    }
  };

  // Delete Draft
  const handleDelete = async () => {
    try {
      setDeleting(true);
      const res = await fetch(`/api/drafts/${draftId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal menghapus');
      router.push('/drafts');
    } catch (err: any) {
      addToast(err?.message || 'Gagal menghapus draft', 'error');
      setDeleting(false);
    }
  };

  // AI Copilot Revision Handler
  const handleCopilotRevision = async (customInstruction?: string) => {
    const instructionToUse = customInstruction || revisionInstruction;
    if (!instructionToUse.trim()) {
      addToast('Masukkan instruksi revisi untuk Copilot!', 'warning');
      return;
    }

    try {
      setRevising(true);
      const res = await fetch(`/api/drafts/${draftId}/revise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: instructionToUse,
          targetPartIndex: revisionTarget,
          saveDirectly: false,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Copilot gagal merevisi draft');

      const revisedPosts = data.data.posts;
      if (Array.isArray(revisedPosts)) {
        setPosts(
          revisedPosts.map((p: any, idx: number) => ({
            id: p.id || `post-${idx}`,
            orderIndex: p.orderIndex ?? idx,
            content: p.content || '',
            mediaUrl: p.mediaUrl || null,
          }))
        );
      }

      if (data.data.title) setTitle(data.data.title);
      if (data.data.hookAngle) setHookAngle(data.data.hookAngle);

      setRevisionInstruction('');
      addToast('Hermes Copilot berhasil merevisi postingan!', 'success');
    } catch (err: any) {
      addToast(err?.message || 'Gagal menjalankan revisi AI Copilot', 'error');
    } finally {
      setRevising(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 lg:p-12 space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-zinc-200 rounded-full" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-4">
            <div className="h-44 bg-surface rounded-bento" />
            <div className="h-64 bg-surface rounded-bento" />
          </div>
          <div className="lg:col-span-5">
            <div className="h-[600px] bg-surface rounded-[36px]" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !draft) {
    return (
      <div className="p-12 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-bold text-ink">Draft Tidak Ditemukan</h2>
        <p className="text-xs text-ink-secondary max-w-sm mx-auto">{error || 'ID Draft tidak valid atau sudah dihapus.'}</p>
        <Link
          href="/drafts"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ink text-white text-xs font-bold shadow-pill"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Drafts Hub</span>
        </Link>
      </div>
    );
  }

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
              toast.type === 'warning' && 'bg-amber-500 text-black',
              toast.type === 'info' && 'bg-surface text-ink border border-surface-border'
            )}
          >
            <span>{toast.message}</span>
            <button type="button" onClick={() => removeToast(toast.id)} className="text-white/60 hover:text-white">✕</button>
          </div>
        ))}
      </div>

      {/* Top Breadcrumb & Action Bar */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-surface-border pb-6">
        <div className="space-y-1">
          <Link
            href="/drafts"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-secondary hover:text-ink transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Kembali ke Semua Draft</span>
          </Link>
          <div className="flex items-center gap-3 pt-1">
            <h1 className="text-xl sm:text-2xl font-extrabold text-ink tracking-tight truncate max-w-lg">
              {title || 'Draft Baru'}
            </h1>
            <DraftStatusBadge status={status} size="sm" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="p-2.5 rounded-full bg-white text-zinc-400 hover:text-rose-600 hover:bg-rose-50 border border-surface-border transition-all tap-effect"
            title="Hapus Draft"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-surface-hover text-ink text-xs font-bold border border-surface-border shadow-xs transition-all tap-effect disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
          </button>

          {status === 'PENDING_REVIEW' && (
            <button
              type="button"
              onClick={handleApprove}
              disabled={approving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-ink hover:bg-zinc-800 text-white text-xs font-bold shadow-pill transition-all tap-effect disabled:opacity-50"
            >
              {approving ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5 stroke-[2.5]" />
              )}
              <span>Setujui & Antrekan</span>
            </button>
          )}

          {status === 'PUBLISHED' && draft.threadPostUrl && (
            <a
              href={draft.threadPostUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-lime text-ink text-xs font-bold hover:bg-lime-hover shadow-xs transition-all tap-effect"
            >
              <span>Lihat di Threads</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </header>

      {/* Main Split-Screen Grid: Left Editor + Right Sticky Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Metadata & AI Copilot & Posts Editor */}
        <div className="lg:col-span-7 space-y-6">
          {/* Metadata Card */}
          <div className="rounded-bento border border-surface-border bg-surface p-6 space-y-4 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-secondary">
              Informasi & Angle Konten
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">
                  Judul Internal Draft
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Misal: Promo ChatGPT Plus Varian 1 Bulan Hemat"
                  className="w-full rounded-2xl bg-white border border-surface-border px-4 py-2.5 text-xs sm:text-sm text-ink placeholder-ink-muted focus:border-ink focus:outline-none transition-all shadow-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">
                    Produk Terkait
                  </label>
                  <select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="w-full rounded-2xl bg-white border border-surface-border px-3.5 py-2.5 text-xs text-ink font-medium focus:border-ink focus:outline-none transition-all shadow-xs cursor-pointer"
                  >
                    <option value="">-- Organik / Tanpa Produk --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">
                    Hook & Content Angle
                  </label>
                  <input
                    type="text"
                    value={hookAngle}
                    onChange={(e) => setHookAngle(e.target.value)}
                    placeholder="Misal: Price Comparison"
                    className="w-full rounded-2xl bg-white border border-surface-border px-3.5 py-2.5 text-xs text-ink placeholder-ink-muted focus:border-ink focus:outline-none transition-all shadow-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* AI Copilot Revision Bento Box */}
          <div className="rounded-bento border border-black/10 bg-ink p-6 text-white space-y-4 shadow-dock">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-lime text-ink text-sm font-black shadow-xs">
                  ✦
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Hermes AI Revision Copilot
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Instruksikan perubahan gaya, harga, atau ubah bagian spesifik dengan bahasa natural.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Prompt Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {REVISION_QUICK_PROMPTS.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setRevisionInstruction(qp.prompt);
                    setRevisionTarget(qp.target);
                    handleCopilotRevision(qp.prompt);
                  }}
                  disabled={revising}
                  className="rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-3 py-1 text-[11px] font-semibold transition-all tap-effect disabled:opacity-50"
                >
                  {qp.label}
                </button>
              ))}
            </div>

            {/* Prompt Input Box */}
            <div className="space-y-2 pt-2">
              <div className="relative">
                <textarea
                  value={revisionInstruction}
                  onChange={(e) => setRevisionInstruction(e.target.value)}
                  disabled={revising}
                  placeholder="Ketik instruksi revisi bebas (contoh: 'ubah post 2 tambahkan perbandingan segelas kopi', 'bikin gaya santai relate gess')..."
                  rows={2}
                  className="w-full rounded-2xl bg-zinc-900 border border-zinc-700 p-3.5 text-xs text-white placeholder-zinc-500 focus:border-lime focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <span>Target:</span>
                  <select
                    value={revisionTarget === null ? 'ALL' : revisionTarget}
                    onChange={(e) =>
                      setRevisionTarget(e.target.value === 'ALL' ? null : Number(e.target.value))
                    }
                    className="rounded-full bg-zinc-900 border border-zinc-700 px-2.5 py-1 text-[11px] text-white focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">Semua Bagian (Tone Shift)</option>
                    {posts.map((_, idx) => (
                      <option key={idx} value={idx}>
                        Hanya Post #{idx + 1}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopilotRevision()}
                  disabled={revising || !revisionInstruction.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-lime hover:bg-lime-hover text-ink text-xs font-bold transition-all tap-effect shadow-pill disabled:opacity-50"
                >
                  {revising ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="h-3.5 w-3.5" />
                  )}
                  <span>{revising ? 'Meracik Revisi...' : 'Revisi dengan AI'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Posts Editor Chain */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-secondary">
                Rangkaian Postingan Thread ({posts.length} Bagian)
              </h2>
            </div>

            <div className="space-y-4">
              {posts.map((part, idx) => (
                <ThreadPartEditor
                  key={part.id || idx}
                  part={part}
                  index={idx}
                  totalParts={posts.length}
                  onContentChange={handleContentChange}
                  onMediaChange={handleMediaChange}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  onRemove={handleRemovePart}
                />
              ))}
            </div>

            {/* Add Part Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleAddPart}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-surface-border bg-surface hover:bg-surface-hover text-xs font-bold text-ink transition-all tap-effect"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                <span>+ Tambah Bagian Postingan Lanjutan</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Phone Simulator */}
        <div className="lg:col-span-5 sticky top-6">
          <div className="rounded-bento border border-surface-border bg-surface p-6 space-y-4 shadow-xs">
            <ThreadsPreview
              posts={posts}
              accountName="Toko Digital ID"
              accountHandle="tokodigital.id"
              productName={selectedProduct?.name}
            />
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ModalPortal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
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
            &quot;{title}&quot;
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleting}
              className="px-4 py-2 rounded-full border border-surface-border text-xs font-semibold text-ink hover:bg-surface transition-colors"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all tap-effect"
            >
              {deleting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              <span>Hapus Draft</span>
            </button>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
