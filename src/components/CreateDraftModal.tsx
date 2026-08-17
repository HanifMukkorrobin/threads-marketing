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
  Wand2,
  RefreshCw,
  Tag,
  PenTool,
  Check,
} from 'lucide-react';
import { Product } from '@/types/product';
import { ContentDraft, CreateDraftInput, DraftStatus } from '@/types/draft';
import { ModalPortal } from '@/components/ModalPortal';
import { cn } from '@/lib/utils';

interface CreateDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (draft: ContentDraft) => void;
  products: Product[];
  editingDraft?: ContentDraft | null;
}

const AI_ANGLES = [
  { id: 'contrarian', label: '💡 Contrarian / Unpopular Opinion', desc: 'Menentang anggapan umum & bongkar mitos' },
  { id: 'micro_story', label: '📖 Micro-Story & Curhat Relate', desc: 'Cerita skenario nugas, kerjaan, atau deadline' },
  { id: 'price_breakdown', label: '💰 Value & Coffee Comparison', desc: 'Bandingkan dengan segelas kopi harian' },
  { id: 'productivity_hack', label: '⚡️ Productivity & Workflow Hack', desc: 'Trik hemat waktu 3x lebih cepat' },
  { id: 'fomo_urgency', label: '🔥 FOMO & Slot Promo Terbatas', desc: 'Urgensi restock kuota terbatas' },
  { id: 'mistakes_to_avoid', label: '⚠️ Kesalahan Fatal Pemula', desc: 'Bahaya akun ilegal vs keuntungan akun legal' },
  { id: 'organic_tips', label: '🚀 Tips & Insight Digital Organik', desc: 'Konten edukasi non-jualan untuk engagement' },
];

