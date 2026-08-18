'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  Layers,
  CheckCircle2,
  Tag,
  Users,
  MessageSquareQuote,
  Megaphone,
} from 'lucide-react';
import { Product, ProductVariant, CreateProductInput } from '@/types/product';
import { ModalPortal } from '@/components/ModalPortal';
import { cn } from '@/lib/utils';

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
        setName('');
        setCategory('AI & Productivity');
        setCustomCategory('');
        setDescription('');
        setTargetAudience('Content Creator, Mahasiswa, Freelancer');
        setToneOfVoice('Santai & Edukatif');
        setCtaTemplate('Klik link di bio atau DM untuk order langsung!');
        setIsActive(true);
        setVariants([{ name: '1 Bulan', price: 25000, duration: '30 hari' }]);
        setUspTags(['Garansi 30 Hari', 'Aktivasi Instan', 'Legal 100%']);
      }
      setErrors({});
    }
  }, [isOpen, initialData]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Nama produk wajib diisi';
    const finalCategory = category === 'Other' ? customCategory : category;
    if (!finalCategory.trim()) newErrors.category = 'Kategori produk wajib diisi';
    if (!description.trim()) newErrors.description = 'Deskripsi produk wajib diisi';
    if (variants.length === 0) newErrors.variants = 'Minimal ada 1 varian paket harga';

    for (let i = 0; i < variants.length; i++) {
      if (!variants[i].name.trim()) {
        newErrors[`variant_${i}_name`] = 'Nama varian wajib diisi';
      }
      if (variants[i].price <= 0 || isNaN(variants[i].price)) {
        newErrors[`variant_${i}_price`] = 'Harga harus lebih dari 0';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSaving(true);
      const finalCategory = category === 'Other' ? customCategory : category;

      const productPayload: CreateProductInput = {
        name: name.trim(),
        category: finalCategory.trim(),
        description: description.trim(),
        variants: variants.map((v) => ({
          name: v.name.trim(),
          price: Number(v.price),
          duration: v.duration?.trim() || undefined,
        })),
        usp: uspTags,
        targetAudience: targetAudience.trim() || undefined,
        toneOfVoice: toneOfVoice.trim() || undefined,
        ctaTemplate: ctaTemplate.trim() || undefined,
        isActive,
      };

      await onSave(productPayload, initialData?.id);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddVariant = () => {
    setVariants([...variants, { name: '', price: 0, duration: '' }]);
  };

  const handleRemoveVariant = (index: number) => {
    if (variants.length <= 1) return;
    setVariants(variants.filter((_, idx) => idx !== index));
  };

  const handleVariantChange = (
    index: number,
    field: keyof ProductVariant,
    value: any
  ) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const handleAddUsp = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || uspTags.includes(trimmed)) return;
    setUspTags([...uspTags, trimmed]);
    setUspInput('');
  };

  const handleRemoveUsp = (tag: string) => {
    setUspTags(uspTags.filter((t) => t !== tag));
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose} maxWidth="2xl">
      {/* Sticky Header with 90s Retro Sand Frame Bar */}
      <div className="sticky top-0 z-20 bg-[#D8C49D] border-b-2 border-[#181816] px-6 py-4 flex items-center justify-between shadow-[0_2px_0px_0px_#181816]">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-retro-xs bg-[#FAF6EE] text-[#181816] border-2 border-[#181816] font-black shadow-[2px_2px_0px_0px_#181816]">
            <Tag className="h-4 w-4 stroke-[2.5]" />
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#181816] tracking-tight uppercase">
              {initialData ? 'Edit Katalog Produk' : 'Tambah Produk Baru'}
            </h2>
            <p className="text-xs text-[#4A463F] font-semibold">
              Basis pengetahuan Hermes AI untuk copywriting otomatis.
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

      {/* Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#FAF6EE]">
        <form id="product-form" onSubmit={handleSubmit} className="space-y-5">
          {/* Section 1: Basic Info Bento */}
          <div className="rounded-retro-sm bg-white p-5 border-2 border-[#181816] space-y-4 shadow-[3px_3px_0px_0px_#181816]">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#181816] flex items-center gap-1.5 border-b-2 border-[#181816] pb-2">
              <Tag className="h-3.5 w-3.5" />
              1. Informasi Dasar Produk
            </h3>

            <div>
              <label className="block text-xs font-black text-[#181816] mb-1 uppercase tracking-wider">
                Nama Produk <span className="text-[#C95D53]">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Canva Pro Edu / Private Account"
                className="w-full rounded-retro-xs bg-[#FAF6EE] border-2 border-[#181816] px-4 py-2.5 text-xs sm:text-sm text-[#181816] placeholder-zinc-400 font-bold shadow-[2px_2px_0px_0px_#181816] focus:outline-none focus:bg-white"
              />
              {errors.name && <p className="text-[11px] text-[#C95D53] font-black mt-1">{errors.name}</p>}
            </div>

            {/* Category Presets */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-[#181816] uppercase tracking-wider">
                Kategori <span className="text-[#C95D53]">*</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_PRESETS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={cn(
                      'rounded-retro-xs px-3 py-1 text-xs font-black border-2 border-[#181816] transition-all tap-effect uppercase tracking-wider',
                      category === cat
                        ? 'bg-[#6B9AC4] text-white shadow-[2px_2px_0px_0px_#181816]'
                        : 'bg-[#FAF6EE] text-[#181816] hover:bg-white shadow-[1.5px_1.5px_0px_0px_#181816]'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              {category === 'Other' && (
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Ketik nama kategori kustom..."
                  className="w-full rounded-retro-xs bg-[#FAF6EE] border-2 border-[#181816] px-4 py-2 text-xs text-[#181816] font-bold mt-2 shadow-[2px_2px_0px_0px_#181816] focus:outline-none"
                />
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-black text-[#181816] mb-1 uppercase tracking-wider">
                Deskripsi Singkat <span className="text-[#C95D53]">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Jelaskan apa itu produk ini, apa keuntungannya bagi pembeli..."
                className="w-full rounded-retro-xs bg-[#FAF6EE] border-2 border-[#181816] p-3 text-xs text-[#181816] font-medium leading-relaxed shadow-[2px_2px_0px_0px_#181816] focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          {/* Section 2: Pricing Variants Bento */}
          <div className="rounded-retro-sm bg-white p-5 border-2 border-[#181816] space-y-4 shadow-[3px_3px_0px_0px_#181816]">
            <div className="flex items-center justify-between border-b-2 border-[#181816] pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#181816] flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                2. Varian Paket & Harga Resmi
              </h3>
              <button
                type="button"
                onClick={handleAddVariant}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-retro-xs bg-[#D8C49D] hover:bg-[#E2D2B0] text-[#181816] text-xs font-black border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all uppercase tracking-wider"
              >
                <Plus className="h-3 w-3 stroke-[3]" />
                <span>+ Tambah Varian</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {variants.map((v, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-[#FAF6EE] p-3 rounded-retro-xs border-2 border-[#181816] items-center shadow-[2px_2px_0px_0px_#181816]"
                >
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      value={v.name}
                      onChange={(e) => handleVariantChange(idx, 'name', e.target.value)}
                      placeholder="Nama Paket (e.g. 1 Bulan Sharing)"
                      className="w-full rounded-retro-xs bg-white border-2 border-[#181816] px-3 py-1.5 text-xs text-[#181816] font-bold focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <input
                      type="number"
                      value={v.price || ''}
                      onChange={(e) =>
                        handleVariantChange(idx, 'price', parseFloat(e.target.value) || 0)
                      }
                      placeholder="Harga Rp (e.g. 25000)"
                      className="w-full rounded-retro-xs bg-white border-2 border-[#181816] px-3 py-1.5 text-xs text-[#181816] font-black focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={v.duration || ''}
                      onChange={(e) => handleVariantChange(idx, 'duration', e.target.value)}
                      placeholder="Durasi (30 hari)"
                      className="w-full rounded-retro-xs bg-white border-2 border-[#181816] px-3 py-1.5 text-xs text-[#4A463F] font-bold focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-center">
                    {variants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(idx)}
                        className="p-1.5 text-zinc-400 hover:text-[#C95D53] hover:bg-rose-100 rounded-retro-xs transition-colors"
                      >
                        <Trash2 className="h-4 w-4 stroke-[2.5]" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: AI Copywriting Parameters Bento */}
          <div className="rounded-retro-sm bg-white p-5 border-2 border-[#181816] space-y-4 shadow-[3px_3px_0px_0px_#181816]">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#181816] flex items-center gap-1.5 border-b-2 border-[#181816] pb-2">
              <Sparkles className="h-3.5 w-3.5 text-[#C95D53]" />
              3. Parameter Copywriting Hermes AI
            </h3>

            {/* USPs */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-[#181816] uppercase tracking-wider">
                Keunggulan Utama / USPs
              </label>
              <div className="flex flex-wrap gap-1.5">
                {USP_PRESETS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      uspTags.includes(tag) ? handleRemoveUsp(tag) : handleAddUsp(tag)
                    }
                    className={cn(
                      'rounded-retro-xs px-2.5 py-1 text-[11px] font-bold border-2 border-[#181816] transition-all tap-effect',
                      uspTags.includes(tag)
                        ? 'bg-[#6B9AC4] text-white shadow-[1.5px_1.5px_0px_0px_#181816]'
                        : 'bg-[#FAF6EE] text-[#181816] hover:bg-white shadow-[1px_1px_0px_0px_#181816]'
                    )}
                  >
                    {uspTags.includes(tag) ? `★ ${tag}` : `+ ${tag}`}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={uspInput}
                  onChange={(e) => setUspInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddUsp(uspInput);
                    }
                  }}
                  placeholder="Ketik USP custom lalu tekan Enter..."
                  className="flex-1 rounded-retro-xs bg-[#FAF6EE] border-2 border-[#181816] px-4 py-2 text-xs text-[#181816] font-bold shadow-[2px_2px_0px_0px_#181816] focus:outline-none focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => handleAddUsp(uspInput)}
                  className="px-4 py-2 rounded-retro-xs bg-[#D8C49D] hover:bg-[#E2D2B0] text-[#181816] text-xs font-black border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all uppercase tracking-wider"
                >
                  Tambah
                </button>
              </div>
            </div>

            {/* Target Audience & Tone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-[#181816] mb-1 flex items-center gap-1 uppercase tracking-wider">
                  <Users className="h-3 w-3" /> Target Audiens
                </label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g. Mahasiswa, Content Creator..."
                  className="w-full rounded-retro-xs bg-[#FAF6EE] border-2 border-[#181816] px-3.5 py-2 text-xs text-[#181816] font-bold shadow-[2px_2px_0px_0px_#181816] focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#181816] mb-1 flex items-center gap-1 uppercase tracking-wider">
                  <MessageSquareQuote className="h-3 w-3" /> Gaya Bahasa (Tone)
                </label>
                <select
                  value={toneOfVoice}
                  onChange={(e) => setToneOfVoice(e.target.value)}
                  className="w-full rounded-retro-xs bg-[#FAF6EE] border-2 border-[#181816] px-3.5 py-2 text-xs text-[#181816] font-bold shadow-[2px_2px_0px_0px_#181816] focus:outline-none cursor-pointer"
                >
                  {TONE_PRESETS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* CTA Template */}
            <div>
              <label className="block text-xs font-black text-[#181816] mb-1 flex items-center gap-1 uppercase tracking-wider">
                <Megaphone className="h-3 w-3" /> Ajakan Bertindak (CTA)
              </label>
              <input
                type="text"
                value={ctaTemplate}
                onChange={(e) => setCtaTemplate(e.target.value)}
                placeholder="e.g. DM admin sekarang selagi slot promo masih ready!"
                className="w-full rounded-retro-xs bg-[#FAF6EE] border-2 border-[#181816] px-3.5 py-2 text-xs text-[#181816] font-bold shadow-[2px_2px_0px_0px_#181816] focus:outline-none focus:bg-white"
              />
            </div>
          </div>
        </form>
      </div>

      {/* Sticky Footer */}
      <div className="sticky bottom-0 z-20 bg-white border-t-2 border-[#181816] px-6 py-4 flex items-center justify-end gap-3 shadow-[0_-2px_0px_0px_#181816]">
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="px-5 py-2.5 rounded-retro-xs border-2 border-[#181816] text-xs font-bold text-[#181816] hover:bg-[#FAF6EE] shadow-[2px_2px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all uppercase tracking-wider"
        >
          Batal
        </button>

        <button
          type="submit"
          form="product-form"
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-retro-xs bg-[#C95D53] hover:bg-[#D45D52] text-white text-xs font-black border-2 border-[#181816] shadow-[3px_3px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-50 uppercase tracking-wider"
        >
          <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
          <span>{isSaving ? 'Menyimpan...' : initialData ? 'Perbarui Produk' : 'Simpan Produk'}</span>
        </button>
      </div>
    </ModalPortal>
  );
}
