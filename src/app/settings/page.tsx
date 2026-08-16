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
  ExternalLink,
  ShieldCheck,
  Send,
  Sliders,
  Terminal,
  Zap,
  X,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsState {
  HERMES_API_KEY: string;
  STORE_NAME: string;
  STORE_USERNAME: string;
  STORE_AVATAR_URL: string;
  DEFAULT_SCHEDULE_DELAY_MINS: string;
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
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [confirmRegenerateOpen, setConfirmRegenerateOpen] = useState(false);

  // Test Connection
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

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

  // Fetch settings on mount
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings({
          HERMES_API_KEY: data.settings.HERMES_API_KEY || 'hermes-secret-key-2026',
          STORE_NAME: data.settings.STORE_NAME || 'Digital Store ID',
          STORE_USERNAME: data.settings.STORE_USERNAME || 'tokodigital.id',
          STORE_AVATAR_URL: data.settings.STORE_AVATAR_URL || '',
          DEFAULT_SCHEDULE_DELAY_MINS: data.settings.DEFAULT_SCHEDULE_DELAY_MINS || '30',
        });
      } else {
        throw new Error(data.error || 'Gagal memuat pengaturan');
      }
    } catch (err: any) {
      addToast(err?.message || 'Gagal memuat konfigurasi', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Save Settings
  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyimpan pengaturan');
      }

      addToast('Pengaturan sistem berhasil disimpan!', 'success');
    } catch (err: any) {
      addToast(err?.message || 'Gagal menyimpan pengaturan', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Regenerate API Key
  const handleRegenerateKey = async () => {
    try {
      setRegenerating(true);
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate-key' }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal meregenerasi key');
      }

      setSettings((prev) => ({ ...prev, HERMES_API_KEY: data.apiKey }));
      setConfirmRegenerateOpen(false);
      addToast('API Key Hermes baru berhasil digenerate & disimpan!', 'success');
    } catch (err: any) {
      addToast(err?.message || 'Gagal meregenerasi API key', 'error');
    } finally {
      setRegenerating(false);
    }
  };

  // Change Dashboard Access PIN
  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinForm.currentPin) {
      addToast('Masukkan PIN saat ini', 'error');
      return;
    }
    if (pinForm.newPin.length !== 6 || !/^\d{6}$/.test(pinForm.newPin)) {
      addToast('PIN baru harus terdiri dari 6 digit angka', 'error');
      return;
    }
    if (pinForm.newPin !== pinForm.confirmPin) {
      addToast('Konfirmasi PIN baru tidak cocok', 'error');
      return;
    }

    try {
      setChangingPin(true);
      const res = await fetch('/api/auth/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pinForm),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengubah PIN');
      }

      addToast('PIN Akses Dashboard berhasil diperbarui!', 'success');
      setPinForm({ currentPin: '', newPin: '', confirmPin: '' });
    } catch (err: any) {
      addToast(err?.message || 'Gagal mengubah PIN', 'error');
    } finally {
      setChangingPin(false);
    }
  };

  // Live Test Connection
  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      const start = performance.now();

      const res = await fetch('/api/hermes/products/active', {
        headers: {
          Authorization: `Bearer ${settings.HERMES_API_KEY}`,
        },
      });

      const latencyMs = Math.round(performance.now() - start);
      const data = await res.json();

      setTestResult({
        status: res.status,
        statusText: res.statusText,
        latencyMs,
        data,
      });

      if (res.ok && data.success) {
        addToast(`Koneksi Hermes Berhasil! Latency: ${latencyMs}ms`, 'success');
      } else {
        addToast(`Koneksi Gagal (HTTP ${res.status}): ${data.error || 'Unauthorized'}`, 'error');
      }
    } catch (err: any) {
      setTestResult({
        status: 500,
        statusText: 'Fetch Error',
        latencyMs: 0,
        data: null,
        error: err?.message || 'Network error',
      });
      addToast(err?.message || 'Gagal melakukan tes koneksi', 'error');
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = (text: string, isSnippet = false) => {
    navigator.clipboard.writeText(text);
    if (isSnippet) {
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
      addToast('Kode cuplikan disalin ke clipboard!', 'info');
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
      addToast('API Key disalin ke clipboard!', 'info');
    }
  };

  // Dynamic Base URL
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const currentKey = settings.HERMES_API_KEY || 'hermes-secret-key-2026';

  // Generate Snippets
  const getSnippets = () => {
    if (endpointTab === 'products') {
      return {
        curl: `curl -X GET "${origin}/api/hermes/products/active" \\
  -H "Authorization: Bearer ${currentKey}" \\
  -H "Content-Type: application/json"`,
        python: `import requests

url = "${origin}/api/hermes/products/active"
headers = {
    "Authorization": "Bearer ${currentKey}",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
print(response.json())`,
        typescript: `const response = await fetch("${origin}/api/hermes/products/active", {
  method: "GET",
  headers: {
    "Authorization": "Bearer ${currentKey}",
    "Content-Type": "application/json"
  }
});
const data = await response.json();
console.log(data);`,
      };
    }

    if (endpointTab === 'create_draft') {
      return {
        curl: `curl -X POST "${origin}/api/hermes/drafts" \\
  -H "Authorization: Bearer ${currentKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "productId": "optional_product_id",
    "title": "Trik Nonton Netflix 4K Legal 35rb",
    "type": "THREAD_CHAIN",
    "hookAngle": "Cost Comparison",
    "posts": [
      { "orderIndex": 0, "content": "Capek bayar 186rb sendirian? Ini trik nonton 4K cuma 35rb 🧵👇" },
      { "orderIndex": 1, "content": "Pakai sharing resmi bergaransi 30 hari penuh, PIN profil pribadi." },
      { "orderIndex": 2, "content": "Order via link di bio sekarang juga!" }
    ],
    "metadata": { "model": "hermes-3-70b" }
  }'`,
        python: `import requests

url = "${origin}/api/hermes/drafts"
headers = {
    "Authorization": "Bearer ${currentKey}",
    "Content-Type": "application/json"
}
payload = {
    "productId": None,
    "title": "Trik Nonton Netflix 4K Legal 35rb",
    "type": "THREAD_CHAIN",
    "hookAngle": "Cost Comparison",
    "posts": [
        {"orderIndex": 0, "content": "Capek bayar 186rb sendirian? Ini trik nonton 4K cuma 35rb 🧵👇"},
        {"orderIndex": 1, "content": "Pakai sharing resmi bergaransi 30 hari penuh, PIN profil pribadi."},
        {"orderIndex": 2, "content": "Order via link di bio sekarang juga!"}
    ],
    "metadata": {"model": "hermes-3-70b"}
}

response = requests.post(url, headers=headers, json=payload)
print(response.json())`,
        typescript: `const payload = {
  productId: undefined,
  title: "Trik Nonton Netflix 4K Legal 35rb",
  type: "THREAD_CHAIN",
  hookAngle: "Cost Comparison",
  posts: [
    { orderIndex: 0, content: "Capek bayar 186rb sendirian? Ini trik nonton 4K cuma 35rb 🧵👇" },
    { orderIndex: 1, content: "Pakai sharing resmi bergaransi 30 hari penuh, PIN profil pribadi." },
    { orderIndex: 2, content: "Order via link di bio sekarang juga!" }
  ],
  metadata: { model: "hermes-3-70b" }
};

const response = await fetch("${origin}/api/hermes/drafts", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${currentKey}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
});
const data = await response.json();
console.log(data);`,
      };
    }

    if (endpointTab === 'approved_drafts') {
      return {
        curl: `curl -X GET "${origin}/api/hermes/drafts/approved" \\
  -H "Authorization: Bearer ${currentKey}" \\
  -H "Content-Type: application/json"`,
        python: `import requests

url = "${origin}/api/hermes/drafts/approved"
headers = {
    "Authorization": "Bearer ${currentKey}",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
print(response.json())`,
        typescript: `const response = await fetch("${origin}/api/hermes/drafts/approved", {
  method: "GET",
  headers: {
    "Authorization": "Bearer ${currentKey}",
    "Content-Type": "application/json"
  }
});
const data = await response.json();
console.log(data);`,
      };
    }

    // update_status
    return {
      curl: `curl -X PATCH "${origin}/api/hermes/drafts/<DRAFT_ID>/status" \\
  -H "Authorization: Bearer ${currentKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "status": "PUBLISHED",
    "threadPostId": "threads_post_12345",
    "threadPostUrl": "https://threads.net/@tokodigital.id/post/12345"
  }'`,
      python: `import requests

draft_id = "target_draft_id_here"
url = f"${origin}/api/hermes/drafts/{draft_id}/status"
headers = {
    "Authorization": "Bearer ${currentKey}",
    "Content-Type": "application/json"
}
payload = {
    "status": "PUBLISHED",
    "threadPostId": "threads_post_12345",
    "threadPostUrl": "https://threads.net/@tokodigital.id/post/12345"
}

response = requests.patch(url, headers=headers, json=payload)
print(response.json())`,
      typescript: `const draftId = "target_draft_id_here";
const payload = {
  status: "PUBLISHED",
  threadPostId: "threads_post_12345",
  threadPostUrl: "https://threads.net/@tokodigital.id/post/12345"
};

const response = await fetch(\`${origin}/api/hermes/drafts/\${draftId}/status\`, {
  method: "PATCH",
  headers: {
    "Authorization": "Bearer ${currentKey}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
});
const data = await response.json();
console.log(data);`,
    };
  };

  const snippets = getSnippets();
  const currentSnippet = snippets[codeLang];

  return (
    <div className="min-h-screen bg-threads-bg pb-16">
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-center justify-between rounded-xl border p-4 shadow-xl backdrop-blur-md transition-all duration-300',
              toast.type === 'success' && 'border-emerald-500/40 bg-zinc-900/95 text-emerald-400',
              toast.type === 'error' && 'border-rose-500/40 bg-zinc-900/95 text-rose-400',
              toast.type === 'info' && 'border-threads-border bg-zinc-900/95 text-threads-text'
            )}
          >
            <div className="flex items-center space-x-2.5 text-xs font-medium">
              {toast.type === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
              {toast.type === 'error' && <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />}
              {toast.type === 'info' && <Sparkles className="h-4 w-4 shrink-0 text-threads-accent" />}
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-3 text-threads-secondary hover:text-threads-text"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Header */}
        <div className="border-b border-threads-border pb-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-threads-surface border border-threads-border text-threads-accent shadow-sm">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-threads-text">
                Pengaturan Sistem & Hermes API
              </h1>
              <p className="text-xs text-threads-secondary mt-0.5">
                Konfigurasi otentikasi API Key Hermes Agent, identitas toko digital, dan alat uji konektivitas REST API.
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: Hermes API Authentication */}
        <div className="rounded-2xl border border-threads-border bg-threads-card p-6 space-y-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Key className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-threads-text">
                  Hermes Agent API Authentication
                </h2>
                <p className="text-xs text-threads-secondary">
                  API Key ini digunakan oleh Hermes Agent (Python / TypeScript Runner) untuk otentikasi Bearer token.
                </p>
              </div>
            </div>

            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
              <ShieldCheck className="h-3 w-3" />
              Auth Enforced
            </span>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-medium text-threads-secondary">
              Active Hermes API Key
            </label>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={settings.HERMES_API_KEY}
                  onChange={(e) => setSettings({ ...settings, HERMES_API_KEY: e.target.value })}
                  placeholder="hermes-secret-key-..."
                  className="w-full rounded-xl border border-threads-border bg-threads-surface px-3.5 py-2.5 pr-10 font-mono text-xs text-threads-text focus:border-threads-accent focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-threads-secondary hover:text-threads-text"
                  title={showKey ? 'Sembunyikan Key' : 'Tampilkan Key'}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(settings.HERMES_API_KEY)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-threads-border bg-threads-surface px-3.5 py-2.5 text-xs font-medium text-threads-text hover:bg-threads-border transition-colors"
                >
                  {copiedKey ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-zinc-400" />}
                  <span>{copiedKey ? 'Disalin' : 'Salin Key'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmRegenerateOpen(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Regenerate Key</span>
                </button>
              </div>
            </div>
            <p className="text-[11px] text-zinc-400">
              Header format: <code className="text-sky-400 bg-threads-surface px-1.5 py-0.5 rounded border border-threads-border font-mono">Authorization: Bearer &lt;KEY&gt;</code> atau <code className="text-sky-400 bg-threads-surface px-1.5 py-0.5 rounded border border-threads-border font-mono">x-api-key: &lt;KEY&gt;</code>
            </p>
          </div>
        </div>

        {/* Section 2: Security & PIN Management */}
        <form onSubmit={handleChangePin} className="rounded-2xl border border-threads-border bg-threads-card p-6 space-y-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-threads-text">
                  Keamanan & PIN Akses Dashboard
                </h2>
                <p className="text-xs text-threads-secondary">
                  Kelola 6-digit PIN untuk mengamankan akses ke seluruh dashboard Threads Engine.
                </p>
              </div>
            </div>

            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
              <ShieldCheck className="h-3 w-3" />
              6-Digit Protected
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Current PIN */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-threads-secondary">
                PIN Saat Ini
              </label>
              <div className="relative">
                <input
                  type={showPinFields ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={pinForm.currentPin}
                  onChange={(e) =>
                    setPinForm((prev) => ({
                      ...prev,
                      currentPin: e.target.value.replace(/\D/g, '').slice(0, 6),
                    }))
                  }
                  placeholder="••••••"
                  className="w-full rounded-xl border border-threads-border bg-threads-surface px-3.5 py-2.5 font-mono text-xs text-threads-text tracking-widest focus:border-threads-accent focus:outline-none"
                  required
                />
              </div>
              <p className="text-[11px] text-zinc-500">PIN default awal: 123456</p>
            </div>

            {/* New PIN */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-threads-secondary">
                PIN Baru
              </label>
              <div className="relative">
                <input
                  type={showPinFields ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={pinForm.newPin}
                  onChange={(e) =>
                    setPinForm((prev) => ({
                      ...prev,
                      newPin: e.target.value.replace(/\D/g, '').slice(0, 6),
                    }))
                  }
                  placeholder="••••••"
                  className="w-full rounded-xl border border-threads-border bg-threads-surface px-3.5 py-2.5 font-mono text-xs text-threads-text tracking-widest focus:border-threads-accent focus:outline-none"
                  required
                />
              </div>
              <p className="text-[11px] text-zinc-500">Wajib 6 digit angka (0-9)</p>
            </div>

            {/* Confirm New PIN */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-threads-secondary">
                Konfirmasi PIN Baru
              </label>
              <div className="relative">
                <input
                  type={showPinFields ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={pinForm.confirmPin}
                  onChange={(e) =>
                    setPinForm((prev) => ({
                      ...prev,
                      confirmPin: e.target.value.replace(/\D/g, '').slice(0, 6),
                    }))
                  }
                  placeholder="••••••"
                  className={cn(
                    'w-full rounded-xl border bg-threads-surface px-3.5 py-2.5 font-mono text-xs text-threads-text tracking-widest focus:outline-none transition-colors',
                    pinForm.confirmPin.length > 0 && pinForm.newPin === pinForm.confirmPin && pinForm.newPin.length === 6
                      ? 'border-emerald-500/80 focus:border-emerald-500'
                      : pinForm.confirmPin.length > 0 && pinForm.newPin !== pinForm.confirmPin
                      ? 'border-rose-500/80 focus:border-rose-500'
                      : 'border-threads-border focus:border-threads-accent'
                  )}
                  required
                />
              </div>
              {pinForm.confirmPin.length > 0 ? (
                <p
                  className={cn(
                    'text-[11px] font-medium flex items-center gap-1',
                    pinForm.newPin === pinForm.confirmPin && pinForm.newPin.length === 6
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  )}
                >
                  {pinForm.newPin === pinForm.confirmPin && pinForm.newPin.length === 6 ? (
                    <>
                      <Check className="h-3 w-3" />
                      <span>PIN baru cocok</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3" />
                      <span>PIN belum cocok</span>
                    </>
                  )}
                </p>
              ) : (
                <p className="text-[11px] text-zinc-500">Ulangi PIN baru di atas</p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 border-t border-threads-border/60">
            <button
              type="button"
              onClick={() => setShowPinFields((prev) => !prev)}
              className="flex items-center gap-1.5 text-xs text-threads-secondary hover:text-threads-text transition-colors self-start sm:self-auto"
            >
              {showPinFields ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              <span>{showPinFields ? 'Sembunyikan Digit PIN' : 'Tampilkan Digit PIN'}</span>
            </button>

            <button
              type="submit"
              disabled={
                changingPin ||
                !pinForm.currentPin ||
                pinForm.newPin.length !== 6 ||
                pinForm.newPin !== pinForm.confirmPin
              }
              className="flex items-center justify-center gap-1.5 rounded-xl bg-threads-accent px-4 py-2 text-xs font-semibold text-white shadow-md shadow-threads-accent/20 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {changingPin ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Lock className="h-3.5 w-3.5" />
              )}
              <span>{changingPin ? 'Memperbarui PIN...' : 'Perbarui PIN Akses'}</span>
            </button>
          </div>
        </form>

        {/* Section 3: Store Profile Configuration */}
        <form onSubmit={handleSaveSettings} className="rounded-2xl border border-threads-border bg-threads-card p-6 space-y-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Store className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-threads-text">
                Profil Toko Digital
              </h2>
              <p className="text-xs text-threads-secondary">
                Informasi identitas akun Threads toko Anda untuk disematkan pada CTA dan template copy otomatis.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-threads-secondary">
                Nama Brand / Toko
              </label>
              <input
                type="text"
                value={settings.STORE_NAME}
                onChange={(e) => setSettings({ ...settings, STORE_NAME: e.target.value })}
                placeholder="Digital Store ID"
                className="w-full rounded-xl border border-threads-border bg-threads-surface px-3.5 py-2 text-xs text-threads-text focus:border-threads-accent focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-threads-secondary">
                Username Akun Threads
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-threads-secondary text-xs">@</span>
                <input
                  type="text"
                  value={settings.STORE_USERNAME.replace(/^@/, '')}
                  onChange={(e) => setSettings({ ...settings, STORE_USERNAME: e.target.value.replace(/^@/, '') })}
                  placeholder="tokodigital.id"
                  className="w-full rounded-xl border border-threads-border bg-threads-surface pl-8 pr-3.5 py-2 text-xs text-threads-text focus:border-threads-accent focus:outline-none"
                />
              </div>
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-xs font-medium text-threads-secondary">
                URL Foto Profil / Logo Toko (Opsional)
              </label>
              <input
                type="url"
                value={settings.STORE_AVATAR_URL}
                onChange={(e) => setSettings({ ...settings, STORE_AVATAR_URL: e.target.value })}
                placeholder="https://example.com/logo.png"
                className="w-full rounded-xl border border-threads-border bg-threads-surface px-3.5 py-2 text-xs text-threads-text focus:border-threads-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl bg-threads-accent px-4 py-2 text-xs font-semibold text-white shadow-md shadow-threads-accent/20 hover:opacity-90 transition-all disabled:opacity-50"
            >
              {saving ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>Simpan Pengaturan</span>
            </button>
          </div>
        </form>

        {/* Section 4: Interactive Live Connection Tester */}
        <div className="rounded-2xl border border-threads-border bg-threads-card p-6 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-threads-text">
                  Live Endpoint Connection Tester
                </h2>
                <p className="text-xs text-threads-secondary">
                  Uji konektivitas otentikasi secara langsung ke endpoint <code className="text-sky-400">/api/hermes/products/active</code>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition-all disabled:opacity-50 active:scale-95"
            >
              {testing ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Radio className="h-3.5 w-3.5" />
              )}
              <span>{testing ? 'Menguji...' : 'Test Connection'}</span>
            </button>
          </div>

          {/* Test Result Display */}
          {testResult && (
            <div className="rounded-xl border border-threads-border bg-threads-bg p-4 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'rounded-md px-2 py-0.5 text-[11px] font-semibold',
                      testResult.status === 200
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    )}
                  >
                    HTTP {testResult.status} {testResult.statusText}
                  </span>
                  <span className="text-threads-secondary text-[11px]">
                    Latency: <strong className="text-threads-text">{testResult.latencyMs}ms</strong>
                  </span>
                </div>
                <span className="text-[11px] text-zinc-500">
                  Endpoint: /api/hermes/products/active
                </span>
              </div>

              <div className="max-h-56 overflow-y-auto rounded-lg bg-black/40 p-3 text-[11px] text-zinc-300 whitespace-pre-wrap">
                {JSON.stringify(testResult.data || { error: testResult.error }, null, 2)}
              </div>
            </div>
          )}
        </div>

        {/* Section 5: Dynamic Code Snippets & API Explorer */}
        <div className="rounded-2xl border border-threads-border bg-threads-card p-6 space-y-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Code2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-threads-text">
                Hermes API Explorer & Code Snippets
              </h2>
              <p className="text-xs text-threads-secondary">
                Salin cuplikan kode siap pakai dengan injeksi otomatis API Key aktif untuk skrip Python, TS, atau curl.
              </p>
            </div>
          </div>

          {/* Endpoint Tabs */}
          <div className="flex overflow-x-auto gap-2 border-b border-threads-border pb-2 scrollbar-none">
            {[
              { id: 'products', label: '1. GET Produk Aktif' },
              { id: 'create_draft', label: '2. POST Generate Draft' },
              { id: 'approved_drafts', label: '3. GET Draft Approved' },
              { id: 'update_status', label: '4. PATCH Publish Status' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setEndpointTab(tab.id as EndpointTab)}
                className={cn(
                  'whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all',
                  endpointTab === tab.id
                    ? 'bg-threads-surface border border-threads-border text-threads-text font-semibold shadow-sm'
                    : 'text-threads-secondary hover:text-threads-text'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Code Viewer */}
          <div className="rounded-xl border border-threads-border bg-black/60 overflow-hidden">
            <div className="flex items-center justify-between border-b border-threads-border bg-threads-surface/80 px-4 py-2">
              <div className="flex items-center gap-1.5">
                {(['curl', 'python', 'typescript'] as CodeLang[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setCodeLang(lang)}
                    className={cn(
                      'rounded-lg px-2.5 py-1 text-[11px] font-mono transition-colors',
                      codeLang === lang
                        ? 'bg-threads-accent text-white font-semibold'
                        : 'text-threads-secondary hover:text-threads-text'
                    )}
                  >
                    {lang === 'typescript' ? 'TypeScript / Node' : lang.toUpperCase()}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => copyToClipboard(currentSnippet, true)}
                className="flex items-center gap-1 text-[11px] font-medium text-threads-secondary hover:text-threads-text"
              >
                {copiedSnippet ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedSnippet ? 'Tersalin!' : 'Copy Snippet'}</span>
              </button>
            </div>

            <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed">
              <code>{currentSnippet}</code>
            </pre>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Regenerating API Key */}
      {confirmRegenerateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setConfirmRegenerateOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-amber-500/30 bg-threads-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-amber-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-threads-text">
                Regenerasi API Key Hermes?
              </h3>
            </div>
            <p className="text-xs text-threads-secondary leading-relaxed">
              Tindakan ini akan membatalkan API Key yang sedang aktif saat ini. Semua skrip cron atau agent eksternal yang masih menggunakan key lama akan ditolak hingga Anda memperbarui konfigurasi di skrip tersebut.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmRegenerateOpen(false)}
                disabled={regenerating}
                className="rounded-xl border border-threads-border bg-threads-surface px-4 py-2 text-xs font-medium text-threads-text hover:bg-threads-border"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleRegenerateKey}
                disabled={regenerating}
                className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
              >
                {regenerating && (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                <span>Ya, Generate Key Baru</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
