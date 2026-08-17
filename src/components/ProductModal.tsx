'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Product, ProductVariant, CreateProductInput } from '@/types/product';
import { cn } from '@/lib/utils';
import { formatIDR } from './ProductCard';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: CreateProductInput, id?: string) => Promise<void>;
  initialData?: Product | null;
}

const CATEGORY_PRESETS = [
  'Streaming Video',
  'Music',
  'AI & Productivity',
  'Design & Tools',
  'Education',
  'VPN & Security',
  'Software License',
  'Other',
];

const TONE_PRESETS = [
  'Santai & Edukatif',
  'Storytelling & Relate',
  'FOMO & Hard Selling',
  'Profesional & B2B',
  'Humoris & Satir',
  'Tech Enthusiast',
];

const USP_PRESETS = [
  'Garansi 30 Hari',
  'Aktivasi Instan',
  'Private Account',
  'Anti On-Hold',
  'Legal 100%',
  'No VPN Needed',
  'Support 24/7',
];

export function ProductModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: ProductModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [toneOfVoice, setToneOfVoice] = useState('');
  const [ctaTemplate, setCtaTemplate] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Dynamic Variants state
  const [variants, setVariants] = useState<ProductVariant[]>([
    { name: '1 Bulan', price: 25000, duration: '30 hari' },
  ]);

  // Dynamic USP tags state
  const [uspTags, setUspTags] = useState<string[]>([]);
  const [uspInput, setUspInput] = useState('');

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset or fill form on open / initialData change
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        if (CATEGORY_PRESETS.includes(initialData.category)) {
          setCategory(initialData.category);
          setCustomCategory('');
        } else {
          setCategory('Other');
          setCustomCategory(initialData.category || '');
        }
        setDescription(initialData.description || '');
        setTargetAudience(initialData.targetAudience || '');
        setToneOfVoice(initialData.toneOfVoice || '');
        setCtaTemplate(initialData.ctaTemplate || '');
        setIsActive(initialData.isActive ?? true);
        setVariants(
          initialData.variants && initialData.variants.length > 0
            ? initialData.variants
            : [{ name: '1 Bulan', price: 25000, duration: '30 hari' }]
        );
        setUspTags(initialData.usp || []);
      } else {
        // Defaults for new product
        setName('');
        setCategory(CATEGORY_PRESETS[0]);
        setCustomCategory('');
        setDescription('');
        setTargetAudience('');
        setToneOfVoice('Santai & Edukatif');
        setCtaTemplate('Klik link di bio untuk order sekarang!');
        setIsActive(true);
        setVariants([{ name: '1 Bulan', price: 25000, duration: '30 hari' }]);
        setUspTags(['Full Garansi', 'Aktivasi Instan']);
      }
      setErrors({});
      setUspInput('');
    }
  }, [isOpen, initialData]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Variants management
  const addVariantRow = () => {
    setVariants([...variants, { name: '', price: 0, duration: '' }]);
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    const next = [...variants];
    next[index] = { ...next[index], [field]: value };
    setVariants(next);
  };

  const removeVariant = (index: number) => {
    if (variants.length <= 1) return;
    setVariants(variants.filter((_, i) => i !== index));
  };

  // USP Tags management
  const handleAddUsp = () => {
    const trimmed = uspInput.trim();
    if (!trimmed) return;
    if (!uspTags.includes(trimmed)) {
      setUspTags([...uspTags, trimmed]);
    }
    setUspInput('');
  };

  const handleAddPresetUsp = (tag: string) => {
    if (!uspTags.includes(tag)) {
      setUspTags([...uspTags, tag]);
    }
  };

  const removeUsp = (tagToRemove: string) => {
    setUspTags(uspTags.filter((t) => t !== tagToRemove));
  };

  // Submit & Validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Nama produk wajib diisi';
    }

    const finalCategory = category === 'Other' ? customCategory.trim() : category.trim();
    if (!finalCategory) {
      newErrors.category = 'Kategori produk wajib diisi';
    }

    // Clean variants
    const validVariants = variants
      .map((v) => ({
        name: v.name.trim(),
        price: Number(v.price) || 0,
        duration: v.duration?.trim() || undefined,
      }))
      .filter((v) => v.name.length > 0);

    if (validVariants.length === 0) {
      newErrors.variants = 'Minimal 1 varian produk dengan nama valid harus ada';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsSaving(true);
      const payload: CreateProductInput = {
        name: name.trim(),
        category: finalCategory,
        description: description.trim() || undefined,
        variants: validVariants,
        usp: uspTags,
        targetAudience: targetAudience.trim() || undefined,
        toneOfVoice: toneOfVoice.trim() || undefined,
        ctaTemplate: ctaTemplate.trim() || undefined,
        isActive,
      };

      await onSave(payload, initialData?.id);
      onClose();
    } catch (err: any) {
      setErrors({ general: err?.message || 'Gagal menyimpan produk' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl rounded-2xl border border-threads-border bg-threads-surface shadow-2xl overflow-hidden my-8 z-10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-threads-border bg-threads-card px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-threads-text">
              {initialData ? 'Edit Produk Digital' : 'Tambah Produk Baru'}
            </h2>
            <p className="text-xs text-threads-secondary">
              Definisikan detail produk dan context persona untuk copy generator AI.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-threads-secondary hover:bg-threads-surface hover:text-threads-text transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto p-6 space-y-6">
          {errors.general && (
            <div className="flex items-center gap-2 rounded-lg bg-red-950/60 p-3 border border-red-800 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{errors.general}</span>
            </div>
          )}

          {/* Section 1: Basic Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-threads-accent flex items-center gap-1.5">
              <span>Informasi Utama</span>
            </h3>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Nama Produk <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Netflix Premium 4K UHD Ultra"
                className={cn(
                  'w-full rounded-lg border bg-threads-card px-3.5 py-2.5 text-sm text-threads-text placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-threads-accent',
                  errors.name ? 'border-red-500' : 'border-threads-border'
                )}
              />
              {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Kategori <span className="text-red-400">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-threads-border bg-threads-card px-3.5 py-2.5 text-sm text-threads-text focus:outline-none focus:ring-1 focus:ring-threads-accent"
                >
                  {CATEGORY_PRESETS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                {category === 'Other' && (
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Ketik nama kategori..."
                    className="mt-2 w-full rounded-lg border border-threads-border bg-threads-card px-3 py-2 text-xs text-threads-text placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-threads-accent"
                  />
                )}
                {errors.category && <p className="mt-1 text-xs text-red-400">{errors.category}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Status Produk
                </label>
                <div
                  onClick={() => setIsActive(!isActive)}
                  className="flex h-[42px] items-center justify-between rounded-lg border border-threads-border bg-threads-card px-3.5 cursor-pointer transition-all hover:border-zinc-700 select-none"
                >
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors',
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700/60'
                    )}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        isActive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                      )}
                    />
                    {isActive ? 'Aktif (Digunakan AI)' : 'Non-aktif'}
                  </span>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={isActive}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsActive(!isActive);
                    }}
                    className={cn(
                      'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-threads-accent focus:ring-offset-2 focus:ring-offset-threads-surface border',
                      isActive
                        ? 'bg-emerald-500 border-emerald-400/50 shadow-sm'
                        : 'bg-zinc-800 border-zinc-700'
                    )}
                  >
                    <span
                      className={cn(
                        'pointer-events-none inline-block h-4.5 w-4.5 rounded-full bg-white shadow transform transition duration-200 ease-in-out',
                        isActive ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Deskripsi Singkat Produk
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Deskripsi keunggulan, spesifikasi akun, atau ketentuan langganan..."
                className="w-full rounded-lg border border-threads-border bg-threads-card px-3.5 py-2.5 text-sm text-threads-text placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-threads-accent"
              />
            </div>
          </div>

          {/* Section 2: Dynamic Variants & Pricing */}
          <div className="space-y-3 pt-2 border-t border-threads-border">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-threads-accent flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                <span>Varian & Penetapan Harga</span>
              </h3>
              <button
                type="button"
                onClick={addVariantRow}
                className="inline-flex items-center gap-1 text-xs font-medium text-threads-accent hover:text-sky-400 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tambah Varian</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {variants.map((v, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-xl bg-threads-card p-2.5 border border-threads-border"
                >
                  <div className="flex-1">
                    <input
                      type="text"
                      value={v.name}
                      onChange={(e) => updateVariant(idx, 'name', e.target.value)}
                      placeholder="Nama Varian (misal: 1 Bulan)"
                      className="w-full rounded-lg border border-zinc-700/80 bg-zinc-900 px-3 py-1.5 text-xs text-threads-text placeholder-zinc-500 focus:outline-none focus:border-threads-accent"
                    />
                  </div>
                  <div className="w-32">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-[11px] text-zinc-500">Rp</span>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={v.price || ''}
                        onChange={(e) => updateVariant(idx, 'price', Number(e.target.value))}
                        placeholder="Harga"
                        className="w-full rounded-lg border border-zinc-700/80 bg-zinc-900 pl-7 pr-2 py-1.5 text-xs text-threads-text placeholder-zinc-500 focus:outline-none focus:border-threads-accent"
                      />
                    </div>
                  </div>
                  <div className="w-28">
                    <input
                      type="text"
                      value={v.duration || ''}
                      onChange={(e) => updateVariant(idx, 'duration', e.target.value)}
                      placeholder="Durasi (30 hari)"
                      className="w-full rounded-lg border border-zinc-700/80 bg-zinc-900 px-2.5 py-1.5 text-xs text-threads-text placeholder-zinc-500 focus:outline-none focus:border-threads-accent"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeVariant(idx)}
                    disabled={variants.length <= 1}
                    className="p-1.5 text-zinc-500 hover:text-red-400 disabled:opacity-30 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            {errors.variants && <p className="text-xs text-red-400">{errors.variants}</p>}
          </div>

          {/* Section 3: Dynamic USP Tags */}
          <div className="space-y-3 pt-2 border-t border-threads-border">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Unique Selling Points (USP / Fitur Kunci)</span>
            </h3>

            {/* Added Tag Pills */}
            <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded-xl bg-threads-card border border-threads-border">
              {uspTags.length === 0 ? (
                <span className="text-xs text-zinc-500 italic">Belum ada USP ditambahkan.</span>
              ) : (
                uspTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2.5 py-1 text-xs text-zinc-200 border border-zinc-700"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => removeUsp(tag)}
                      className="text-zinc-400 hover:text-red-400 transition-colors ml-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Input & Quick Presets */}
            <div className="flex gap-2">
              <input
                type="text"
                value={uspInput}
                onChange={(e) => setUspInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddUsp();
                  }
                }}
                placeholder="Ketik USP lalu tekan Enter..."
                className="flex-1 rounded-lg border border-threads-border bg-threads-card px-3 py-2 text-xs text-threads-text placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-threads-accent"
              />
              <button
                type="button"
                onClick={handleAddUsp}
                className="rounded-lg bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition-colors border border-zinc-700"
              >
                Tambah
              </button>
            </div>

            {/* Quick preset chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-zinc-500">Saran cepat:</span>
              {USP_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleAddPresetUsp(preset)}
                  className="rounded bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Section 4: AI Context Persona (Audience, Tone, CTA) */}
          <div className="space-y-4 pt-2 border-t border-threads-border">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-threads-accent flex items-center gap-1.5">
              <span>Persona & Copy Context untuk AI</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Target Audience
                </label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="Misal: Mahasiswa, Freelancer, Movie Buffs"
                  className="w-full rounded-lg border border-threads-border bg-threads-card px-3.5 py-2 text-xs text-threads-text placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-threads-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Tone of Voice
                </label>
                <input
                  type="text"
                  value={toneOfVoice}
                  onChange={(e) => setToneOfVoice(e.target.value)}
                  placeholder="Misal: Santai, Edukatif, Storytelling"
                  list="tone-options"
                  className="w-full rounded-lg border border-threads-border bg-threads-card px-3.5 py-2 text-xs text-threads-text placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-threads-accent"
                />
                <datalist id="tone-options">
                  {TONE_PRESETS.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Template Call to Action (CTA)
              </label>
              <input
                type="text"
                value={ctaTemplate}
                onChange={(e) => setCtaTemplate(e.target.value)}
                placeholder="Misal: Klik link di bio untuk amankan slot kamu sebelum kehabisan!"
                className="w-full rounded-lg border border-threads-border bg-threads-card px-3.5 py-2 text-xs text-threads-text placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-threads-accent"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-threads-border">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:bg-threads-card hover:text-zinc-200 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-threads-accent px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-threads-accent/20 hover:bg-sky-500 disabled:opacity-50 transition-all"
            >
              {isSaving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{initialData ? 'Simpan Perubahan' : 'Buat Produk'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
