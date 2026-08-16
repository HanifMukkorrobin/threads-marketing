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
        'group relative flex flex-col justify-between rounded-xl border bg-threads-card p-5 transition-all duration-200 hover:border-zinc-700 hover:shadow-lg',
        product.isActive
          ? 'border-threads-border'
          : 'border-zinc-800/80 opacity-75'
      )}
    >
      {/* Card Header: Category & Active status */}
      <div>
        <div className="flex items-center justify-between gap-2 pb-3">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-threads-surface px-2.5 py-1 text-xs font-medium text-zinc-300 border border-threads-border">
            <Tag className="h-3 w-3 text-threads-accent" />
            {product.category}
          </span>

          <button
            type="button"
            onClick={handleToggle}
            disabled={isToggling}
            title={product.isActive ? 'Klik untuk non-aktifkan' : 'Klik untuk aktifkan'}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-all duration-150',
              product.isActive
                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 hover:bg-emerald-900/60'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                product.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
              )}
            />
            {product.isActive ? 'Aktif' : 'Non-aktif'}
          </button>
        </div>

        {/* Product Title & Slug */}
        <h3 className="text-base font-semibold text-threads-text tracking-tight group-hover:text-white">
          {product.name}
        </h3>
        <p className="font-mono text-[11px] text-threads-secondary">
          slug: /{product.slug}
        </p>

        {/* Product Description */}
        {product.description && (
          <p className="mt-2 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}

        {/* Variants & Pricing */}
        {product.variants && product.variants.length > 0 && (
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              <Layers className="h-3.5 w-3.5 text-threads-accent" />
              <span>Varian & Harga</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {product.variants.map((variant, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 px-2.5 py-1 text-xs text-zinc-200"
                >
                  <span className="font-medium text-zinc-300">{variant.name}:</span>
                  <span className="font-semibold text-threads-accent">
                    {formatIDR(variant.price)}
                  </span>
                  {variant.duration && (
                    <span className="text-[10px] text-zinc-500">
                      ({variant.duration})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* USP Tags */}
        {product.usp && product.usp.length > 0 && (
          <div className="mt-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Selling Points (USP)</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {product.usp.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center rounded-md bg-zinc-800/80 px-2 py-0.5 text-[11px] text-zinc-300 border border-zinc-700/60"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Audience & Tone Context */}
        <div className="mt-3.5 space-y-1.5 border-t border-zinc-800/60 pt-3 text-xs">
          {product.targetAudience && (
            <div className="flex items-start gap-1.5 text-zinc-400">
              <Users className="h-3.5 w-3.5 mt-0.5 text-zinc-500 shrink-0" />
              <span className="text-[11px]">
                <strong className="text-zinc-300 font-normal">Audience: </strong>
                {product.targetAudience}
              </span>
            </div>
          )}
          {product.toneOfVoice && (
            <div className="flex items-start gap-1.5 text-zinc-400">
              <MessageSquareQuote className="h-3.5 w-3.5 mt-0.5 text-zinc-500 shrink-0" />
              <span className="text-[11px]">
                <strong className="text-zinc-300 font-normal">Tone: </strong>
                {product.toneOfVoice}
              </span>
            </div>
          )}
          {product.ctaTemplate && (
            <div className="flex items-start gap-1.5 text-zinc-400">
              <Megaphone className="h-3.5 w-3.5 mt-0.5 text-zinc-500 shrink-0" />
              <span className="text-[11px] italic text-zinc-400 line-clamp-1">
                &ldquo;{product.ctaTemplate}&rdquo;
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="mt-5 pt-3 border-t border-threads-border">
        {showDeleteConfirm ? (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-red-950/40 p-2 border border-red-900/50">
            <span className="text-xs text-red-300 font-medium">Hapus produk ini?</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-500 transition-colors"
              >
                {isDeleting ? '...' : 'Ya'}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            {/* Copy AI Context button */}
            <button
              type="button"
              onClick={handleCopyContext}
              title="Salin JSON context produk untuk prompt AI"
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150',
                copied
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-threads-surface text-threads-text border border-threads-border hover:bg-zinc-800 hover:border-zinc-700'
              )}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Context Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-threads-accent" />
                  <span>Copy AI Context</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-1">
              {/* Quick toggle active */}
              <button
                type="button"
                onClick={handleToggle}
                disabled={isToggling}
                title={product.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-threads-surface hover:text-zinc-200 transition-colors"
              >
                <Power className={cn('h-4 w-4', product.isActive ? 'text-emerald-400' : 'text-zinc-500')} />
              </button>

              {/* Edit button */}
              <button
                type="button"
                onClick={() => onEdit(product)}
                title="Edit Produk"
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-threads-surface hover:text-threads-accent transition-colors"
              >
                <Edit3 className="h-4 w-4" />
              </button>

              {/* Delete trigger */}
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                title="Hapus Produk"
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-950/60 hover:text-red-400 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
