'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Sparkles, Eye, EyeOff, Delete, ArrowRight, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    setError(null);
    const numericChar = value.replace(/\D/g, '').slice(-1);

    const newDigits = [...digits];
    newDigits[index] = numericChar;
    setDigits(newDigits);

    if (numericChar && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto submit if all 6 digits entered
    if (numericChar && index === 5) {
      const fullPin = newDigits.join('');
      if (fullPin.length === 6) {
        submitPin(fullPin);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);

    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();

    if (pasted.length === 6) {
      submitPin(pasted);
    }
  };

  const handleKeypadPress = (val: string) => {
    setError(null);
    if (val === 'backspace') {
      // Find last filled index
      const lastIndex = digits.map((d, i) => (d ? i : -1)).filter((i) => i !== -1).pop();
      if (lastIndex !== undefined) {
        const newDigits = [...digits];
        newDigits[lastIndex] = '';
        setDigits(newDigits);
        inputRefs.current[lastIndex]?.focus();
      }
      return;
    }

    if (val === 'clear') {
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      return;
    }

    // Find first empty index
    const emptyIndex = digits.findIndex((d) => !d);
    if (emptyIndex !== -1) {
      const newDigits = [...digits];
      newDigits[emptyIndex] = val;
      setDigits(newDigits);

      if (emptyIndex < 5) {
        inputRefs.current[emptyIndex + 1]?.focus();
      } else if (emptyIndex === 5) {
        const fullPin = newDigits.join('');
        submitPin(fullPin);
      }
    }
  };

  const submitPin = async (pinToSubmit?: string) => {
    const pin = pinToSubmit || digits.join('');
    if (pin.length !== 6) {
      setError('Masukkan 6 digit PIN secara lengkap');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        setError(data.error || 'PIN yang Anda masukkan salah.');
        setDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        return;
      }

      // Success -> Redirect
      router.push(redirectUrl);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#101010] flex flex-col items-center justify-center px-4 py-12 select-none">
      <div
        className={cn(
          'w-full max-w-sm rounded-3xl border border-zinc-800 bg-[#161616] p-8 shadow-2xl transition-all duration-300',
          isShaking && 'animate-shake'
        )}
      >
        {/* Brand / Logo */}
        <div className="flex flex-col items-center text-center space-y-3 mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 shadow-lg shadow-sky-500/20 text-white">
            <Lock className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
              <span>Threads Engine</span>
              <Sparkles className="h-4 w-4 text-sky-400" />
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Masukkan 6 digit PIN untuk mengakses dashboard
            </p>
          </div>
        </div>

        {/* 6 Discrete Digit Boxes */}
        <div className="space-y-4">
          <div className="flex justify-between items-center gap-2">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                aria-label={`Digit ${idx + 1}`}
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                disabled={loading}
                className={cn(
                  'h-12 w-11 text-center font-mono text-lg font-bold rounded-xl border bg-[#101010] transition-all duration-150 focus:outline-none',
                  digit
                    ? 'border-sky-500 text-white shadow-sm shadow-sky-500/20'
                    : 'border-zinc-800 text-zinc-400 focus:border-sky-500/80',
                  error && 'border-rose-500/80 text-rose-300'
                )}
              />
            ))}
          </div>

          <div className="flex items-center justify-between text-xs px-1">
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {showPin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              <span>{showPin ? 'Sembunyikan' : 'Lihat PIN'}</span>
            </button>

            <span className="text-[11px] text-zinc-500">Default: 123456</span>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-center text-xs text-rose-400 animate-fadeIn">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="button"
            onClick={() => submitPin()}
            disabled={loading || digits.join('').length !== 6}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-white py-3 text-xs font-bold text-black shadow-lg hover:bg-zinc-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
            ) : (
              <>
                <span>Buka Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>

        {/* Virtual On-Screen Keypad for touch / mobile */}
        <div className="mt-8 pt-6 border-t border-zinc-800/80">
          <div className="grid grid-cols-3 gap-2.5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeypadPress(num)}
                disabled={loading}
                className="flex h-11 items-center justify-center rounded-xl bg-[#1f1f1f] text-sm font-semibold text-zinc-200 hover:bg-zinc-700/60 active:scale-95 transition-all"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleKeypadPress('clear')}
              disabled={loading}
              className="flex h-11 items-center justify-center rounded-xl bg-[#1f1f1f]/50 text-xs font-medium text-zinc-400 hover:bg-zinc-700/60 active:scale-95 transition-all"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              disabled={loading}
              className="flex h-11 items-center justify-center rounded-xl bg-[#1f1f1f] text-sm font-semibold text-zinc-200 hover:bg-zinc-700/60 active:scale-95 transition-all"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('backspace')}
              disabled={loading}
              className="flex h-11 items-center justify-center rounded-xl bg-[#1f1f1f]/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60 active:scale-95 transition-all"
              title="Hapus"
            >
              <Delete className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Session aman terenkripsi 7 hari</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#101010] flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
