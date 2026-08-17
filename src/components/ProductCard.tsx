'use client';

import React, { useState } from 'react';
import {
  Tag,
  Copy,
  Check,
  Edit3,
  Trash2,
  Power,
  Layers,
  Sparkles,
  Users,
  MessageSquareQuote,
  Megaphone,
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
        'group relative flex flex-col justify-between rounded-bento border bg-surface p-6 transition-all duration-200 bento-card',
        product.isActive
          ? 'border-surface-border'
          : 'opacity-70 border-dashed border-zinc-300 bg-zinc-50'
      )}
    >
      <div className="space-y-4">
        {/* Header: Category + Active Status Pill */}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-ink border border-surface-border shadow-xs">
            <Tag className="h-3 w-3 text-ink-secondary" />
            <span>{product.category}</span>
          </span>

          <button
            type="button"
            onClick={handleToggle}
            disabled={isToggling}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold border transition-all tap-effect',
              product.isActive
                ? 'bg-lime text-ink border-lime-dark/30 shadow-xs'
                : 'bg-zinc-200 text-zinc-600 border-zinc-300'
            )}
            title="Klik untuk mengubah status aktif"
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                product.isActive ? 'bg-ink animate-pulse' : 'bg-zinc-400'
              )}
            />
            <span>{product.isActive ? 'Aktif' : 'Non-Aktif'}</span>
          </button>
        </div>

        {/* Product Name & Description */}
        <div className="space-y-1">
          <h3 className="text-base font-bold text-ink tracking-tight line-clamp-1">
            {product.name}
          </h3>
          <p className="text-xs text-ink-secondary leading-relaxed line-clamp-2">
            {product.description}
          </p>
        </div>

        {/* Pricing Variants Box */}
        {product.variants && product.variants.length > 0 && (
          <div className="rounded-2xl bg-white p-3.5 border border-surface-border/80 space-y-2 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1">
              <Layers className="h-3 w-3" />
              Varian & Harga Resmi
            </span>
            <div className="flex flex-wrap gap-1.5">
              {product.variants.map((v, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-1.5 rounded-full bg-surface border border-surface-border px-2.5 py-1 text-xs text-ink font-medium"
                >
                  <span className="font-semibold">{v.name}:</span>
                  <span className="font-bold text-ink">{formatIDR(v.price)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* USPs Pill Tags */}
        {product.usp && product.usp.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" />
              Keunggulan Utama (USP)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {product.usp.map((item, idx) => (
                <span
                  key={idx}
                  className="rounded-full bg-white border border-surface-border px-2.5 py-0.5 text-[11px] font-medium text-ink-secondary"
                >
                  ✓ {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Target Audience & Tone */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {product.targetAudience && (
            <div className="rounded-xl bg-white p-2.5 border border-surface-border/70 text-[11px] space-y-0.5">
              <span className="text-[10px] font-bold text-ink-muted flex items-center gap-1">
                <Users className="h-3 w-3" /> Target
              </span>
              <p className="text-ink font-semibold truncate">{product.targetAudience}</p>
            </div>
          )}

          {product.toneOfVoice && (
            <div className="rounded-xl bg-white p-2.5 border border-surface-border/70 text-[11px] space-y-0.5">
              <span className="text-[10px] font-bold text-ink-muted flex items-center gap-1">
                <MessageSquareQuote className="h-3 w-3" /> Tone
              </span>
              <p className="text-ink font-semibold truncate">{product.toneOfVoice}</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Action Bar */}
      <div className="pt-5 mt-5 border-t border-surface-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopyContext}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white hover:bg-surface-hover text-ink text-xs font-semibold border border-surface-border transition-all tap-effect shadow-xs"
            title="Salin Context JSON untuk LLM"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Disalin' : 'Copy AI Context'}</span>
          </button>

          <button
            type="button"
            onClick={() => onEdit(product)}
            className="p-2 rounded-full bg-white hover:bg-surface-hover text-ink border border-surface-border transition-all tap-effect shadow-xs"
            title="Edit Produk"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="p-2 rounded-full text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors tap-effect"
          title="Hapus Produk"
        >
          <Trash2 className="h-4 w-4" />
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
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <Trash2 className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-ink">Hapus Produk Ini?</h3>
              <p className="text-xs text-ink-muted">Tindakan ini permanen.</p>
            </div>
          </div>

          <p className="text-xs text-ink-secondary bg-surface p-3 rounded-xl border border-surface-border/80 font-medium">
            &quot;{product.name}&quot;
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
              className="px-4 py-2 rounded-full border border-surface-border text-xs font-semibold text-ink hover:bg-surface transition-colors"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all tap-effect"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{isDeleting ? 'Menghapus...' : 'Hapus Sekarang'}</span>
            </button>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
