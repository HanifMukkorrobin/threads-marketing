'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Package,
  Plus,
  Search,
  SlidersHorizontal,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Layers,
  CheckCircle2,
  X,
  Info,
} from 'lucide-react';
import { Product, CreateProductInput } from '@/types/product';
import { ProductCard } from '@/components/ProductCard';
import { ProductModal } from '@/components/ProductModal';
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
      const res = await fetch('/api/products');
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

  // Categories list derived from products + defaults
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
      // Category filter
      if (selectedCategory !== 'Semua' && p.category !== selectedCategory) {
        return false;
      }

      // Status filter
      if (statusFilter === 'ACTIVE' && !p.isActive) return false;
      if (statusFilter === 'INACTIVE' && p.isActive) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchCategory = p.category?.toLowerCase().includes(q);
        const matchDesc = p.description?.toLowerCase().includes(q);
        const matchUsp = p.usp?.some((u) => u.toLowerCase().includes(q));
        const matchVariants = p.variants?.some((v) => v.name.toLowerCase().includes(q));

        if (!matchName && !matchCategory && !matchDesc && !matchUsp && !matchVariants) {
          return false;
        }
      }

      return true;
    });
  }, [products, selectedCategory, statusFilter, searchQuery]);

  // Handle Save (Create or Update)
  const handleSaveProduct = async (productData: CreateProductInput, id?: string) => {
    if (id) {
      // Update
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Gagal memperbarui produk');
      }
      setProducts((prev) => prev.map((p) => (p.id === id ? result.data : p)));
      addToast(`Produk "${result.data.name}" berhasil diperbarui`, 'success');
    } else {
      // Create
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Gagal membuat produk');
      }
      setProducts((prev) => [result.data, ...prev]);
      addToast(`Produk "${result.data.name}" berhasil dibuat`, 'success');
    }
  };

  // Handle Toggle Active
  const handleToggleActive = async (id: string, current: boolean) => {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !current }),
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.error || 'Gagal mengubah status');
    }
    setProducts((prev) => prev.map((p) => (p.id === id ? result.data : p)));
  };

  // Handle Delete
  const handleDeleteProduct = async (id: string) => {
    const res = await fetch(`/api/products/${id}`, {
      method: 'DELETE',
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.error || 'Gagal menghapus produk');
    }
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  // Handle Edit Click
  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setModalOpen(true);
  };

  // Handle Create Click
  const handleCreateClick = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen pb-16">
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2',
              toast.type === 'success' && 'border-emerald-700/80 bg-zinc-900/95 text-emerald-300',
              toast.type === 'error' && 'border-red-700/80 bg-zinc-900/95 text-red-300',
              toast.type === 'info' && 'border-threads-accent/50 bg-zinc-900/95 text-sky-200'
            )}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
              {toast.type === 'error' && <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />}
              {toast.type === 'info' && <Info className="h-4 w-4 shrink-0 text-threads-accent" />}
              <span className="text-xs font-medium">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-threads-border">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-threads-card border border-threads-border text-threads-accent">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-threads-text sm:text-2xl">
                  Katalog Produk Digital
                </h1>
                <p className="text-xs text-threads-secondary">
                  Kelola database produk, varian harga, USP, dan context persona untuk copy generator Hermes AI.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={fetchProducts}
              disabled={loading}
              title="Muat ulang daftar produk"
              className="inline-flex items-center justify-center rounded-xl border border-threads-border bg-threads-card p-2.5 text-zinc-400 hover:bg-threads-surface hover:text-zinc-200 transition-colors"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin text-threads-accent')} />
            </button>

            <button
              type="button"
              onClick={handleCreateClick}
              className="inline-flex items-center gap-2 rounded-xl bg-threads-accent px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-threads-accent/20 hover:bg-sky-500 transition-all duration-150"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Produk</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, kategori, USP, atau varian..."
              className="w-full rounded-xl border border-threads-border bg-threads-card pl-10 pr-9 py-2.5 text-xs text-threads-text placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-threads-accent"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5 self-start md:self-auto rounded-xl bg-threads-card p-1 border border-threads-border text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={cn(
                'rounded-lg px-3 py-1.5 font-medium transition-colors',
                statusFilter === 'ALL'
                  ? 'bg-threads-surface text-threads-text border border-threads-border shadow-sm'
                  : 'text-threads-secondary hover:text-threads-text'
              )}
            >
              Semua ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={cn(
                'rounded-lg px-3 py-1.5 font-medium transition-colors',
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/80'
                  : 'text-threads-secondary hover:text-threads-text'
              )}
            >
              Aktif ({products.filter((p) => p.isActive).length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('INACTIVE')}
              className={cn(
                'rounded-lg px-3 py-1.5 font-medium transition-colors',
                statusFilter === 'INACTIVE'
                  ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                  : 'text-threads-secondary hover:text-threads-text'
              )}
            >
              Non-aktif ({products.filter((p) => !p.isActive).length})
            </button>
          </div>
        </div>

        {/* Category Horizontal Scroll Pills */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-xs text-zinc-500 font-medium whitespace-nowrap mr-1 flex items-center gap-1">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Kategori:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150',
                selectedCategory === cat
                  ? 'bg-threads-accent text-white shadow-sm'
                  : 'bg-threads-card text-zinc-400 hover:bg-threads-surface hover:text-zinc-200 border border-threads-border'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="mt-6">
          {error && (
            <div className="mb-6 flex items-center justify-between rounded-xl bg-red-950/60 p-4 border border-red-900/60 text-sm text-red-300">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={fetchProducts}
                className="rounded-lg bg-red-900/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-xl border border-threads-border bg-threads-card p-5 space-y-4"
                >
                  <div className="flex justify-between">
                    <div className="h-5 w-24 bg-zinc-800 rounded"></div>
                    <div className="h-5 w-16 bg-zinc-800 rounded-full"></div>
                  </div>
                  <div className="h-6 w-3/4 bg-zinc-800 rounded"></div>
                  <div className="h-4 w-full bg-zinc-800 rounded"></div>
                  <div className="h-16 w-full bg-zinc-800/60 rounded-lg"></div>
                  <div className="h-8 w-full bg-zinc-800/40 rounded"></div>
                </div>
              ))}
            </div>
          )}

          {!loading && filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-threads-border bg-threads-card/60 p-12 text-center my-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 border border-threads-border text-threads-accent mb-4">
                <Package className="h-7 w-7" />
              </div>

              {searchQuery || selectedCategory !== 'Semua' || statusFilter !== 'ALL' ? (
                <>
                  <h3 className="text-base font-semibold text-threads-text">
                    Tidak ada produk yang cocok
                  </h3>
                  <p className="mt-1 text-xs text-threads-secondary max-w-sm">
                    Tidak ditemukan produk dengan kriteria pencarian atau filter yang Anda pilih.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('Semua');
                      setStatusFilter('ALL');
                    }}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-threads-surface border border-threads-border px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Reset Filter
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-base font-semibold text-threads-text">
                    Belum ada produk digital
                  </h3>
                  <p className="mt-1 text-xs text-threads-secondary max-w-md">
                    Mulai dengan menambahkan produk pertama Anda lengkap dengan varian harga, selling points (USP), dan gaya persona copy.
                  </p>
                  <button
                    type="button"
                    onClick={handleCreateClick}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-threads-accent px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-threads-accent/20 hover:bg-sky-500 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah Produk Pertama
                  </button>
                </>
              )}
            </div>
          )}

          {!loading && filteredProducts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onEdit={handleEditClick}
                  onToggleActive={handleToggleActive}
                  onDelete={handleDeleteProduct}
                  onToast={addToast}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
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
