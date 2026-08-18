'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Key,
  Store,
  Radio,
  Code2,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  Save,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Sliders,
  X,
  AlertTriangle,
  Lock,
  Share2,
  Globe,
  Zap,
} from 'lucide-react';
import { ModalPortal } from '@/components/ModalPortal';
import { cn } from '@/lib/utils';

interface SettingsState {
  HERMES_API_KEY: string;
  STORE_NAME: string;
  STORE_USERNAME: string;
  STORE_AVATAR_URL: string;
  DEFAULT_SCHEDULE_DELAY_MINS: string;
  THREADS_ACCESS_TOKEN: string;
  THREADS_USER_ID: string;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

interface TestResult {
  status: number;
  statusText: string;
  latencyMs: number;
  data: any;
  error?: string;
}

type CodeLang = 'curl' | 'python' | 'typescript';
type EndpointTab = 'products' | 'create_draft' | 'approved_drafts' | 'update_status';

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>({
    HERMES_API_KEY: '',
    STORE_NAME: '',
    STORE_USERNAME: '',
    STORE_AVATAR_URL: '',
    DEFAULT_SCHEDULE_DELAY_MINS: '30',
    THREADS_ACCESS_TOKEN: '',
    THREADS_USER_ID: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [showThreadsToken, setShowThreadsToken] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [confirmRegenerateOpen, setConfirmRegenerateOpen] = useState(false);

  // Test Connection
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // Threads Insight Sync state
  const [syncingInsights, setSyncingInsights] = useState(false);
  const [insightSyncResult, setInsightSyncResult] = useState<{ isLive: boolean; message: string } | null>(null);

  // Code Snippet state
  const [codeLang, setCodeLang] = useState<CodeLang>('curl');
  const [endpointTab, setEndpointTab] = useState<EndpointTab>('products');
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // PIN Management state
  const [pinForm, setPinForm] = useState({
    currentPin: '',
    newPin: '',
    confirmPin: '',
  });
  const [showPinFields, setShowPinFields] = useState(false);
  const [changingPin, setChangingPin] = useState(false);

  // Toasts
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

  // Fetch settings from API
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings', { cache: 'no-store' });
      const data = await res.json();

      if (data.success && data.settings) {
        setSettings({
          HERMES_API_KEY: data.settings.HERMES_API_KEY || '',
          STORE_NAME: data.settings.STORE_NAME || 'Toko Digital ID',
          STORE_USERNAME: data.settings.STORE_USERNAME || 'tokodigital.id',
          STORE_AVATAR_URL: data.settings.STORE_AVATAR_URL || '',
          DEFAULT_SCHEDULE_DELAY_MINS: data.settings.DEFAULT_SCHEDULE_DELAY_MINS || '30',
          THREADS_ACCESS_TOKEN: data.settings.THREADS_ACCESS_TOKEN || '',
          THREADS_USER_ID: data.settings.THREADS_USER_ID || '',
        });
      }
    } catch {
      addToast('Gagal memuat konfigurasi sistem', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Save all settings
  const handleSaveAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyimpan pengaturan');
      }

      addToast('Konfigurasi sistem berhasil disimpan!', 'success');
    } catch (err: any) {
      addToast(err?.message || 'Gagal menyimpan pengaturan', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Copy API Key
  const handleCopyApiKey = async () => {
    try {
      await navigator.clipboard.writeText(settings.HERMES_API_KEY);
      setCopiedKey(true);
      addToast('HERMES_API_KEY berhasil disalin!', 'success');
      setTimeout(() => setCopiedKey(false), 2000);
    } catch {
      addToast('Gagal menyalin API Key', 'error');
    }
  };

  // Regenerate API Key
  const handleRegenerateKey = async () => {
    try {
      setRegenerating(true);
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate_key' }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal memperbarui API Key');
      }

      setSettings((prev) => ({
        ...prev,
        HERMES_API_KEY: data.apiKey,
      }));

      setConfirmRegenerateOpen(false);
      addToast('API Key baru berhasil digenerate!', 'success');
    } catch (err: any) {
      addToast(err?.message || 'Gagal meregenerasi API Key', 'error');
    } finally {
      setRegenerating(false);
    }
  };

  // Change PIN
  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinForm.newPin.length !== 6) {
      addToast('PIN baru harus 6 digit angka', 'error');
      return;
    }
    if (pinForm.newPin !== pinForm.confirmPin) {
      addToast('Konfirmasi PIN tidak cocok', 'error');
      return;
    }

