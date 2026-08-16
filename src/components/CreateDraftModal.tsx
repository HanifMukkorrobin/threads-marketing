'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  Package,
  Layers,
  FileText,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { Product } from '@/types/product';
import { ContentDraft, CreateDraftInput, DraftStatus } from '@/types/draft';
import { cn } from '@/lib/utils';

interface CreateDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (draft: ContentDraft) => void;
  products: Product[];
  editingDraft?: ContentDraft | null;
}

const HOOK_PRESETS = [
  'Problem & Solution',
  'Price Comparison',
  'Tips & Tricks',
  'Storytelling / Curhat',
  'Mistakes to Avoid',
  'Feature Highlight',
  'FOMO & Promo Limit',
];

export function CreateDraftModal({
  isOpen,
  onClose,
  onSuccess,
  products,
  editingDraft,
}: CreateDraftModalProps) {
  const [title, setTitle] = useState('');
  const [productId, setProductId] = useState<string>('');
  const [hookAngle, setHookAngle] = useState('');
  const [status, setStatus] = useState<DraftStatus>('PENDING_REVIEW');
  const [posts, setPosts] = useState<{ content: string; mediaUrl: string }[]>([
    { content: '', mediaUrl: '' },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Synchronize initial state when opening modal or changing editingDraft
  useEffect(() => {
    if (editingDraft) {
      setTitle(editingDraft.title || '');
      setProductId(editingDraft.productId || '');
      setHookAngle(editingDraft.hookAngle || '');
      setStatus((editingDraft.status as DraftStatus) || 'PENDING_REVIEW');
      if (editingDraft.posts && editingDraft.posts.length > 0) {
        setPosts(
          editingDraft.posts.map((p) => ({
            content: p.content || '',
            mediaUrl: p.mediaUrl || '',
          }))
        );
      } else {
        setPosts([{ content: '', mediaUrl: '' }]);
      }
    } else {
      setTitle('');
      setProductId('');
      setHookAngle('');
      setStatus('PENDING_REVIEW');
      setPosts([{ content: '', mediaUrl: '' }]);
    }
    setError(null);
  }, [editingDraft, isOpen]);

  if (!isOpen) return null;

  const handleAddPost = () => {
    setPosts((prev) => [...prev, { content: '', mediaUrl: '' }]);
  };

  const handleRemovePost = (index: number) => {
    if (posts.length <= 1) return;
    setPosts((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePostChange = (
    index: number,
    field: 'content' | 'mediaUrl',
    val: string
  ) => {
    setPosts((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: val } : p))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Form Validations
    if (!title.trim()) {
      setError('Judul draft wajib diisi');
      return;
    }

    const validPosts = posts.filter((p) => p.content.trim().length > 0);
    if (validPosts.length === 0) {
      setError('Minimal harus ada 1 post dengan konten teks');
      return;
    }

    try {
      setLoading(true);

      const payload: CreateDraftInput = {
        title: title.trim(),
        productId: productId ? productId : null,
        hookAngle: hookAngle.trim() || null,
        status: status,
        type: validPosts.length > 1 ? 'THREAD_CHAIN' : 'SINGLE',
        posts: validPosts.map((p, index) => ({
          orderIndex: index,
          content: p.content.trim(),
          mediaUrl: p.mediaUrl.trim() || null,
        })),
      };

      const url = editingDraft ? `/api/drafts/${editingDraft.id}` : '/api/drafts';
      const method = editingDraft ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyimpan draft');
      }

      onSuccess(data.draft || data.data);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan saat menyimpan draft');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-threads-border bg-threads-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-threads-border px-6 py-4">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-threads-surface border border-threads-border text-threads-accent">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-threads-text">
                {editingDraft ? 'Edit Draft Konten' : 'Buat Draft Konten Baru'}
              </h2>
              <p className="text-xs text-threads-secondary">
                {editingDraft
                  ? 'Perbarui teks, hook, atau rantai postingan thread'
                  : 'Tulis manual postingan tunggal atau rangkaian thread Threads'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-threads-secondary transition-colors hover:bg-threads-surface hover:text-threads-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-threads-text">
              Judul Draft <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: 5 Alasan Beralih ke Canva Pro Lifetime"
              className="w-full rounded-xl border border-threads-border bg-threads-bg px-3.5 py-2.5 text-sm text-threads-text placeholder-threads-muted focus:border-threads-accent focus:outline-none"
              required
            />
          </div>

          {/* Product & Hook Angle in 2 cols */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Product Selector */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1 text-xs font-semibold text-threads-text">
                <Package className="h-3.5 w-3.5 text-threads-accent" />
                Produk Terkait
              </label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full rounded-xl border border-threads-border bg-threads-bg px-3 py-2.5 text-sm text-threads-text focus:border-threads-accent focus:outline-none"
              >
                <option value="">-- Umum / Tanpa Produk Spesifik --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Hook Angle */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1 text-xs font-semibold text-threads-text">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                Hook Angle / Sudut Pandang
              </label>
              <input
                type="text"
                list="hook-presets"
                value={hookAngle}
                onChange={(e) => setHookAngle(e.target.value)}
                placeholder="Pilih atau ketik angle..."
                className="w-full rounded-xl border border-threads-border bg-threads-bg px-3.5 py-2.5 text-sm text-threads-text placeholder-threads-muted focus:border-threads-accent focus:outline-none"
              />
              <datalist id="hook-presets">
                {HOOK_PRESETS.map((angle) => (
                  <option key={angle} value={angle} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Initial Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-threads-text">
              Status Awal
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatus('PENDING_REVIEW')}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-medium transition-all',
                  status === 'PENDING_REVIEW'
                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-300 shadow-sm'
                    : 'border-threads-border bg-threads-bg text-threads-secondary hover:bg-threads-surface'
                )}
              >
                <span>Menunggu Review</span>
              </button>
              <button
                type="button"
                onClick={() => setStatus('APPROVED')}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-medium transition-all',
                  status === 'APPROVED'
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300 shadow-sm'
                    : 'border-threads-border bg-threads-bg text-threads-secondary hover:bg-threads-surface'
                )}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Langsung Setujui (Approved)</span>
              </button>
            </div>
          </div>

          {/* Thread / Post Items Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-threads-accent" />
                <span className="text-xs font-semibold text-threads-text">
                  Postingan Konten ({posts.length} {posts.length > 1 ? 'Part Thread' : 'Post'})
                </span>
              </div>
              <span className="text-[11px] text-threads-secondary">
                Batas ideal: 500 karakter / post di Threads
              </span>
            </div>

            {/* Post cards list */}
            <div className="space-y-3">
              {posts.map((post, idx) => {
                const charCount = post.content.length;
                const isOverLimit = charCount > 500;

                return (
                  <div
                    key={idx}
                    className="relative rounded-xl border border-threads-border bg-threads-bg/80 p-3.5 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-threads-secondary uppercase tracking-wider">
                        {posts.length > 1 ? `Post #${idx + 1}` : 'Isi Post Utama'}
                      </span>
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'text-[11px] font-mono font-medium',
                            isOverLimit ? 'text-rose-400 font-bold' : 'text-threads-secondary'
                          )}
                        >
                          {charCount} / 500
                        </span>
                        {posts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePost(idx)}
                            className="rounded p-1 text-threads-secondary hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                            title="Hapus Bagian Post Ini"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Textarea */}
                    <textarea
                      rows={3}
                      value={post.content}
                      onChange={(e) => handlePostChange(idx, 'content', e.target.value)}
                      placeholder={`Tulis isi konten post ${idx + 1}...`}
                      className="w-full rounded-lg border border-threads-border bg-threads-card px-3 py-2 text-xs text-threads-text placeholder-threads-muted focus:border-threads-accent focus:outline-none resize-y"
                    />

                    {/* Optional Media URL */}
                    <input
                      type="url"
                      value={post.mediaUrl}
                      onChange={(e) => handlePostChange(idx, 'mediaUrl', e.target.value)}
                      placeholder="Optional: Link Media URL / Gambar (https://...)"
                      className="w-full rounded-lg border border-threads-border/70 bg-threads-card/70 px-3 py-1.5 text-[11px] text-zinc-300 placeholder-threads-muted focus:border-threads-accent focus:outline-none"
                    />
                  </div>
                );
              })}
            </div>

            {/* Add Next Thread Part Button */}
            <button
              type="button"
              onClick={handleAddPost}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-threads-border py-2.5 text-xs font-medium text-threads-secondary transition-colors hover:border-threads-accent/50 hover:bg-threads-surface/50 hover:text-threads-text"
            >
              <Plus className="h-3.5 w-3.5 text-threads-accent" />
              <span>+ Tambah Post Berikutnya ke Rangkaian Thread</span>
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-threads-border px-6 py-4 bg-threads-card">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-threads-border bg-threads-surface px-4 py-2 text-xs font-medium text-threads-text transition-colors hover:bg-threads-border disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-threads-accent px-5 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 shadow-md shadow-threads-accent/20"
          >
            {loading && <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            <span>{editingDraft ? 'Simpan Perubahan' : 'Buat Draft'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