export function CreateDraftModal({
  isOpen,
  onClose,
  onSuccess,
  products,
  editingDraft,
}: CreateDraftModalProps) {
  const [activeMode, setActiveMode] = useState<'AI' | 'MANUAL'>('AI');

  const [title, setTitle] = useState('');
  const [productId, setProductId] = useState<string>('');
  const [hookAngle, setHookAngle] = useState('');
  const [status, setStatus] = useState<DraftStatus>('PENDING_REVIEW');
  const [posts, setPosts] = useState<{ content: string; mediaUrl: string }[]>([
    { content: '', mediaUrl: '' },
  ]);

  // AI Generator Panel States
  const [selectedAngle, setSelectedAngle] = useState('contrarian');
  const [customTopic, setCustomTopic] = useState('');
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setActiveMode('MANUAL');
    } else {
      setTitle('');
      setProductId('');
      setHookAngle('');
      setStatus('PENDING_REVIEW');
      setPosts([{ content: '', mediaUrl: '' }]);
      setActiveMode('AI');
    }
    setError(null);
    setAiSuccessMessage(null);
  }, [editingDraft, isOpen]);

  const handleGenerateWithHermes = async () => {
    try {
      setGeneratingAi(true);
      setError(null);
      setAiSuccessMessage(null);

      const payload = {
        productId: productId || null,
        angle: selectedAngle,
        customTopic: customTopic.trim() || undefined,
      };

      const res = await fetch('/api/drafts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Hermes AI gagal meracik draf');
      }

      const generated = data.data;
      if (generated) {
        setTitle(generated.title || '');
        setHookAngle(generated.hookAngle || '');
        if (generated.productId) setProductId(generated.productId);
        if (Array.isArray(generated.posts) && generated.posts.length > 0) {
          setPosts(
            generated.posts.map((p: any) => ({
              content: p.content || '',
              mediaUrl: p.mediaUrl || '',
            }))
          );
        }
        setAiSuccessMessage('Hermes AI berhasil meracik draft copywriting baru!');
        // Automatically switch to Manual mode so user can review and polish the generated posts
        setActiveMode('MANUAL');
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal generate konten dengan AI');
    } finally {
      setGeneratingAi(false);
    }
  };

  const handlePostChange = (index: number, field: 'content' | 'mediaUrl', value: string) => {
    const next = [...posts];
    next[index][field] = value;
    setPosts(next);
  };

  const handleAddPost = () => {
    setPosts([...posts, { content: '', mediaUrl: '' }]);
  };

  const handleRemovePost = (index: number) => {
    if (posts.length <= 1) return;
    setPosts(posts.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Judul draft wajib diisi');
      return;
    }

    const validPosts = posts.filter((p) => p.content.trim().length > 0);
    if (validPosts.length === 0) {
      setError('Minimal ada 1 bagian postingan dengan konten');
      return;
    }

    for (let i = 0; i < validPosts.length; i++) {
      if (validPosts[i].content.length > 500) {
        setError(`Post #${i + 1} melebihi limit 500 karakter Threads (${validPosts[i].content.length}/500)`);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      const payload: CreateDraftInput = {
        title: title.trim(),
        productId: productId || null,
        hookAngle: hookAngle.trim() || null,
        type: validPosts.length > 1 ? 'THREAD_CHAIN' : 'SINGLE',
        source: editingDraft ? editingDraft.source as any : 'MANUAL',
        posts: validPosts.map((p, idx) => ({
          orderIndex: idx,
          content: p.content.trim(),
          mediaUrl: p.mediaUrl.trim() || null,
        })),
      };

      const url = editingDraft ? `/api/drafts/${editingDraft.id}` : '/api/drafts';
      const method = editingDraft ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyimpan draft');
      }

      onSuccess(data.data);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan saat menyimpan draft');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose} maxWidth="2xl">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-surface-border px-6 py-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-lime text-ink text-sm font-black shadow-xs">
              ⚡
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-ink tracking-tight">
                {editingDraft ? 'Edit Draft Konten' : 'Buat Draft Threads Baru'}
              </h2>
              <p className="text-xs text-ink-secondary">
                Racik postingan berkonversi dengan AI atau susun rangkaian post manual.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface hover:bg-surface-hover text-ink-secondary hover:text-ink transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode Pill Switcher */}
        {!editingDraft && (
          <div className="flex items-center rounded-full bg-surface p-1 border border-surface-border">
            <button
              type="button"
              onClick={() => setActiveMode('AI')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-1.5 rounded-full text-xs font-bold transition-all tap-effect',
                activeMode === 'AI'
                  ? 'bg-ink text-white shadow-pill'
                  : 'text-ink-secondary hover:text-ink'
              )}
            >
              <Sparkles className="h-3.5 w-3.5 text-lime" />
              <span>Hermes AI Generator</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('MANUAL')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-1.5 rounded-full text-xs font-bold transition-all tap-effect',
                activeMode === 'MANUAL'
                  ? 'bg-ink text-white shadow-pill'
                  : 'text-ink-secondary hover:text-ink'
              )}
            >
              <PenTool className="h-3.5 w-3.5" />
              <span>Editor Manual {posts[0]?.content && `(${posts.length} Post)`}</span>
            </button>
          </div>
        )}
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
        {error && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 animate-fadeIn">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {aiSuccessMessage && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 animate-fadeIn">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="font-semibold">{aiSuccessMessage}</span>
          </div>
        )}

        {/* MODE 1: Hermes AI Generator */}
        {activeMode === 'AI' && !editingDraft && (
          <div className="space-y-5">
            {/* Angle Selection Grid */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-ink uppercase tracking-wider">
                Pilih Sudut Pandang / Copywriting Angle
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {AI_ANGLES.map((angle) => (
                  <button
                    key={angle.id}
                    type="button"
                    onClick={() => setSelectedAngle(angle.id)}
                    className={cn(
                      'rounded-2xl p-3.5 text-left transition-all border tap-effect space-y-1',
                      selectedAngle === angle.id
                        ? 'bg-surface border-ink shadow-xs ring-1 ring-black'
                        : 'bg-surface/50 border-surface-border hover:bg-surface'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="block text-xs font-bold text-ink">{angle.label}</span>
                      {selectedAngle === angle.id && (
                        <Check className="h-3.5 w-3.5 text-ink stroke-[2.5]" />
                      )}
                    </div>
                    <span className="block text-[11px] text-ink-secondary leading-tight">
                      {angle.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Product & Custom Topic */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">
                  Pilih Produk Terkait (Opsional)
                </label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full rounded-full bg-surface border border-surface-border px-4 py-2 text-xs text-ink font-medium focus:border-ink focus:bg-white focus:outline-none shadow-xs cursor-pointer"
                >
                  <option value="">-- Konten Organik (Non-Produk) --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">
                  Topik Khusus / Prompt (Opsional)
                </label>
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="e.g. Tips nugas santai, Canva vs Photoshop..."
                  className="w-full rounded-full bg-surface border border-surface-border px-4 py-2 text-xs text-ink placeholder-ink-muted focus:border-ink focus:bg-white focus:outline-none shadow-xs"
                />
              </div>
            </div>

            {/* Generate Action Card */}
            <div className="rounded-2xl border border-surface-border bg-ink p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-dock">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-lime" />
                  Hermes Autonomous Engine
                </h4>
                <p className="text-[11px] text-zinc-400">
                  Meracik otomatis Hook, Value USP, dan CTA sesuai standar humanizer Threads.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGenerateWithHermes}
                disabled={generatingAi}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-lime hover:bg-lime-hover text-ink text-xs font-bold shadow-pill transition-all tap-effect shrink-0 disabled:opacity-50"
              >
                {generatingAi ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5" />
                )}
                <span>
                  {generatingAi ? 'Meracik Draft...' : 'Racik Draft dengan Hermes AI'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* MODE 2: Manual Post & Chain Editor */}
        {(activeMode === 'MANUAL' || editingDraft) && (
          <form id="draft-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Metadata Card */}
            <div className="rounded-2xl bg-surface p-5 border border-surface-border space-y-4 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-secondary flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Informasi Draft
              </h3>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Judul Internal Draft <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Misal: 5 Alasan Kenapa Harus Pakai Canva Pro..."
                  className="w-full rounded-full bg-white border border-surface-border px-4 py-2 text-xs sm:text-sm text-ink placeholder-ink-muted focus:border-ink focus:outline-none shadow-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Produk Terkait
                  </label>
                  <select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="w-full rounded-full bg-white border border-surface-border px-4 py-2 text-xs text-ink font-medium focus:border-ink focus:outline-none shadow-xs cursor-pointer"
                  >
                    <option value="">-- Organik / Tanpa Produk --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Hook Angle
                  </label>
                  <input
                    type="text"
                    value={hookAngle}
                    onChange={(e) => setHookAngle(e.target.value)}
                    placeholder="e.g. Price Comparison, Unpopular Opinion..."
                    className="w-full rounded-full bg-white border border-surface-border px-4 py-2 text-xs text-ink placeholder-ink-muted focus:border-ink focus:outline-none shadow-xs"
                  />
                </div>
              </div>
            </div>

            {/* Posts Chain Section */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-secondary flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  Rangkaian Postingan Thread ({posts.length} Bagian)
                </h3>
                <button
                  type="button"
                  onClick={handleAddPost}
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-surface hover:bg-surface-hover text-ink text-xs font-bold border border-surface-border shadow-xs tap-effect"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>Tambah Post Lanjutan</span>
                </button>
              </div>

              <div className="space-y-3">
                {posts.map((post, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl bg-surface p-4 border border-surface-border space-y-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ink bg-white px-3 py-0.5 rounded-full border border-surface-border shadow-xs">
                        {idx === 0 ? 'Post #01 (Hook Utama)' : `Post #${String(idx + 1).padStart(2, '0')}`}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'text-[11px] font-mono font-bold',
                            post.content.length > 500 ? 'text-rose-600' : 'text-ink-muted'
                          )}
                        >
                          {post.content.length} / 500
                        </span>
                        {posts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePost(idx)}
                            className="p-1 text-zinc-400 hover:text-rose-600 rounded-full transition-colors"
                            title="Hapus Bagian Ini"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <textarea
                      value={post.content}
                      onChange={(e) => handlePostChange(idx, 'content', e.target.value)}
                      rows={3}
                      placeholder={
                        idx === 0
                          ? 'Tulis kalimat hook pembuka yang menarik audiens di Threads...'
                          : `Tulis kelanjutan poin thread bagian #${idx + 1}...`
                      }
                      className="w-full rounded-xl bg-white border border-surface-border p-3 text-xs text-ink placeholder-ink-muted focus:border-ink focus:outline-none leading-relaxed shadow-xs"
                    />

                    <div>
                      <input
                        type="url"
                        value={post.mediaUrl}
                        onChange={(e) => handlePostChange(idx, 'mediaUrl', e.target.value)}
                        placeholder="URL Media Lampiran (Opsional, e.g. https://...)"
                        className="w-full rounded-full bg-white border border-surface-border px-4 py-1.5 text-xs text-ink placeholder-ink-muted focus:border-ink focus:outline-none shadow-xs font-mono"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Sticky Footer */}
      <div className="sticky bottom-0 z-20 bg-white border-t border-surface-border px-6 py-4 flex items-center justify-between">
        <div className="text-xs text-ink-muted">
          {activeMode === 'AI' && !editingDraft ? (
            <span>Pilih angle dan klik racik draft AI</span>
          ) : (
            <span>{posts.length} bagian post siap disimpan</span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 rounded-full border border-surface-border text-xs font-semibold text-ink hover:bg-surface transition-colors"
          >
            Batal
          </button>

          {(activeMode === 'MANUAL' || editingDraft) && (
            <button
              type="submit"
              form="draft-form"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-ink hover:bg-zinc-800 text-white text-xs font-bold transition-all tap-effect shadow-pill disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
              <span>{loading ? 'Menyimpan...' : editingDraft ? 'Perbarui Draft' : 'Simpan Draft'}</span>
            </button>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
