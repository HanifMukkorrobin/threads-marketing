'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, Delete, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
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

    const nextEmptyIndex = digits.findIndex((d) => d === '');
    if (nextEmptyIndex !== -1) {
      const newDigits = [...digits];
      newDigits[nextEmptyIndex] = val;
      setDigits(newDigits);

      if (nextEmptyIndex < 5) {
        inputRefs.current[nextEmptyIndex + 1]?.focus();
      } else {
        const fullPin = newDigits.join('');
        submitPin(fullPin);
      }
    }
  };

  const submitPin = async (pinString: string) => {
    if (pinString.length !== 6) {
      setError('PIN harus 6 digit angka');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinString }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'PIN yang Anda masukkan salah');
      }

      router.push(redirectUrl);
    } catch (err: any) {
      setError(err?.message || 'PIN yang Anda masukkan salah');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-[36px] bg-island p-8 sm:p-10 shadow-2xl border border-surface-border space-y-8 animate-scale-in">
      {/* Top Header */}
      <div className="text-center space-y-3">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lime border border-lime-dark/30 shadow-xs text-ink font-black">
          <Lock className="h-6 w-6 stroke-[2.5]" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-ink tracking-tight">
            Security Island
          </h1>
          <p className="text-xs text-ink-secondary">
            Masukkan 6 digit PIN admin untuk mengakses dashboard Threads Marketing.
          </p>
        </div>
      </div>

      {/* PIN Digit Inputs */}
      <div className="space-y-4">
        <div
          className={cn(
            'flex items-center justify-center gap-2.5 sm:gap-3',
            isShaking && 'animate-shake'
          )}
          onPaste={handlePaste}
        >
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className={cn(
                'h-12 w-12 sm:h-14 sm:w-14 rounded-2xl border-2 text-center text-lg sm:text-xl font-extrabold font-mono transition-all outline-none shadow-xs',
                digit
                  ? 'bg-ink text-white border-black scale-105'
                  : 'bg-surface text-ink border-surface-border focus:border-ink focus:bg-white'
              )}
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <p className="text-xs text-rose-600 font-bold text-center animate-fadeIn">
            {error}
          </p>
        )}

        {/* Toggle Show/Hide PIN */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => setShowPin(!showPin)}
            className="flex items-center gap-1.5 text-xs font-semibold text-ink-secondary hover:text-ink transition-colors"
          >
            {showPin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            <span>{showPin ? 'Sembunyikan Digit' : 'Perlihatkan Digit'}</span>
          </button>
        </div>
      </div>

      {/* On-Screen Numeric Keypad */}
      <div className="grid grid-cols-3 gap-2.5 pt-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'backspace'].map((key) => {
          if (key === 'clear') {
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleKeypadPress('clear')}
                className="h-12 rounded-2xl bg-surface hover:bg-surface-hover text-ink-secondary text-xs font-bold transition-all tap-effect border border-surface-border"
              >
                C
              </button>
            );
          }

          if (key === 'backspace') {
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleKeypadPress('backspace')}
                className="h-12 flex items-center justify-center rounded-2xl bg-surface hover:bg-surface-hover text-ink text-xs font-bold transition-all tap-effect border border-surface-border"
              >
                <Delete className="h-4 w-4" />
              </button>
            );
          }

          return (
            <button
              key={key}
              type="button"
              onClick={() => handleKeypadPress(key)}
              className="h-12 rounded-2xl bg-white hover:bg-surface text-ink text-base font-bold transition-all tap-effect border border-surface-border shadow-xs"
            >
              {key}
            </button>
          );
        })}
      </div>

      {/* Submit Button */}
      <button
        type="button"
        onClick={() => submitPin(digits.join(''))}
        disabled={loading || digits.join('').length !== 6}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-ink hover:bg-zinc-800 text-white font-bold text-xs shadow-pill transition-all tap-effect disabled:opacity-40"
      >
        <span>{loading ? 'Memverifikasi...' : 'Buka Dashboard'}</span>
        <ArrowRight className="h-4 w-4 stroke-[2.5]" />
      </button>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full bg-canvas flex flex-col items-center justify-center p-4">
      <Suspense fallback={<div className="text-xs text-ink-muted">Memuat...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
