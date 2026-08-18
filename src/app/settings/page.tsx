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
  Lock,
  Zap,
} from 'lucide-react';
import { ModalPortal } from '@/components/ModalPortal';
import { fireRetroConfetti } from '@/lib/confetti';
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

      fireRetroConfetti(0.5, 0.5);
      addToast('Konfigurasi sistem berhasil disimpan!', 'success');
    } catch (err: any) {
      addToast(err?.message || 'Gagal menyimpan pengaturan', 'error');
    } finally {
      setSaving(false);
    }
  };

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
      fireRetroConfetti(0.5, 0.5);
      addToast('API Key baru berhasil digenerate!', 'success');
    } catch (err: any) {
      addToast(err?.message || 'Gagal meregenerasi API Key', 'error');
    } finally {
      setRegenerating(false);
    }
  };

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

      fireRetroConfetti(0.5, 0.5);
      addToast('PIN Akses Dashboard berhasil diubah!', 'success');
      setPinForm({ currentPin: '', newPin: '', confirmPin: '' });
      setShowPinFields(false);
    } catch (err: any) {
      addToast(err?.message || 'Gagal mengubah PIN', 'error');
    } finally {
      setChangingPin(false);
    }
  };

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
        fireRetroConfetti(0.5, 0.5);
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

  const handleSyncInsights = async () => {
    try {
      setSyncingInsights(true);
      setInsightSyncResult(null);

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
          token: settings.THREADS_ACCESS_TOKEN || undefined,
          userId: settings.THREADS_USER_ID || undefined,
        }),
      });

      const data = await res.json();
      setInsightSyncResult({
        isLive: !!data.isLiveSynced,
        message: data.message || (data.isLiveSynced ? 'Sinkronisasi berhasil' : 'Mode baseline aktif'),
      });

      if (data.isLiveSynced) {
        fireRetroConfetti(0.5, 0.5);
        addToast('Metrik langsung Meta Threads berhasil disinkronkan!', 'success');
      } else {
        addToast(data.message || 'Baseline metrik cerdas aktif', 'info');
      }
    } catch (err: any) {
      addToast(err?.message || 'Gagal sinkronisasi data Threads', 'error');
    } finally {
      setSyncingInsights(false);
    }
  };

  const getCodeSnippet = (): string => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const key = settings.HERMES_API_KEY || 'HERMES_API_KEY';

    if (codeLang === 'curl') {
      if (endpointTab === 'products') {
        return `curl -X GET "${origin}/api/hermes/products/active" \\\n  -H "Authorization: Bearer ${key}"`;
      }
      if (endpointTab === 'create_draft') {
        return `curl -X POST "${origin}/api/hermes/drafts" \\\n  -H "Authorization: Bearer ${key}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "title": "Promo ChatGPT Plus Autopilot",\n    "posts": [\n      { "orderIndex": 0, "content": "Mau produktif 10x lipat? 🧵👇" },\n      { "orderIndex": 1, "content": "Pakai ChatGPT Plus cuma Rp 35rb/bln." },\n      { "orderIndex": 2, "content": "Order sekarang di @${settings.STORE_USERNAME || 'tokodigital.id'}!" }\n    ]\n  }'`;
      }
      if (endpointTab === 'approved_drafts') {
        return `curl -X GET "${origin}/api/hermes/drafts/approved" \\\n  -H "Authorization: Bearer ${key}"`;
      }
      return `curl -X PATCH "${origin}/api/hermes/drafts/DRAFT_ID/status" \\\n  -H "Authorization: Bearer ${key}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "status": "PUBLISHED",\n    "threadPostId": "1234567890",\n    "threadPostUrl": "https://threads.net/@${settings.STORE_USERNAME || 'tokodigital.id'}/post/xyz"\n  }'`;
    }

    if (codeLang === 'python') {
      if (endpointTab === 'products') {
        return `import requests\n\nres = requests.get(\n    "${origin}/api/hermes/products/active",\n    headers={"Authorization": "Bearer ${key}"}\n)\nprint(res.json())`;
      }
      if (endpointTab === 'create_draft') {
        return `import requests\n\npayload = {\n    "title": "Promo Otomatis Hermes",\n    "posts": [\n        {"orderIndex": 0, "content": "Hook pembuka 🧵👇"},\n        {"orderIndex": 1, "content": "Detail penawaran produk..."},\n        {"orderIndex": 2, "content": "Order via @${settings.STORE_USERNAME || 'tokodigital.id'}"}\n    ]\n}\nres = requests.post(\n    "${origin}/api/hermes/drafts",\n    headers={"Authorization": "Bearer ${key}"},\n    json=payload\n)\nprint(res.json())`;
      }
      if (endpointTab === 'approved_drafts') {
        return `import requests\n\nres = requests.get(\n    "${origin}/api/hermes/drafts/approved",\n    headers={"Authorization": "Bearer ${key}"}\n)\nprint(res.json())`;
      }
      return `import requests\n\nres = requests.patch(\n    "${origin}/api/hermes/drafts/DRAFT_ID/status",\n    headers={"Authorization": "Bearer ${key}"},\n    json={\n        "status": "PUBLISHED",\n        "threadPostId": "1234567890",\n        "threadPostUrl": "https://threads.net/@${settings.STORE_USERNAME || 'tokodigital.id'}/post/xyz"\n    }\n)\nprint(res.json())`;
    }

    // TypeScript
    if (endpointTab === 'products') {
      return `const res = await fetch('${origin}/api/hermes/products/active', {\n  headers: { Authorization: 'Bearer ${key}' }\n});\nconst data = await res.json();\nconsole.log(data);`;
    }
    if (endpointTab === 'create_draft') {
      return `const res = await fetch('${origin}/api/hermes/drafts', {\n  method: 'POST',\n  headers: {\n    Authorization: 'Bearer ${key}',\n    'Content-Type': 'application/json'\n  },\n  body: JSON.stringify({\n    title: 'Promo Otomatis',\n    posts: [\n      { orderIndex: 0, content: 'Hook pembuka 🧵👇' },\n      { orderIndex: 1, content: 'Value paket...' },\n      { orderIndex: 2, content: 'Order di @${settings.STORE_USERNAME || 'tokodigital.id'}' }\n    ]\n  })\n});\nconst data = await res.json();\nconsole.log(data);`;
    }
    if (endpointTab === 'approved_drafts') {
      return `const res = await fetch('${origin}/api/hermes/drafts/approved', {\n  headers: { Authorization: 'Bearer ${key}' }\n});\nconst data = await res.json();\nconsole.log(data);`;
    }
    return `const res = await fetch('${origin}/api/hermes/drafts/DRAFT_ID/status', {\n  method: 'PATCH',\n  headers: {\n    Authorization: 'Bearer ${key}',\n    'Content-Type': 'application/json'\n  },\n  body: JSON.stringify({\n    status: 'PUBLISHED',\n    threadPostId: '1234567890',\n    threadPostUrl: 'https://threads.net/@${settings.STORE_USERNAME || 'tokodigital.id'}/post/xyz'\n  })\n});\nconst data = await res.json();\nconsole.log(data);`;
  };

  const handleCopySnippet = async () => {
    try {
      await navigator.clipboard.writeText(getCodeSnippet());
      setCopiedSnippet(true);
      addToast('Code snippet berhasil disalin!', 'success');
      setTimeout(() => setCopiedSnippet(false), 2000);
    } catch {
      addToast('Gagal menyalin snippet', 'error');
    }
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

      {/* Top Header */}
      <header className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 border-b-2 border-[#181816] pb-5">
        <div className="space-y-1.5 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#181816] tracking-tight flex flex-wrap items-center gap-x-2.5 gap-y-2 uppercase">
            <span>Konfigurasi</span>
            <span className="inline-flex items-center justify-center px-3 py-0.5 rounded-retro-xs bg-[#6B9AC4] border-2 border-[#181816] text-white shadow-[2px_2px_0px_0px_#181816]">
              Sistem & API
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-[#4A463F] font-semibold">
            Kelola branding toko, integrasi background scheduler Hermes, Meta Threads Graph API, dan keamanan dashboard.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => handleSaveAll()}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-retro-xs bg-[#C95D53] hover:bg-[#D45D52] text-white font-black text-xs border-2 border-[#181816] shadow-[3px_3px_0px_0px_#181816] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none transition-all tap-effect disabled:opacity-50 uppercase tracking-wider"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin stroke-[2.5]" /> : <Save className="h-4 w-4 stroke-[2.5]" />}
            <span>{saving ? 'Menyimpan...' : 'Simpan Semua Perubahan'}</span>
          </button>
        </div>
      </header>

      {/* 2-Column Bento Grid: Left Settings Cards + Right Code Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Settings Cards */}
        <div className="lg:col-span-7 space-y-6">
          {/* Bento Card 1: Store Branding Profile */}
          <div className="rounded-retro-sm border-[2.5px] border-[#181816] bg-white p-6 space-y-4 shadow-[4px_4px_0px_0px_#181816]">
            <div className="flex items-center gap-2.5 border-b-2 border-[#181816] pb-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-retro-xs bg-[#D8C49D] text-[#181816] border-2 border-[#181816] shadow-[1.5px_1.5px_0px_0px_#181816]">
                <Store className="h-4 w-4 stroke-[2.5]" />
              </span>
              <div>
                <h2 className="text-sm font-black text-[#181816] tracking-tight uppercase">
                  Profil & Branding Toko
                </h2>
                <p className="text-[11px] text-[#7A7468] font-medium">
                  Identitas toko yang disisipkan Hermes AI pada CTA dan instruksi pemesanan Threads.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-[#181816] mb-1.5 uppercase tracking-wider">
                  Nama Toko / Brand
                </label>
                <input
                  type="text"
                  value={settings.STORE_NAME}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, STORE_NAME: e.target.value }))
                  }
                  placeholder="e.g. Toko Digital ID"
                  className="w-full rounded-retro-xs bg-[#FAF6EE] border-2 border-[#181816] px-4 py-2 text-xs text-[#181816] font-bold shadow-[2px_2px_0px_0px_#181816] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#181816] mb-1.5 uppercase tracking-wider">
                  Handle / Username Threads
                </label>
                <input
                  type="text"
                  value={settings.STORE_USERNAME}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, STORE_USERNAME: e.target.value }))
                  }
                  placeholder="e.g. tokodigital.id"
                  className="w-full rounded-retro-xs bg-[#FAF6EE] border-2 border-[#181816] px-4 py-2 text-xs text-[#181816] font-bold shadow-[2px_2px_0px_0px_#181816] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-[#181816] mb-1.5 uppercase tracking-wider">
                URL Avatar Toko (Opsional)
              </label>
              <input
                type="url"
                value={settings.STORE_AVATAR_URL}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, STORE_AVATAR_URL: e.target.value }))
                }
                placeholder="https://example.com/avatar.jpg"
                className="w-full rounded-retro-xs bg-[#FAF6EE] border-2 border-[#181816] px-4 py-2 text-xs text-[#181816] font-mono shadow-[2px_2px_0px_0px_#181816] focus:outline-none"
              />
            </div>
          </div>

          {/* Bento Card 2: Hermes Autonomous Agent Gateway */}
          <div className="rounded-retro-sm border-[2.5px] border-[#181816] bg-white p-6 space-y-4 shadow-[4px_4px_0px_0px_#181816]">
            <div className="flex items-center gap-2.5 border-b-2 border-[#181816] pb-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-retro-xs bg-[#6B9AC4] text-white border-2 border-[#181816] shadow-[1.5px_1.5px_0px_0px_#181816]">
                <Zap className="h-4 w-4 fill-white stroke-[2.5]" />
              </span>
              <div>
                <h2 className="text-sm font-black text-[#181816] tracking-tight uppercase">
                  Hermes Autonomous API Key
                </h2>
                <p className="text-[11px] text-[#7A7468] font-medium">
                  Kunci otentikasi Bearer Token untuk script background scheduler Hermes di VPS.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-[#181816] mb-1.5 uppercase tracking-wider">
                  HERMES_API_KEY (Bearer Secret)
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={settings.HERMES_API_KEY}
                    readOnly
                    className="w-full rounded-retro-xs bg-[#FAF6EE] border-2 border-[#181816] pl-4 pr-24 py-2 text-xs text-[#181816] font-mono font-black shadow-[2px_2px_0px_0px_#181816] select-all focus:outline-none"
                  />
                  <div className="absolute right-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="p-1 rounded-retro-xs text-[#181816] hover:bg-zinc-200"
                      title={showKey ? 'Sembunyikan' : 'Tampilkan'}
                    >
                      {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyApiKey}
                      className="p-1 rounded-retro-xs bg-white hover:bg-[#FAF6EE] text-[#181816] border border-[#181816] shadow-[1px_1px_0px_0px_#181816]"
                      title="Salin API Key"
                    >
                      {copiedKey ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <Copy className="h-3.5 w-3.5 stroke-[2.5]" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmRegenerateOpen(true)}
                  className="text-xs font-black text-[#C95D53] hover:underline uppercase tracking-wider"
                >
                  Regenerate API Key Baru
                </button>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-retro-xs bg-white hover:bg-[#FAF6EE] text-[#181816] text-xs font-black border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all tap-effect uppercase tracking-wider"
                >
                  {testing ? <RefreshCw className="h-3.5 w-3.5 animate-spin stroke-[2.5]" /> : <Radio className="h-3.5 w-3.5 text-emerald-600 stroke-[2.5]" />}
                  <span>Uji Koneksi API</span>
                </button>
              </div>

              {testResult && (
                <div
                  className={cn(
                    'rounded-retro-xs p-3.5 border-2 border-[#181816] text-xs font-mono space-y-1 shadow-[2px_2px_0px_0px_#181816] animate-scale-in',
                    testResult.status === 200
                      ? 'bg-[#6B9AC4] text-white'
                      : 'bg-rose-100 text-[#C95D53]'
                  )}
                >
                  <div className="flex items-center justify-between font-black">
                    <span>Status: HTTP {testResult.status} ({testResult.statusText})</span>
                    <span>{testResult.latencyMs}ms</span>
                  </div>
                  {testResult.error && <p className="text-[11px] font-bold">{testResult.error}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Bento Card 3: Threads Graph API Token */}
          <div className="rounded-retro-sm border-[2.5px] border-[#181816] bg-white p-6 space-y-4 shadow-[4px_4px_0px_0px_#181816]">
            <div className="flex items-center gap-2.5 border-b-2 border-[#181816] pb-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-retro-xs bg-[#D8C49D] text-[#181816] border-2 border-[#181816] shadow-[1.5px_1.5px_0px_0px_#181816] font-black">
                @
              </span>
              <div>
                <h2 className="text-sm font-black text-[#181816] tracking-tight uppercase">
                  Meta Threads Graph API
                </h2>
                <p className="text-[11px] text-[#7A7468] font-medium">
                  Token akses resmi untuk auto-publishing langsung ke platform Threads Meta.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-[#181816] mb-1.5 uppercase tracking-wider">
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
                    className="w-full rounded-retro-xs bg-[#FAF6EE] border-2 border-[#181816] pl-4 pr-12 py-2 text-xs text-[#181816] font-mono shadow-[2px_2px_0px_0px_#181816] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowThreadsToken(!showThreadsToken)}
                    className="absolute right-3 p-1 text-zinc-500 hover:text-black"
                  >
                    {showThreadsToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-[#181816] mb-1.5 uppercase tracking-wider">
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
                  className="w-full rounded-retro-xs bg-[#FAF6EE] border-2 border-[#181816] px-4 py-2 text-xs text-[#181816] font-mono shadow-[2px_2px_0px_0px_#181816] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-bold text-[#7A7468]">
                  {settings.THREADS_ACCESS_TOKEN ? 'Token terisi' : 'Mode Baseline Aktif'}
                </span>

                <button
                  type="button"
                  onClick={handleSyncInsights}
                  disabled={syncingInsights}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-retro-xs bg-white hover:bg-[#FAF6EE] text-[#181816] text-xs font-black border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all tap-effect disabled:opacity-50 uppercase tracking-wider"
                >
                  <RefreshCw className={cn('h-3.5 w-3.5 stroke-[2.5]', syncingInsights && 'animate-spin')} />
                  <span>Sync Insights</span>
                </button>
              </div>

              {insightSyncResult && (
                <div
                  className={cn(
                    'rounded-retro-xs p-3.5 border-2 border-[#181816] text-xs space-y-1 shadow-[2px_2px_0px_0px_#181816] animate-scale-in',
                    insightSyncResult.isLive
                      ? 'bg-[#6B9AC4] text-white'
                      : 'bg-[#D8C49D] text-[#181816]'
                  )}
                >
                  <div className="flex items-center gap-1.5 font-black">
                    {insightSyncResult.isLive ? (
                      <CheckCircle2 className="h-3.5 w-3.5 stroke-[3]" />
                    ) : (
                      <Zap className="h-3.5 w-3.5 fill-[#181816]" />
                    )}
                    <span>{insightSyncResult.isLive ? 'Meta Live Connected' : 'Hermes Baseline Active'}</span>
                  </div>
                  <p className="text-[11px] font-medium">{insightSyncResult.message}</p>
                </div>
              )}
            </div>
          </div>

          {/* Bento Card 4: Security & PIN Management */}
          <div className="rounded-retro-sm border-[2.5px] border-[#181816] bg-white p-6 space-y-4 shadow-[4px_4px_0px_0px_#181816]">
            <div className="flex items-center gap-2.5 border-b-2 border-[#181816] pb-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-retro-xs bg-[#C95D53] text-white border-2 border-[#181816] shadow-[1.5px_1.5px_0px_0px_#181816]">
                <Lock className="h-4 w-4 stroke-[2.5]" />
              </span>
              <div>
                <h2 className="text-sm font-black text-[#181816] tracking-tight uppercase">
                  Keamanan & PIN Akses
                </h2>
                <p className="text-[11px] text-[#7A7468] font-medium">
                  PIN 6-digit untuk mengunci dashboard admin dari akses publik.
                </p>
              </div>
            </div>

            {!showPinFields ? (
              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <span className="text-xs font-black text-[#181816]">PIN Akses Aktif</span>
                  <p className="text-[11px] text-[#7A7468] font-medium">Terproteksi dengan SHA-256 session cookie.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPinFields(true)}
                  className="px-4 py-2 rounded-retro-xs bg-white hover:bg-[#FAF6EE] text-[#181816] text-xs font-black border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all tap-effect uppercase tracking-wider"
                >
                  Ganti PIN
                </button>
              </div>
            ) : (
              <form onSubmit={handleChangePin} className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] font-black text-[#181816] mb-1 uppercase">
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
                    className="w-full rounded-retro-xs bg-[#FAF6EE] border-2 border-[#181816] px-4 py-1.5 text-xs text-[#181816] font-mono text-center font-black shadow-[2px_2px_0px_0px_#181816] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-black text-[#181816] mb-1 uppercase">
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
                      className="w-full rounded-retro-xs bg-[#FAF6EE] border-2 border-[#181816] px-4 py-1.5 text-xs text-[#181816] font-mono text-center font-black shadow-[2px_2px_0px_0px_#181816] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-[#181816] mb-1 uppercase">
                      Konfirmasi PIN
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      value={pinForm.confirmPin}
                      onChange={(e) =>
                        setPinForm((p) => ({ ...p, confirmPin: e.target.value.replace(/\D/g, '') }))
                      }
                      placeholder="******"
                      className="w-full rounded-retro-xs bg-[#FAF6EE] border-2 border-[#181816] px-4 py-1.5 text-xs text-[#181816] font-mono text-center font-black shadow-[2px_2px_0px_0px_#181816] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPinFields(false)}
                    className="px-3 py-1.5 text-xs font-bold text-[#181816] hover:underline uppercase"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={changingPin}
                    className="px-4 py-1.5 rounded-retro-xs bg-[#C95D53] hover:bg-[#D45D52] text-white text-xs font-black border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all uppercase tracking-wider"
                  >
                    {changingPin ? 'Menyimpan...' : 'Simpan PIN Baru'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Code Snippet & CLI Sandbox */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-retro-sm border-[2.5px] border-[#181816] bg-[#FAF6EE] text-[#181816] p-6 space-y-4 shadow-[5px_5px_0px_0px_#181816]">
            <div className="flex items-center justify-between border-b-2 border-[#181816] pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-[#181816]" />
                <span className="text-xs font-black tracking-wider uppercase text-[#181816]">
                  API Code Generator
                </span>
              </div>

              {/* Language Switcher */}
              <div className="flex items-center rounded-retro-xs bg-white p-0.5 border-2 border-[#181816] shadow-[1px_1px_0px_0px_#181816]">
                {(['curl', 'python', 'typescript'] as CodeLang[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setCodeLang(lang)}
                    className={cn(
                      'px-2.5 py-0.5 rounded-none text-[11px] font-black transition-all uppercase',
                      codeLang === lang
                        ? 'bg-[#6B9AC4] text-white shadow-[1px_1px_0px_0px_#181816]'
                        : 'text-[#181816] hover:bg-[#FAF6EE]'
                    )}
                  >
                    {lang === 'typescript' ? 'TS' : lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Endpoint Tabs */}
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'products', label: '1. GET Products' },
                { id: 'create_draft', label: '2. POST Drafts' },
                { id: 'approved_drafts', label: '3. GET Approved' },
                { id: 'update_status', label: '4. PATCH Published' },
              ].map((ep) => (
                <button
                  key={ep.id}
                  type="button"
                  onClick={() => setEndpointTab(ep.id as EndpointTab)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-retro-xs text-[11px] font-mono text-left border-2 border-[#181816] transition-all truncate shadow-[1.5px_1.5px_0px_0px_#181816]',
                    endpointTab === ep.id
                      ? 'bg-[#D8C49D] text-[#181816] font-black'
                      : 'bg-white text-[#181816] hover:bg-[#FAF6EE]'
                  )}
                >
                  {ep.label}
                </button>
              ))}
            </div>

            {/* Code Block Container */}
            <div className="relative rounded-retro-xs bg-white p-4 border-2 border-[#181816] font-mono text-xs text-[#181816] overflow-x-auto leading-relaxed max-h-[300px] shadow-[2px_2px_0px_0px_#181816]">
              <pre>{getCodeSnippet()}</pre>
            </div>

            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopySnippet}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-retro-xs bg-[#6B9AC4] hover:bg-[#5386B4] text-white text-xs font-black border-2 border-[#181816] shadow-[2.5px_2.5px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all uppercase tracking-wider"
            >
              {copiedSnippet ? (
                <>
                  <Check className="h-4 w-4 stroke-[3]" />
                  <span>Snippet Berhasil Disalin!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 stroke-[2.5]" />
                  <span>Salin Kode Snippet</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Confirm Regenerate Key Modal */}
      <ModalPortal
        isOpen={confirmRegenerateOpen}
        onClose={() => setConfirmRegenerateOpen(false)}
        maxWidth="sm"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-retro-xs bg-rose-100 text-[#C95D53] border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816]">
              <Key className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-sm font-black text-[#181816] uppercase">Regenerate API Key?</h3>
              <p className="text-xs text-[#7A7468] font-medium">Script lama di VPS tidak akan berfungsi.</p>
            </div>
          </div>

          <p className="text-xs text-[#4A463F] bg-[#FAF6EE] p-3 rounded-retro-xs border-2 border-[#181816] font-semibold leading-relaxed">
            API Key yang lama akan langsung hangus. Anda harus memperbarui konfigurasi di background runner Hermes.
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setConfirmRegenerateOpen(false)}
              disabled={regenerating}
              className="px-4 py-2 rounded-retro-xs border-2 border-[#181816] text-xs font-bold text-[#181816] hover:bg-white shadow-[2px_2px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all uppercase tracking-wider"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleRegenerateKey}
              disabled={regenerating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-retro-xs bg-[#C95D53] hover:bg-[#D45D52] text-white text-xs font-black border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all uppercase tracking-wider"
            >
              {regenerating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Key className="h-3.5 w-3.5" />}
              <span>Generate Baru</span>
            </button>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
