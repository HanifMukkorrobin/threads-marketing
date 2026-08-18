'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Package,
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  X,
  Tag,
} from 'lucide-react';
import { Product, CreateProductInput } from '@/types/product';
import { ProductCard } from '@/components/ProductCard';
import { ProductModal } from '@/components/ProductModal';
import { fireRetroConfetti } from '@/lib/confetti';
import { cn } from '@/lib/utils';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Toast notifications state
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (message: string, type: 'success' | 'info' | 'error' = 'info') => {
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

  // Fetch products from API
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/products', { cache: 'no-store' });
      const data = await res.json();

      if (data.success && Array.isArray(data.data)) {
        setProducts(data.data);
      } else {
        throw new Error(data.error || 'Gagal memuat daftar produk');
      }
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan saat memuat produk');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['Semua', ...Array.from(set)];
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== 'Semua' && p.category !== selectedCategory) {
        return false;
      }

      if (statusFilter === 'ACTIVE' && !p.isActive) return false;
      if (statusFilter === 'INACTIVE' && p.isActive) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchCat = p.category.toLowerCase().includes(q);
        const matchDesc = p.description ? p.description.toLowerCase().includes(q) : false;
        const matchUsp = p.usp?.some((u) => u.toLowerCase().includes(q));

        if (!matchName && !matchCat && !matchDesc && !matchUsp) {
          return false;
        }
      }

      return true;
    });
  }, [products, selectedCategory, statusFilter, searchQuery]);

  // Save / Update product handler
  const handleSaveProduct = async (productData: CreateProductInput, id?: string) => {
    const isEdit = !!id;
    const url = isEdit ? `/api/products/${id}` : '/api/products';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Gagal menyimpan produk');
    }

    await fetchProducts();
    fireRetroConfetti(0.5, 0.5);
    addToast(
      isEdit ? `Produk "${productData.name}" berhasil diperbarui` : `Produk "${productData.name}" berhasil ditambahkan!`,
      'success'
    );
  };

  // Toggle active status
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !currentStatus }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Gagal mengubah status aktif produk');
    }

    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isActive: !currentStatus } : p))
    );
  };

  // Delete product
  const handleDeleteProduct = async (id: string) => {
    const res = await fetch(`/api/products/${id}`, {
      method: 'DELETE',
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Gagal menghapus produk');
    }

    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="p-6 sm:p-8 lg:p-10 space-y-7 animate-fadeIn bg-[#FAF6EE]">
      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-center justify-between gap-3 px-4 py-2.5 rounded-retro-xs border-2 border-[#181816] shadow-[3px_3px_0px_0px_#181816] text-xs font-black animate-scale-in transition-all',
              toast.type === 'success' && 'bg-[#6B9AC4] text-white',
              toast.type === 'error' && 'bg-[#C95D53] text-white',
              toast.type === 'info' && 'bg-white text-[#181816]'
            )}
          >
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-black/60 hover:text-black"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 border-b-2 border-[#181816] pb-5">
        <div className="space-y-1.5 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#181816] tracking-tight flex flex-wrap items-center gap-x-2.5 gap-y-2 uppercase">
            <span>Katalog</span>
            <span className="inline-flex items-center justify-center px-3 py-0.5 rounded-retro-xs bg-[#6B9AC4] border-2 border-[#181816] text-white shadow-[2px_2px_0px_0px_#181816]">
              Produk Digital
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-[#4A463F] font-semibold">
            Katalog produk digital yang menjadi acuan otomatis bagi Hermes AI saat meracik copywriting dan penawaran harga.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchProducts}
            disabled={loading}
            className="flex h-10 w-10 items-center justify-center rounded-retro-xs bg-white hover:bg-[#FAF6EE] border-2 border-[#181816] text-[#181816] shadow-[2px_2px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all tap-effect"
            title="Refresh Data"
          >
            <RefreshCw className={cn('h-4 w-4 stroke-[2.5]', loading && 'animate-spin')} />
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingProduct(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2 rounded-retro-xs bg-[#C95D53] hover:bg-[#D45D52] text-white font-black text-xs border-2 border-[#181816] shadow-[3px_3px_0px_0px_#181816] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none transition-all tap-effect uppercase tracking-wider"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>+ Tambah Produk Baru</span>
          </button>
        </div>
      </header>

      {/* Category Pills & Status Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'rounded-retro-xs px-4 py-1.5 text-xs font-black border-2 border-[#181816] transition-all tap-effect shrink-0 uppercase tracking-wider',
                  isActive
                    ? 'bg-[#6B9AC4] text-white shadow-[2px_2px_0px_0px_#181816]'
                    : 'bg-white text-[#181816] hover:bg-[#FAF6EE] shadow-[1.5px_1.5px_0px_0px_#181816]'
                )}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Status Filter */}
        <div className="flex items-center rounded-retro-xs bg-white p-1 border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816] shrink-0 self-start sm:self-auto">
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={cn(
                'rounded-none px-3 py-1 text-xs font-black transition-all tap-effect uppercase tracking-wider',
                statusFilter === st
                  ? 'bg-[#D8C49D] text-[#181816] shadow-[1px_1px_0px_0px_#181816]'
                  : 'text-[#181816] hover:bg-[#FAF6EE]'
              )}
            >
              {st === 'ALL' ? 'Semua' : st === 'ACTIVE' ? 'Aktif' : 'Non-Aktif'}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#181816] stroke-[2.5]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari produk berdasarkan nama, kategori, deskripsi, atau keunggulan USP..."
          className="w-full rounded-retro-xs bg-white border-2 border-[#181816] pl-10 pr-10 py-2.5 text-xs sm:text-sm text-[#181816] placeholder-zinc-400 font-bold shadow-[3px_3px_0px_0px_#181816] focus:outline-none focus:bg-[#FAF6EE]"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#181816] hover:text-[#C95D53] p-1"
          >
            <X className="h-4 w-4 stroke-[3]" />
          </button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center justify-between rounded-retro-xs border-2 border-[#181816] bg-rose-100 p-4 text-xs text-[#181816] font-black shadow-[3px_3px_0px_0px_#181816]">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[#C95D53] stroke-[2.5]" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchProducts}
            className="rounded-retro-xs bg-[#C95D53] px-3 py-1 text-white font-black border border-[#181816] hover:bg-[#D45D52]"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-64 rounded-retro-xs bg-white border-2 border-[#181816] animate-pulse p-6 space-y-4 shadow-[4px_4px_0px_0px_#181816]"
            >
              <div className="h-4 w-1/3 bg-[#D8C49D] rounded-retro-xs" />
              <div className="h-5 w-3/4 bg-zinc-200 rounded-retro-xs" />
              <div className="h-24 bg-[#FAF6EE] rounded-retro-xs" />
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-retro-xs border-2 border-dashed border-[#181816] p-12 text-center bg-white space-y-3 shadow-[3px_3px_0px_0px_#181816]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-retro-xs bg-[#D8C49D] border-2 border-[#181816] text-[#181816] shadow-[2px_2px_0px_0px_#181816]">
            <Package className="h-6 w-6 stroke-[2.5]" />
          </div>
          <h3 className="text-sm font-black text-[#181816] uppercase">Tidak Ada Produk Ditemukan</h3>
          <p className="text-xs text-[#7A7468] max-w-md mx-auto font-medium">
            {searchQuery || selectedCategory !== 'Semua' || statusFilter !== 'ALL'
              ? 'Tidak ada produk yang cocok dengan filter pencarian Anda.'
              : 'Katalog produk Anda masih kosong. Tambahkan produk pertama Anda sekarang.'}
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setEditingProduct(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-retro-xs bg-[#C95D53] text-white text-xs font-black border-2 border-[#181816] shadow-[3px_3px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all tap-effect uppercase tracking-wider"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>+ Tambah Produk Baru</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map((prod) => (
            <ProductCard
              key={prod.id}
              product={prod}
              onEdit={(p) => {
                setEditingProduct(p);
                setModalOpen(true);
              }}
              onToggleActive={handleToggleActive}
              onDelete={handleDeleteProduct}
              onToast={addToast}
            />
          ))}
        </div>
      )}

      {/* Product Create / Edit Modal */}
      <ProductModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveProduct}
        initialData={editingProduct}
      />
    </div>
  );
}
