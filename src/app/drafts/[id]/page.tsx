'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Trash2,
  Plus,
  Sparkles,
  ExternalLink,
  AlertCircle,
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
import { fireRetroConfetti } from '@/lib/confetti';
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
      setStatus((d.status as DraftStatus) || 'PENDING_REVIEW');

      if (d.posts && d.posts.length > 0) {
        const sorted = [...d.posts].sort((a, b) => a.orderIndex - b.orderIndex);
        setPosts(
          sorted.map((p) => ({
            id: p.id,
            orderIndex: p.orderIndex,
            content: p.content || '',
            mediaUrl: p.mediaUrl || null,
          }))
        );
      } else {
        setPosts([{ id: 'initial-1', orderIndex: 0, content: '', mediaUrl: null }]);
      }

      if (productsData.success && Array.isArray(productsData.data)) {
        setProducts(productsData.data);
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat data draft');
    } finally {
      setLoading(false);
    }
  }, [draftId]);

  useEffect(() => {
    if (draftId) {
      fetchDraftDetail();
    }
  }, [draftId, fetchDraftDetail]);

  const selectedProduct = useMemo(() => {
    if (!productId) return null;
    return products.find((p) => p.id === productId) || null;
  }, [productId, products]);

  // Editor actions
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

  const handleAddPart = () => {
    setPosts((prev) => addThreadPart(prev));
  };

  const handleRemovePart = (index: number) => {
    setPosts((prev) => removeThreadPart(prev, index));
  };

  // Save changes
  const handleSave = async () => {
    const validation = validateThreadDraft(posts, title);
    if (!validation.isValid) {
      addToast(validation.errorMessage || validation.errors[0] || 'Ada bagian post yang melebihi batas 500 karakter', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: title.trim(),
        productId: productId || null,
        hookAngle: hookAngle.trim() || null,
        status,
        type: posts.length > 1 ? 'THREAD_CHAIN' : 'SINGLE',
        posts: posts.map((p, idx) => ({
          id: p.id && !p.id.startsWith('part-') && !p.id.startsWith('initial-') ? p.id : undefined,
          orderIndex: idx,
          content: p.content.trim(),
          mediaUrl: p.mediaUrl ? p.mediaUrl.trim() : null,
        })),
      };

      const res = await fetch(`/api/drafts/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyimpan perubahan');
      }

      setDraft(data.data);
      addToast('Perubahan draft berhasil disimpan!', 'success');
    } catch (err: any) {
      addToast(err?.message || 'Gagal menyimpan draft', 'error');
    } finally {
      setSaving(false);
    }
  };

  // 1-Click Approve
  const handleApprove = async () => {
    try {
      setApproving(true);
      const res = await fetch(`/api/drafts/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyetujui draft');
      }

      setStatus('APPROVED');
      if (draft) setDraft({ ...draft, status: 'APPROVED' });
      fireRetroConfetti(0.5, 0.5);
      addToast('Draft disetujui! Masuk antrean posting otomatis Hermes.', 'success');
    } catch (err: any) {
      addToast(err?.message || 'Gagal menyetujui draft', 'error');
    } finally {
      setApproving(false);
    }
  };

  // Delete draft
  const handleDelete = async () => {
    try {
      setDeleting(true);
      const res = await fetch(`/api/drafts/${draftId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menghapus draft');
      }

      addToast('Draft berhasil dihapus', 'success');
      router.push('/drafts');
    } catch (err: any) {
      addToast(err?.message || 'Gagal menghapus draft', 'error');
      setDeleting(false);
    }
  };

  // AI Copilot Revision
  const handleCopilotRevision = async (customPrompt?: string) => {
    const instructionToUse = customPrompt || revisionInstruction;
    if (!instructionToUse.trim()) {
      addToast('Ketik instruksi revisi untuk AI Copilot', 'warning');
      return;
    }

    try {
      setRevising(true);
      const payload = {
        instruction: instructionToUse.trim(),
        targetPartIndex: revisionTarget,
        autoSave: false,
      };

      const res = await fetch(`/api/drafts/${draftId}/revise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.data) {
        throw new Error(data.error || 'Hermes AI gagal merevisi postingan');
      }

      const { posts: revisedPosts } = data.data;
      if (Array.isArray(revisedPosts) && revisedPosts.length > 0) {
        setPosts((prev) => {
          return revisedPosts.map((rp: any, idx: number) => {
            const existing = prev[idx];
            return {
              id: existing?.id || `revised-${idx}`,
              orderIndex: rp.orderIndex ?? idx,
              content: rp.content || '',
              mediaUrl: existing?.mediaUrl || null,
            };
          });
        });
      }

      fireRetroConfetti(0.5, 0.4);
      addToast('Hermes Copilot berhasil merevisi postingan!', 'success');
    } catch (err: any) {
      addToast(err?.message || 'Gagal menjalankan revisi AI Copilot', 'error');
    } finally {
      setRevising(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 lg:p-10 space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-[#D8C49D] rounded-retro-xs border-2 border-[#181816]" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-4">
            <div className="h-44 bg-white rounded-retro-xs border-2 border-[#181816]" />
            <div className="h-64 bg-white rounded-retro-xs border-2 border-[#181816]" />
          </div>
          <div className="lg:col-span-5">
            <div className="h-[600px] bg-white rounded-retro-xs border-2 border-[#181816]" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !draft) {
    return (
      <div className="p-12 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-retro-xs bg-rose-100 text-[#C95D53] border-2 border-[#181816] shadow-[3px_3px_0px_0px_#181816]">
          <AlertCircle className="h-7 w-7 stroke-[2.5]" />
        </div>
        <h2 className="text-xl font-black text-[#181816] uppercase">Draft Tidak Ditemukan</h2>
        <p className="text-xs text-[#7A7468] max-w-sm mx-auto font-medium">{error || 'ID Draft tidak valid atau sudah dihapus.'}</p>
        <Link
          href="/drafts"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-retro-xs bg-[#6B9AC4] text-white text-xs font-black border-2 border-[#181816] shadow-[3px_3px_0px_0px_#181816] uppercase tracking-wider"
        >
          <ArrowLeft className="h-4 w-4 stroke-[2.5]" />
          <span>Kembali ke Drafts Hub</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-7 lg:p-9 space-y-7 animate-fadeIn bg-[#FAF6EE]">
      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-center justify-between gap-3 px-4 py-2.5 rounded-retro-xs border-2 border-[#181816] shadow-[3px_3px_0px_0px_#181816] text-xs font-black animate-scale-in transition-all',
              toast.type === 'success' && 'bg-[#6B9AC4] text-white',
              toast.type === 'error' && 'bg-[#C95D53] text-white',
              toast.type === 'warning' && 'bg-[#D8C49D] text-[#181816]',
              toast.type === 'info' && 'bg-white text-[#181816]'
            )}
          >
            <span>{toast.message}</span>
            <button type="button" onClick={() => removeToast(toast.id)} className="text-black/60 hover:text-black">✕</button>
          </div>
        ))}
      </div>

      {/* Top Breadcrumb & Action Bar */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b-2 border-[#181816] pb-5">
        <div className="space-y-1">
          <Link
            href="/drafts"
            className="inline-flex items-center gap-1.5 text-xs font-black text-[#4A463F] hover:text-[#181816] hover:underline transition-colors uppercase tracking-wider"
          >
            <ArrowLeft className="h-3.5 w-3.5 stroke-[3]" />
            <span>Kembali ke Semua Draft</span>
          </Link>
          <div className="flex items-center gap-3 pt-1">
            <h1 className="text-xl sm:text-2xl font-black text-[#181816] tracking-tight truncate max-w-lg uppercase">
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
            className="p-2 rounded-retro-xs bg-white text-zinc-400 hover:text-white hover:bg-[#C95D53] border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816] transition-all tap-effect"
            title="Hapus Draft"
          >
            <Trash2 className="h-4 w-4 stroke-[2.2]" />
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-retro-xs bg-white hover:bg-[#FAF6EE] text-[#181816] text-xs font-black border-2 border-[#181816] shadow-[2.5px_2.5px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-50 uppercase tracking-wider"
          >
            <Save className="h-4 w-4 stroke-[2.5]" />
            <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
          </button>

          {status === 'PENDING_REVIEW' && (
            <button
              type="button"
              onClick={handleApprove}
              disabled={approving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-retro-xs bg-[#C95D53] hover:bg-[#D45D52] text-white text-xs font-black border-2 border-[#181816] shadow-[3px_3px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-50 uppercase tracking-wider"
            >
              {approving ? (
                <RefreshCw className="h-4 w-4 animate-spin stroke-[2.5]" />
              ) : (
                <Check className="h-4 w-4 stroke-[3]" />
              )}
              <span>Setujui & Antrekan</span>
            </button>
          )}

          {status === 'PUBLISHED' && draft.threadPostUrl && (
            <a
              href={draft.threadPostUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-retro-xs bg-[#6B9AC4] text-white text-xs font-black border-2 border-[#181816] shadow-[2.5px_2.5px_0px_0px_#181816] hover:bg-[#5386B4] transition-all tap-effect uppercase tracking-wider"
            >
              <span>Lihat di Threads</span>
              <ExternalLink className="h-3.5 w-3.5 stroke-[2.5]" />
            </a>
          )}
        </div>
      </header>

      {/* Main Split-Screen Grid: Left Editor + Right Sticky Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        {/* Left Column: Metadata & AI Copilot & Posts Editor */}
        <div className="lg:col-span-7 space-y-6">
          {/* Metadata Card */}
          <div className="rounded-retro-sm border-2 border-[#181816] bg-white p-5 sm:p-6 space-y-4 shadow-[4px_4px_0px_0px_#181816]">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#181816] border-b-2 border-[#181816] pb-2">
              Informasi & Angle Konten
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black text-[#181816] mb-1.5 uppercase tracking-wider">
                  Judul Internal Draft
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Misal: Promo ChatGPT Plus Varian 1 Bulan Hemat"
                  className="w-full rounded-retro-xs bg-[#FAF6EE] border-2 border-[#181816] px-4 py-2.5 text-xs sm:text-sm text-[#181816] placeholder-zinc-400 font-bold shadow-[2px_2px_0px_0px_#181816] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-[#181816] mb-1.5 uppercase tracking-wider">
                    Produk Terkait
                  </label>
                  <select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="w-full rounded-retro-xs bg-[#FAF6EE] border-2 border-[#181816] px-3.5 py-2.5 text-xs text-[#181816] font-bold shadow-[2px_2px_0px_0px_#181816] focus:outline-none cursor-pointer"
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
                  <label className="block text-xs font-black text-[#181816] mb-1.5 uppercase tracking-wider">
                    Hook & Content Angle
                  </label>
                  <input
                    type="text"
                    value={hookAngle}
                    onChange={(e) => setHookAngle(e.target.value)}
                    placeholder="Misal: Price Comparison"
                    className="w-full rounded-retro-xs bg-[#FAF6EE] border-2 border-[#181816] px-3.5 py-2.5 text-xs text-[#181816] font-bold shadow-[2px_2px_0px_0px_#181816] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* AI Copilot Revision Bento Box */}
          <div className="rounded-retro-sm border-[2.5px] border-[#181816] bg-[#FAF6EE] p-5 sm:p-6 text-[#181816] space-y-4 shadow-[5px_5px_0px_0px_#181816]">
            <div className="flex items-center justify-between border-b-2 border-[#181816] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-retro-xs bg-[#D8C49D] text-[#181816] text-sm font-black border-2 border-[#181816] shadow-[1.5px_1.5px_0px_0px_#181816]">
                  ✦
                </span>
                <div>
                  <h3 className="text-sm font-black text-[#181816] tracking-tight uppercase">
                    Hermes AI Revision Copilot
                  </h3>
                  <p className="text-[11px] text-[#4A463F] font-semibold">
                    Instruksikan perubahan gaya, harga, atau bagian tertentu dengan bahasa natural.
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
                  className="rounded-retro-xs bg-white hover:bg-[#D8C49D] text-[#181816] border-2 border-[#181816] shadow-[1.5px_1.5px_0px_0px_#181816] px-3 py-1 text-[11px] font-black transition-all tap-effect disabled:opacity-50 uppercase"
                >
                  {qp.label}
                </button>
              ))}
            </div>

            {/* Prompt Input Box */}
            <div className="space-y-3 pt-1">
              <div className="relative">
                <textarea
                  value={revisionInstruction}
                  onChange={(e) => setRevisionInstruction(e.target.value)}
                  disabled={revising}
                  placeholder="Ketik instruksi revisi bebas (contoh: 'ubah post 2 tambahkan perbandingan segelas kopi', 'bikin gaya santai relate gess')..."
                  rows={2}
                  className="w-full rounded-retro-xs bg-white border-2 border-[#181816] p-3 text-xs text-[#181816] placeholder-zinc-400 font-bold focus:bg-[#FAF6EE] focus:outline-none resize-none shadow-[2px_2px_0px_0px_#181816]"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 text-[11px] text-[#4A463F] font-black uppercase">
                  <span>Target:</span>
                  <select
                    value={revisionTarget === null ? 'ALL' : revisionTarget}
                    onChange={(e) =>
                      setRevisionTarget(e.target.value === 'ALL' ? null : Number(e.target.value))
                    }
                    className="rounded-retro-xs bg-white border-2 border-[#181816] px-2.5 py-1 text-[11px] text-[#181816] focus:outline-none cursor-pointer font-black shadow-[1.5px_1.5px_0px_0px_#181816]"
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
                  className="flex items-center justify-center gap-1.5 px-5 py-2 rounded-retro-xs bg-[#C95D53] hover:bg-[#D45D52] text-white text-xs font-black border-2 border-[#181816] shadow-[2.5px_2.5px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all tap-effect disabled:opacity-50 uppercase tracking-wider"
                >
                  {revising ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin stroke-[2.5]" />
                  ) : (
                    <Wand2 className="h-3.5 w-3.5 stroke-[2.5]" />
                  )}
                  <span>{revising ? 'Meracik Revisi...' : 'Revisi dengan AI'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Posts Editor Chain */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#181816]">
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
                className="w-full flex items-center justify-center gap-2 py-3 rounded-retro-sm border-2 border-dashed border-[#181816] bg-white hover:bg-[#FAF6EE] text-xs font-black text-[#181816] shadow-[2px_2px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all tap-effect uppercase tracking-wider"
              >
                <Plus className="h-4 w-4 stroke-[3]" />
                <span>+ Tambah Bagian Postingan Lanjutan</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Phone Simulator */}
        <div className="lg:col-span-5 sticky top-6">
          <div className="rounded-retro-sm border-2 border-[#181816] bg-white p-5 space-y-4 shadow-[4px_4px_0px_0px_#181816]">
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
            <div className="flex h-11 w-11 items-center justify-center rounded-retro-xs bg-rose-100 text-[#C95D53] border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816]">
              <Trash2 className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-sm font-black text-[#181816] uppercase">Hapus Draft Ini?</h3>
              <p className="text-xs text-[#7A7468] font-medium">Tindakan ini permanen.</p>
            </div>
          </div>

          <p className="text-xs text-[#181816] bg-[#FAF6EE] p-3 rounded-retro-xs border-2 border-[#181816] font-black shadow-[2px_2px_0px_0px_#181816]">
            &quot;{title}&quot;
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleting}
              className="px-4 py-2 rounded-retro-xs border-2 border-[#181816] text-xs font-bold text-[#181816] hover:bg-white shadow-[2px_2px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all uppercase tracking-wider"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-retro-xs bg-[#C95D53] hover:bg-[#D45D52] text-white text-xs font-black border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all uppercase tracking-wider"
            >
              {deleting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 stroke-[2.5]" />}
              <span>Hapus Draft</span>
            </button>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