    try {
      setChangingPin(true);
      const res = await fetch('/api/auth/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPin: pinForm.currentPin,
          newPin: pinForm.newPin,
          confirmPin: pinForm.confirmPin,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengubah PIN');
      }

      addToast('PIN Akses Dashboard berhasil diubah!', 'success');
      setPinForm({ currentPin: '', newPin: '', confirmPin: '' });
      setShowPinFields(false);
    } catch (err: any) {
      addToast(err?.message || 'Gagal mengubah PIN', 'error');
    } finally {
      setChangingPin(false);
    }
  };

  // Test Hermes Connection
  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      const startTime = performance.now();

      const res = await fetch('/api/hermes/products/active', {
        headers: {
          Authorization: `Bearer ${settings.HERMES_API_KEY}`,
        },
      });

      const latencyMs = Math.round(performance.now() - startTime);
      const data = await res.json();

      setTestResult({
        status: res.status,
        statusText: res.statusText || (res.ok ? 'OK' : 'Error'),
        latencyMs,
        data,
      });

      if (res.ok) {
        addToast(`Koneksi Hermes Valid (${latencyMs}ms)`, 'success');
      } else {
        addToast(`Koneksi Gagal: HTTP ${res.status}`, 'error');
      }
    } catch (err: any) {
      setTestResult({
        status: 0,
        statusText: 'Network Error',
        latencyMs: 0,
        data: null,
        error: err?.message || 'Gagal menghubungi server lokal',
      });
      addToast('Koneksi endpoint gagal', 'error');
    } finally {
      setTesting(false);
    }
  };

  // Test & Sync Threads Graph API Insights
  const handleSyncInsights = async () => {
    try {
      setSyncingInsights(true);
      setInsightSyncResult(null);

      // First save current token/userId if user typed them
      if (settings.THREADS_ACCESS_TOKEN || settings.THREADS_USER_ID) {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            settings: {
              THREADS_ACCESS_TOKEN: settings.THREADS_ACCESS_TOKEN,
              THREADS_USER_ID: settings.THREADS_USER_ID,
            },
          }),
        });
      }

      const res = await fetch('/api/insights/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: settings.THREADS_ACCESS_TOKEN,
          userId: settings.THREADS_USER_ID,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setInsightSyncResult({
          isLive: data.isLiveSynced,
          message: data.message,
        });
        addToast(data.message, data.isLiveSynced ? 'success' : 'info');
      } else {
        throw new Error(data.error || 'Gagal sinkronisasi');
      }
    } catch (err: any) {
      addToast(err?.message || 'Gagal sinkronisasi insight', 'error');
    } finally {
      setSyncingInsights(false);
    }
  };

  const getOrigin = () => {
    if (typeof window !== 'undefined') return window.location.origin;
    return 'https://threads.hadestech.web.id';
  };

  const getCodeSnippet = () => {
    const origin = getOrigin();
    const key = settings.HERMES_API_KEY || '<HERMES_API_KEY>';

    if (codeLang === 'curl') {
      switch (endpointTab) {
        case 'products':
          return `curl -X GET "${origin}/api/hermes/products/active" \\\n  -H "Authorization: Bearer ${key}"`;
        case 'create_draft':
          return `curl -X POST "${origin}/api/hermes/drafts" \\\n  -H "Authorization: Bearer ${key}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "title": "Promo Canva Pro Edu",\n    "productId": "<PRODUCT_ID>",\n    "hookAngle": "Price Comparison",\n    "posts": [\n      {"orderIndex": 0, "content": "Ngapain bayar 100rb kalau ada yang 25rb? 🧵👇"},\n      {"orderIndex": 1, "content": "Fitur lengkap Canva Pro garansi 30 hari."},\n      {"orderIndex": 2, "content": "DM admin @tokodigital.id sekarang!"}\n    ]\n  }'`;
        case 'approved_drafts':
          return `curl -X GET "${origin}/api/hermes/drafts/approved" \\\n  -H "Authorization: Bearer ${key}"`;
        case 'update_status':
          return `curl -X PATCH "${origin}/api/hermes/drafts/<DRAFT_ID>/status" \\\n  -H "Authorization: Bearer ${key}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "status": "PUBLISHED",\n    "threadPostId": "18012345678",\n    "threadPostUrl": "https://www.threads.net/@tokodigital.id/post/18012345678"\n  }'`;
      }
    }

    if (codeLang === 'typescript') {
      return `import axios from 'axios';\n\nconst API_BASE = '${origin}';\nconst API_KEY = '${key}';\n\n// 1. Fetch Active Products\nexport async function getActiveProducts() {\n  const res = await axios.get(\`\${API_BASE}/api/hermes/products/active\`, {\n    headers: { Authorization: \`Bearer \${API_KEY}\` },\n  });\n  return res.data;\n}`;
    }

    if (codeLang === 'python') {
      return `import requests\n\nAPI_BASE = "${origin}"\nAPI_KEY = "${key}"\n\n# Fetch Active Products\nheaders = {"Authorization": f"Bearer {API_KEY}"}\nresponse = requests.get(f"{API_BASE}/api/hermes/products/active", headers=headers)\nprint(response.json())`;
    }

    return '';
  };

  const handleCopySnippet = async () => {
    try {
      await navigator.clipboard.writeText(getCodeSnippet());
      setCopiedSnippet(true);
      addToast('Code snippet disalin ke clipboard!', 'success');
      setTimeout(() => setCopiedSnippet(false), 2000);
    } catch {
      addToast('Gagal menyalin snippet', 'error');
    }
  };

  return (
    <div className="p-6 sm:p-8 lg:p-10 space-y-8 animate-fadeIn">
      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-center justify-between gap-3 px-4 py-2.5 rounded-full shadow-lg text-xs font-semibold animate-scale-in transition-all',
              toast.type === 'success' && 'bg-ink text-white border border-black',
              toast.type === 'error' && 'bg-rose-500 text-white',
              toast.type === 'info' && 'bg-surface text-ink border border-surface-border'
            )}
          >
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-white/60 hover:text-white"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-ink tracking-tight flex flex-wrap items-center gap-x-2.5 gap-y-2">
            <span>Managing</span>
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-surface border border-surface-border text-ink shadow-sm">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span>Your System</span>
            <span>and</span>
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-lime border border-lime-dark/30 text-ink text-sm font-black shadow-sm">
              ✦
            </span>
            <span>API Settings</span>
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary">
            Konfigurasi branding toko, otentikasi Hermes Autonomous Agent, integrasi Meta Threads, dan keamanan PIN.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchSettings}
            disabled={loading}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface hover:bg-surface-hover border border-surface-border text-ink transition-all tap-effect"
            title="Refresh Pengaturan"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>

          <button
            type="button"
            onClick={() => handleSaveAll()}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-ink hover:bg-zinc-800 text-white font-bold text-xs shadow-pill transition-all tap-effect disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Menyimpan...' : 'Simpan Semua Perubahan'}</span>
          </button>
        </div>
      </header>

      {/* Main Settings Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bento Card 1: Store Branding & Identity */}
        <div className="rounded-bento border border-surface-border bg-surface p-6 sm:p-7 space-y-5 shadow-xs">
          <div className="flex items-center gap-2.5 border-b border-surface-border pb-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink border border-surface-border shadow-xs">
              <Store className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-ink tracking-tight">
                Branding & Identitas Toko
              </h2>
              <p className="text-[11px] text-ink-secondary">
                Informasi ini otomatis disematkan oleh AI pada CTA dan Simulator Threads.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">
                Nama Toko / Brand
              </label>
              <input
                type="text"
                value={settings.STORE_NAME}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, STORE_NAME: e.target.value }))
                }
                placeholder="Toko Digital ID"
                className="w-full rounded-full bg-white border border-surface-border px-4 py-2 text-xs sm:text-sm text-ink placeholder-ink-muted focus:border-ink focus:outline-none shadow-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">
                Threads Handle / Username
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-muted">
                  @
                </span>
                <input
                  type="text"
                  value={settings.STORE_USERNAME.replace(/^@/, '')}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      STORE_USERNAME: e.target.value.replace(/^@/, ''),
                    }))
                  }
                  placeholder="tokodigital.id"
                  className="w-full rounded-full bg-white border border-surface-border pl-8 pr-4 py-2 text-xs sm:text-sm text-ink placeholder-ink-muted focus:border-ink focus:outline-none shadow-xs font-mono font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">
                URL Avatar Toko (Opsional)
              </label>
              <input
                type="url"
                value={settings.STORE_AVATAR_URL}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, STORE_AVATAR_URL: e.target.value }))
                }
                placeholder="https://example.com/avatar.jpg"
                className="w-full rounded-full bg-white border border-surface-border px-4 py-2 text-xs text-ink placeholder-ink-muted focus:border-ink focus:outline-none shadow-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Bento Card 2: Hermes Autonomous Agent Gateway */}
        <div className="rounded-bento border border-surface-border bg-surface p-6 sm:p-7 space-y-5 shadow-xs">
          <div className="flex items-center gap-2.5 border-b border-surface-border pb-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-lime text-ink border border-lime-dark/30 shadow-xs font-bold">
              ⚡
            </span>
            <div>
              <h2 className="text-sm font-bold text-ink tracking-tight">
                Hermes Autonomous API Key
              </h2>
              <p className="text-[11px] text-ink-secondary">
                Kunci otentikasi Bearer Token untuk script background scheduler Hermes di VPS.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">
                HERMES_API_KEY (Bearer Secret)
              </label>
              <div className="relative flex items-center">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={settings.HERMES_API_KEY}
                  readOnly
                  className="w-full rounded-full bg-white border border-surface-border pl-4 pr-24 py-2 text-xs text-ink font-mono font-bold shadow-xs select-all focus:outline-none"
                />
                <div className="absolute right-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="p-1.5 rounded-full text-ink-muted hover:text-ink transition-colors"
                    title={showKey ? 'Sembunyikan' : 'Tampilkan'}
                  >
                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyApiKey}
                    className="p-1.5 rounded-full bg-surface hover:bg-surface-hover text-ink border border-surface-border shadow-xs"
                    title="Salin API Key"
                  >
                    {copiedKey ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setConfirmRegenerateOpen(true)}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline"
              >
                Regenerate API Key Baru
              </button>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white hover:bg-surface-hover text-ink text-xs font-bold border border-surface-border shadow-xs tap-effect"
              >
                {testing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Radio className="h-3.5 w-3.5 text-emerald-600" />}
                <span>Uji Koneksi API</span>
              </button>
            </div>

            {testResult && (
              <div
                className={cn(
                  'rounded-2xl p-3.5 border text-xs font-mono space-y-1 animate-scale-in',
                  testResult.status === 200
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                )}
              >
                <div className="flex items-center justify-between font-bold">
                  <span>Status: HTTP {testResult.status} ({testResult.statusText})</span>
                  <span>{testResult.latencyMs}ms</span>
                </div>
                {testResult.error && <p className="text-[11px] text-rose-700">{testResult.error}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Bento Card 3: Threads Graph API Token */}
        <div className="rounded-bento border border-surface-border bg-surface p-6 sm:p-7 space-y-5 shadow-xs">
          <div className="flex items-center gap-2.5 border-b border-surface-border pb-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink border border-surface-border shadow-xs font-bold">
              @
            </span>
            <div>
              <h2 className="text-sm font-bold text-ink tracking-tight">
                Meta Threads Graph API
              </h2>
              <p className="text-[11px] text-ink-secondary">
                Token akses resmi untuk auto-publishing langsung ke platform Threads Meta.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">
                Threads Access Token
              </label>
              <div className="relative flex items-center">
                <input
                  type={showThreadsToken ? 'text' : 'password'}
                  value={settings.THREADS_ACCESS_TOKEN}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      THREADS_ACCESS_TOKEN: e.target.value,
                    }))
                  }
                  placeholder="THQW..."
                  className="w-full rounded-full bg-white border border-surface-border pl-4 pr-12 py-2 text-xs text-ink font-mono shadow-xs focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowThreadsToken(!showThreadsToken)}
                  className="absolute right-3 p-1 text-ink-muted hover:text-ink"
                >
                  {showThreadsToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">
                Threads User ID
              </label>
              <input
                type="text"
                value={settings.THREADS_USER_ID}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    THREADS_USER_ID: e.target.value,
                  }))
                }
                placeholder="178414..."
                className="w-full rounded-full bg-white border border-surface-border px-4 py-2 text-xs text-ink font-mono shadow-xs focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-ink-muted">
                {settings.THREADS_ACCESS_TOKEN ? 'Token terisi' : 'Mode Baseline Aktif'}
              </span>

              <button
                type="button"
                onClick={handleSyncInsights}
                disabled={syncingInsights}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white hover:bg-surface-hover text-ink text-xs font-bold border border-surface-border shadow-xs tap-effect disabled:opacity-50"
              >
                <RefreshCw className={cn('h-3.5 w-3.5 text-ink', syncingInsights && 'animate-spin')} />
                <span>Sync Insights Sekarang</span>
              </button>
            </div>

            {insightSyncResult && (
              <div
                className={cn(
                  'rounded-2xl p-3.5 border text-xs space-y-1 animate-scale-in',
                  insightSyncResult.isLive
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                )}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  {insightSyncResult.isLive ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Zap className="h-3.5 w-3.5 text-amber-600" />
                  )}
                  <span>{insightSyncResult.isLive ? 'Meta Live Connected' : 'Hermes Baseline Active'}</span>
                </div>
                <p className="text-[11px]">{insightSyncResult.message}</p>
              </div>
            )}
          </div>
        </div>


        {/* Bento Card 4: Security & PIN Management */}
        <div className="rounded-bento border border-surface-border bg-surface p-6 sm:p-7 space-y-5 shadow-xs">
          <div className="flex items-center gap-2.5 border-b border-surface-border pb-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink border border-surface-border shadow-xs">
              <Lock className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-ink tracking-tight">
                Keamanan & PIN Akses
              </h2>
              <p className="text-[11px] text-ink-secondary">
                PIN 6-digit untuk mengunci dashboard admin dari akses publik yang tidak berwenang.
              </p>
            </div>
          </div>

          {!showPinFields ? (
            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-ink">PIN Akses Aktif</span>
                <p className="text-[11px] text-ink-muted">Terproteksi dengan enkripsi SHA-256 session cookie.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPinFields(true)}
                className="px-4 py-2 rounded-full bg-white hover:bg-surface-hover text-ink text-xs font-bold border border-surface-border shadow-xs tap-effect"
              >
                Ganti PIN
              </button>
            </div>
          ) : (
            <form onSubmit={handleChangePin} className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-ink mb-1">
                  PIN Saat Ini
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={pinForm.currentPin}
                  onChange={(e) =>
                    setPinForm((p) => ({ ...p, currentPin: e.target.value.replace(/\D/g, '') }))
                  }
                  placeholder="******"
                  className="w-full rounded-full bg-white border border-surface-border px-4 py-1.5 text-xs text-ink font-mono text-center shadow-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-ink mb-1">
                    PIN Baru (6 Digit)
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={pinForm.newPin}
                    onChange={(e) =>
                      setPinForm((p) => ({ ...p, newPin: e.target.value.replace(/\D/g, '') }))
                    }
                    placeholder="******"
                    className="w-full rounded-full bg-white border border-surface-border px-4 py-1.5 text-xs text-ink font-mono text-center shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-ink mb-1">
                    Ulangi PIN Baru
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={pinForm.confirmPin}
                    onChange={(e) =>
                      setPinForm((p) => ({ ...p, confirmPin: e.target.value.replace(/\D/g, '') }))
                    }
                    placeholder="******"
                    className="w-full rounded-full bg-white border border-surface-border px-4 py-1.5 text-xs text-ink font-mono text-center shadow-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPinFields(false)}
                  className="px-3.5 py-1.5 rounded-full border border-surface-border text-xs font-semibold text-ink hover:bg-surface"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={changingPin || pinForm.newPin.length !== 6}
                  className="px-4 py-1.5 rounded-full bg-ink text-white text-xs font-bold shadow-pill tap-effect disabled:opacity-50"
                >
                  {changingPin ? 'Menyimpan...' : 'Perbarui PIN'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Bento Card 5: Hermes Agent API Documentation & Snippets */}
      <div className="rounded-bento border border-black/10 bg-ink p-6 sm:p-8 text-white space-y-6 shadow-dock">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-lime text-ink text-sm font-black shadow-xs">
              <Code2 className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Hermes Autonomous API Reference
              </h2>
              <p className="text-xs text-zinc-400">
                Gunakan REST endpoint ini pada script daemon Python / TS runner di cron Hermes.
              </p>
            </div>
          </div>

          {/* Lang switcher */}
          <div className="flex items-center rounded-full bg-zinc-900 p-1 border border-zinc-800">
            {(['curl', 'typescript', 'python'] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setCodeLang(lang)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider transition-all tap-effect',
                  codeLang === lang
                    ? 'bg-lime text-ink shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                )}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* Endpoint Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { key: 'products', label: '1. GET Active Products' },
            { key: 'create_draft', label: '2. POST AI Draft' },
            { key: 'approved_drafts', label: '3. GET Approved Queue' },
            { key: 'update_status', label: '4. PATCH Post Status' },
          ].map((ep) => (
            <button
              key={ep.key}
              type="button"
              onClick={() => setEndpointTab(ep.key as EndpointTab)}
              className={cn(
                'rounded-full px-4 py-1.5 text-xs font-semibold border transition-all tap-effect shrink-0',
                endpointTab === ep.key
                  ? 'bg-zinc-800 text-white border-zinc-600 shadow-xs'
                  : 'bg-transparent text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
              )}
            >
              {ep.label}
            </button>
          ))}
        </div>

        {/* Code Snippet Box */}
        <div className="relative rounded-2xl bg-zinc-950 p-4 border border-zinc-800">
          <button
            type="button"
            onClick={handleCopySnippet}
            className="absolute right-4 top-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700 shadow-xs tap-effect"
          >
            {copiedSnippet ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedSnippet ? 'Tersalin' : 'Salin Snippet'}</span>
          </button>

          <pre className="text-xs font-mono text-zinc-300 overflow-x-auto pt-8 pb-2 leading-relaxed selection:bg-lime selection:text-ink">
            <code>{getCodeSnippet()}</code>
          </pre>
        </div>
      </div>

      {/* Confirm Regenerate Modal */}
      <ModalPortal
        isOpen={confirmRegenerateOpen}
        onClose={() => setConfirmRegenerateOpen(false)}
        maxWidth="sm"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-ink">Regenerate API Key?</h3>
              <p className="text-xs text-ink-muted">Kunci lama akan langsung tidak berlaku.</p>
            </div>
          </div>

          <p className="text-xs text-ink-secondary leading-relaxed">
            Semua background script atau runner Hermes di VPS yang masih menggunakan key lama akan terputus sampai Anda memperbarui tokennya.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setConfirmRegenerateOpen(false)}
              disabled={regenerating}
              className="px-4 py-2 rounded-full border border-surface-border text-xs font-semibold text-ink hover:bg-surface"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleRegenerateKey}
              disabled={regenerating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all tap-effect"
            >
              {regenerating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Key className="h-3.5 w-3.5" />}
              <span>Regenerate Sekarang</span>
            </button>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
