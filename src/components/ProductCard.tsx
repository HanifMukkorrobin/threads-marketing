'use client';

import React, { useState } from 'react';
import {
  Tag,
  Copy,
  Check,
  Edit3,
  Trash2,
  Layers,
  Sparkles,
  Users,
  MessageSquareQuote,
} from 'lucide-react';
import { Product } from '@/types/product';
import { ModalPortal } from '@/components/ModalPortal';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onToggleActive: (id: string, current: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ProductCard({
  product,
  onEdit,
  onToggleActive,
  onDelete,
  onToast,
}: ProductCardProps) {
  const [copied, setCopied] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleCopyContext = async () => {
    try {
      const aiContext = {
        name: product.name,
        category: product.category,
        description: product.description,
        variants: product.variants,
        usp: product.usp,
        targetAudience: product.targetAudience,
        toneOfVoice: product.toneOfVoice,
        ctaTemplate: product.ctaTemplate,
      };

      await navigator.clipboard.writeText(JSON.stringify(aiContext, null, 2));
      setCopied(true);
      onToast(`Context AI untuk "${product.name}" disalin ke clipboard!`, 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onToast('Gagal menyalin context ke clipboard', 'error');
    }
  };

  const handleToggle = async () => {
    try {
      setIsToggling(true);
      await onToggleActive(product.id, product.isActive);
      onToast(
        `Produk "${product.name}" ${!product.isActive ? 'diaktifkan' : 'dinonaktifkan'}`,
        'info'
      );
    } catch {
      onToast('Gagal mengubah status produk', 'error');
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onDelete(product.id);
      onToast(`Produk "${product.name}" berhasil dihapus`, 'success');
      setShowDeleteConfirm(false);
    } catch {
      onToast('Gagal menghapus produk', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className={cn(
        'group relative flex flex-col justify-between rounded-retro-sm border-[2.5px] border-[#181816] bg-[#FAF6EE] p-5 sm:p-6 transition-all duration-150',
        product.isActive
          ? 'shadow-[4px_4px_0px_0px_#181816] hover:shadow-[6px_6px_0px_0px_#181816] hover:translate-x-[-1px] hover:translate-y-[-1px]'
          : 'opacity-70 bg-[#E8DBC0]/40 shadow-[2px_2px_0px_0px_#181816]'
      )}
    >
      <div className="space-y-4">
        {/* Header: Category Stamp + Active Switch */}
        <div className="flex items-center justify-between gap-2 border-b-2 border-[#181816]/15 pb-3">
          <span className="inline-flex items-center gap-1.5 rounded-retro-xs bg-[#6B9AC4] px-2.5 py-1 text-xs font-black text-white border-2 border-[#181816] shadow-[1.5px_1.5px_0px_0px_#181816] uppercase tracking-wider">
            <Tag className="h-3 w-3 stroke-[2.5]" />
            <span>{product.category}</span>
          </span>

          <button
            type="button"
            onClick={handleToggle}
            disabled={isToggling}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-retro-xs px-2.5 py-1 text-[11px] font-black border-2 border-[#181816] transition-all tap-effect uppercase tracking-wider',
              product.isActive
                ? 'bg-[#D8C49D] text-[#181816] shadow-[1.5px_1.5px_0px_0px_#181816]'
                : 'bg-zinc-200 text-zinc-600 shadow-none'
            )}
            title="Klik untuk mengubah status aktif"
          >
            <span
              className={cn(
                'h-2 w-2 rounded-full border border-[#181816]',
                product.isActive ? 'bg-[#181816] animate-pulse' : 'bg-zinc-400'
              )}
            />
            <span>{product.isActive ? 'Aktif' : 'Non-Aktif'}</span>
          </button>
        </div>

        {/* Product Name & Description */}
        <div className="space-y-1">
          <h3 className="text-base font-black text-[#181816] tracking-tight uppercase line-clamp-1">
            {product.name}
          </h3>
          <p className="text-xs text-[#4A463F] leading-relaxed line-clamp-2 font-medium">
            {product.description || 'Katalog produk digital siap untuk promosi otomatis Threads.'}
          </p>
        </div>

        {/* Pricing Variants Stamp Box */}
        {product.variants && product.variants.length > 0 && (
          <div className="rounded-retro-xs bg-[#E8DBC0]/40 p-3 border-2 border-[#181816] space-y-2 shadow-[2px_2px_0px_0px_#181816]">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#181816] flex items-center gap-1 border-b border-[#181816]/20 pb-1">
              <Layers className="h-3.5 w-3.5 stroke-[2.5]" />
              Varian Paket & Harga
            </span>
            <div className="flex flex-wrap gap-1.5">
              {product.variants.map((v, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-1.5 rounded-retro-xs bg-white border-1.5 border-[#181816] px-2 py-0.5 text-xs text-[#181816] font-bold shadow-[1px_1px_0px_0px_#181816]"
                >
                  <span className="text-[#4A463F]">{v.name}:</span>
                  <span className="font-black text-[#181816]">{formatIDR(v.price)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* USPs Pill Tags */}
        {product.usp && product.usp.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#181816] flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-[#C95D53] stroke-[2.5]" />
              Keunggulan (USP)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {product.usp.map((item, idx) => (
                <span
                  key={idx}
                  className="rounded-retro-xs bg-white border-1.5 border-[#181816] px-2 py-0.5 text-[11px] font-bold text-[#181816] shadow-[1px_1px_0px_0px_#181816]"
                >
                  ★ {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Target Audience & Tone */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {product.targetAudience && (
            <div className="rounded-retro-xs bg-white p-2 border-2 border-[#181816] text-[11px] space-y-0.5 shadow-[1.5px_1.5px_0px_0px_#181816]">
              <span className="text-[10px] font-black text-[#7A7468] flex items-center gap-1 uppercase">
                <Users className="h-3 w-3" /> Target
              </span>
              <p className="text-[#181816] font-black truncate">{product.targetAudience}</p>
            </div>
          )}

          {product.toneOfVoice && (
            <div className="rounded-retro-xs bg-white p-2 border-2 border-[#181816] text-[11px] space-y-0.5 shadow-[1.5px_1.5px_0px_0px_#181816]">
              <span className="text-[10px] font-black text-[#7A7468] flex items-center gap-1 uppercase">
                <MessageSquareQuote className="h-3 w-3" /> Tone
              </span>
              <p className="text-[#181816] font-black truncate">{product.toneOfVoice}</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Action Bar */}
      <div className="pt-4 mt-4 border-t-2 border-[#181816] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyContext}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-retro-xs bg-white hover:bg-[#FAF6EE] text-[#181816] text-xs font-black border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
            title="Salin Context JSON untuk LLM"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" /> : <Copy className="h-3.5 w-3.5 stroke-[2.5]" />}
            <span>{copied ? 'Disalin' : 'Copy AI Context'}</span>
          </button>

          <button
            type="button"
            onClick={() => onEdit(product)}
            className="p-1.5 rounded-retro-xs bg-[#D8C49D] hover:bg-[#E2D2B0] text-[#181816] border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
            title="Edit Produk"
          >
            <Edit3 className="h-4 w-4 stroke-[2.5]" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="p-1.5 rounded-retro-xs text-zinc-400 hover:text-white hover:bg-[#C95D53] hover:border-2 hover:border-[#181816] transition-colors"
          title="Hapus Produk"
        >
          <Trash2 className="h-4 w-4 stroke-[2.2]" />
        </button>
      </div>

      {/* Delete Modal Confirmation */}
      <ModalPortal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        maxWidth="sm"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-retro-xs bg-rose-100 text-[#C95D53] border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816]">
              <Trash2 className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-sm font-black text-[#181816] uppercase">Hapus Produk Ini?</h3>
              <p className="text-xs text-[#7A7468] font-medium">Tindakan ini permanen.</p>
            </div>
          </div>

          <p className="text-xs text-[#181816] bg-white p-3 rounded-retro-xs border-2 border-[#181816] font-black shadow-[2px_2px_0px_0px_#181816]">
            &quot;{product.name}&quot;
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
              className="px-4 py-2 rounded-retro-xs border-2 border-[#181816] text-xs font-bold text-[#181816] hover:bg-white shadow-[2px_2px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-retro-xs bg-[#C95D53] hover:bg-[#D45D52] text-white text-xs font-black border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
            >
              <Trash2 className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>{isDeleting ? 'Menghapus...' : 'Hapus Sekarang'}</span>
            </button>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
