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
      {/* Sticky Header with 90s Sand Top Frame */}
      <div className="sticky top-0 z-20 bg-[#D8C49D] border-b-2 border-[#181816] px-6 py-4 space-y-3 shadow-[0_2px_0px_0px_#181816]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-retro-xs bg-[#FAF6EE] text-[#181816] border-2 border-[#181816] font-black shadow-[2px_2px_0px_0px_#181816]">
              ⚡
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#181816] tracking-tight uppercase">
                {editingDraft ? 'Edit Draft Konten' : 'Buat Draft Threads Baru'}
              </h2>
              <p className="text-xs text-[#4A463F] font-semibold">
                Racik postingan berkonversi dengan AI atau susun rangkaian post manual.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-retro-xs bg-white hover:bg-[#C95D53] hover:text-white text-[#181816] border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
          >
            <X className="h-4 w-4 stroke-[3]" />
          </button>
        </div>

        {/* Mode Pill Switcher */}
        {!editingDraft && (
          <div className="flex items-center rounded-retro-xs bg-white p-1 border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816]">
            <button
              type="button"
              onClick={() => setActiveMode('AI')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-1.5 rounded-none text-xs font-black transition-all tap-effect uppercase tracking-wider',
                activeMode === 'AI'
                  ? 'bg-[#6B9AC4] text-white shadow-[1.5px_1.5px_0px_0px_#181816]'
                  : 'text-[#181816] hover:bg-[#FAF6EE]'
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Hermes AI Generator</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('MANUAL')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-1.5 rounded-none text-xs font-black transition-all tap-effect uppercase tracking-wider',
                activeMode === 'MANUAL'
                  ? 'bg-[#6B9AC4] text-white shadow-[1.5px_1.5px_0px_0px_#181816]'
                  : 'text-[#181816] hover:bg-[#FAF6EE]'
              )}
            >
              <PenTool className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Editor Manual {posts[0]?.content && `(${posts.length} Post)`}</span>
            </button>
          </div>
        )}
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#FAF6EE]">
        {error && (
          <div className="flex items-center gap-2.5 rounded-retro-xs border-2 border-[#181816] bg-rose-100 p-4 text-xs text-[#181816] font-black shadow-[2px_2px_0px_0px_#181816] animate-fadeIn">
            <AlertCircle className="h-4 w-4 shrink-0 text-[#C95D53] stroke-[2.5]" />
            <span>{error}</span>
          </div>
        )}

        {aiSuccessMessage && (
          <div className="flex items-center gap-2.5 rounded-retro-xs border-2 border-[#181816] bg-[#D8C49D] p-4 text-xs text-[#181816] font-black shadow-[2px_2px_0px_0px_#181816] animate-fadeIn">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#181816] stroke-[3]" />
            <span>{aiSuccessMessage}</span>
          </div>
        )}

        {/* MODE 1: Hermes AI Generator */}
        {activeMode === 'AI' && !editingDraft && (
          <div className="space-y-5">
            {/* Angle Selection Grid */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-[#181816] uppercase tracking-wider">
                Pilih Sudut Pandang / Copywriting Angle
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {AI_ANGLES.map((angle) => (
                  <button
                    key={angle.id}
                    type="button"
                    onClick={() => setSelectedAngle(angle.id)}
                    className={cn(
                      'rounded-retro-xs p-3.5 text-left transition-all border-2 border-[#181816] tap-effect space-y-1',
                      selectedAngle === angle.id
                        ? 'bg-[#6B9AC4] text-white shadow-[3px_3px_0px_0px_#181816]'
                        : 'bg-white hover:bg-[#FAF6EE] text-[#181816] shadow-[1.5px_1.5px_0px_0px_#181816]'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="block text-xs font-black">{angle.label}</span>
                      {selectedAngle === angle.id && (
                        <Check className="h-3.5 w-3.5 text-white stroke-[3]" />
                      )}
                    </div>
                    <span className={cn('block text-[11px] font-medium leading-tight', selectedAngle === angle.id ? 'text-white/90' : 'text-[#4A463F]')}>
                      {angle.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Product & Custom Topic */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-[#181816] mb-1.5 uppercase tracking-wider">
                  Pilih Produk Terkait (Opsional)
                </label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full rounded-retro-xs bg-white border-2 border-[#181816] px-4 py-2 text-xs text-[#181816] font-bold focus:outline-none shadow-[2px_2px_0px_0px_#181816] cursor-pointer"
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
                <label className="block text-xs font-black text-[#181816] mb-1.5 uppercase tracking-wider">
                  Topik Khusus / Prompt (Opsional)
                </label>
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="e.g. Tips nugas santai, Canva vs Photoshop..."
                  className="w-full rounded-retro-xs bg-white border-2 border-[#181816] px-4 py-2 text-xs text-[#181816] font-bold focus:outline-none shadow-[2px_2px_0px_0px_#181816]"
                />
              </div>
            </div>

            {/* Generate Action Card */}
            <div className="rounded-retro-xs border-2 border-[#181816] bg-[#FAF6EE] p-5 text-[#181816] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[4px_4px_0px_0px_#181816]">
              <div className="space-y-0.5">
                <h4 className="text-xs font-black text-[#181816] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#C95D53]" />
                  Hermes Autonomous Engine
                </h4>
                <p className="text-[11px] text-[#4A463F] font-semibold">
                  Meracik otomatis Hook, Value USP, dan CTA sesuai standar humanizer Threads.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGenerateWithHermes}
                disabled={generatingAi}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-retro-xs bg-[#C95D53] hover:bg-[#D45D52] text-white text-xs font-black border-2 border-[#181816] shadow-[3px_3px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all tap-effect shrink-0 disabled:opacity-50 uppercase tracking-wider"
              >
                {generatingAi ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin stroke-[2.5]" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5 stroke-[2.5]" />
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
            <div className="rounded-retro-sm bg-white p-5 border-2 border-[#181816] space-y-4 shadow-[3px_3px_0px_0px_#181816]">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#181816] flex items-center gap-1.5 border-b-2 border-[#181816] pb-2">
                <FileText className="h-3.5 w-3.5" />
                Informasi Draft
              </h3>

              <div>
                <label className="block text-xs font-black text-[#181816] mb-1 uppercase tracking-wider">
                  Judul Internal Draft <span className="text-[#C95D53]">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Misal: 5 Alasan Kenapa Harus Pakai Canva Pro..."
                  className="w-full rounded-retro-xs bg-[#FAF6EE] border-2 border-[#181816] px-4 py-2 text-xs sm:text-sm text-[#181816] font-bold shadow-[2px_2px_0px_0px_#181816] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-[#181816] mb-1 uppercase tracking-wider">
                    Produk Terkait
                  </label>
                  <select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="w-full rounded-retro-xs bg-[#FAF6EE] border-2 border-[#181816] px-4 py-2 text-xs text-[#181816] font-bold shadow-[2px_2px_0px_0px_#181816] focus:outline-none cursor-pointer"
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
                  <label className="block text-xs font-black text-[#181816] mb-1 uppercase tracking-wider">
                    Hook Angle
                  </label>
                  <input
                    type="text"
                    value={hookAngle}
                    onChange={(e) => setHookAngle(e.target.value)}
                    placeholder="e.g. Price Comparison, Unpopular Opinion..."
                    className="w-full rounded-retro-xs bg-[#FAF6EE] border-2 border-[#181816] px-4 py-2 text-xs text-[#181816] font-bold shadow-[2px_2px_0px_0px_#181816] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Posts Chain Section */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#181816] flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  Rangkaian Postingan Thread ({posts.length} Bagian)
                </h3>
                <button
                  type="button"
                  onClick={handleAddPost}
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-retro-xs bg-[#D8C49D] hover:bg-[#E2D2B0] text-[#181816] text-xs font-black border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all uppercase tracking-wider"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[3]" />
                  <span>+ Tambah Post</span>
                </button>
              </div>

              <div className="space-y-3">
                {posts.map((post, idx) => (
                  <div
                    key={idx}
                    className="rounded-retro-xs bg-white p-4 border-2 border-[#181816] space-y-3 shadow-[2.5px_2.5px_0px_0px_#181816]"
                  >
                    <div className="flex items-center justify-between border-b border-[#181816]/20 pb-2">
                      <span className="text-xs font-black text-white bg-[#6B9AC4] px-2.5 py-0.5 rounded-retro-xs border border-[#181816] shadow-[1px_1px_0px_0px_#181816] uppercase tracking-wider">
                        {idx === 0 ? 'Post #01 (Hook Utama)' : `Post #${String(idx + 1).padStart(2, '0')}`}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'text-[11px] font-mono font-black',
                            post.content.length > 500 ? 'text-[#C95D53]' : 'text-[#7A7468]'
                          )}
                        >
                          {post.content.length} / 500
                        </span>
                        {posts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePost(idx)}
                            className="p-1 text-zinc-400 hover:text-[#C95D53] hover:bg-rose-100 rounded-retro-xs transition-colors"
                            title="Hapus Bagian Ini"
                          >
                            <Trash2 className="h-3.5 w-3.5 stroke-[2.5]" />
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
                      className="w-full rounded-retro-xs bg-[#FAF6EE] border-2 border-[#181816] p-3 text-xs text-[#181816] font-medium leading-relaxed shadow-[1.5px_1.5px_0px_0px_#181816] focus:outline-none focus:bg-white"
                    />

                    <div>
                      <input
                        type="url"
                        value={post.mediaUrl}
                        onChange={(e) => handlePostChange(idx, 'mediaUrl', e.target.value)}
                        placeholder="URL Media Lampiran (Opsional, e.g. https://...)"
                        className="w-full rounded-retro-xs bg-[#FAF6EE] border-2 border-[#181816] px-3.5 py-1.5 text-xs text-[#181816] font-mono shadow-[1.5px_1.5px_0px_0px_#181816] focus:outline-none"
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
      <div className="sticky bottom-0 z-20 bg-white border-t-2 border-[#181816] px-6 py-4 flex items-center justify-between shadow-[0_-2px_0px_0px_#181816]">
        <div className="text-xs font-bold text-[#7A7468]">
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
            className="px-5 py-2.5 rounded-retro-xs border-2 border-[#181816] text-xs font-bold text-[#181816] hover:bg-[#FAF6EE] shadow-[2px_2px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all uppercase tracking-wider"
          >
            Batal
          </button>

          {(activeMode === 'MANUAL' || editingDraft) && (
            <button
              type="submit"
              form="draft-form"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-retro-xs bg-[#C95D53] hover:bg-[#D45D52] text-white text-xs font-black border-2 border-[#181816] shadow-[3px_3px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-50 uppercase tracking-wider"
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
