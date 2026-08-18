'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, Delete, ArrowRight } from 'lucide-react';
import { fireRetroConfetti } from '@/lib/confetti';
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

      fireRetroConfetti(0.5, 0.5);
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
    <div className="w-full max-w-md rounded-retro-sm bg-[#FAF6EE] p-8 sm:p-10 shadow-[10px_10px_0px_0px_#181816] border-[3px] border-[#181816] space-y-8 animate-scale-in">
      {/* Top Header */}
      <div className="text-center space-y-3">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-retro-xs bg-[#6B9AC4] border-2 border-[#181816] shadow-[3px_3px_0px_0px_#181816] text-white font-black">
          <Lock className="h-6 w-6 stroke-[3]" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-[#181816] tracking-tight uppercase">
            Security Island
          </h1>
          <p className="text-xs text-[#4A463F] font-bold">
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
                'h-12 w-12 sm:h-14 sm:w-14 rounded-retro-xs border-2 text-center text-lg sm:text-xl font-black font-mono transition-all outline-none',
                digit
                  ? 'bg-[#6B9AC4] text-white border-[#181816] shadow-[3px_3px_0px_0px_#181816] scale-105'
                  : 'bg-white text-[#181816] border-[#181816] focus:bg-[#FAF6EE] shadow-[2px_2px_0px_0px_#181816]'
              )}
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <p className="text-xs text-[#C95D53] font-black text-center animate-fadeIn bg-rose-100 p-2 rounded-retro-xs border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816]">
            {error}
          </p>
        )}

        {/* Toggle Show/Hide PIN */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => setShowPin(!showPin)}
            className="flex items-center gap-1.5 text-xs font-black text-[#4A463F] hover:text-[#181816] transition-colors uppercase tracking-wider"
          >
            {showPin ? <EyeOff className="h-3.5 w-3.5 stroke-[2.5]" /> : <Eye className="h-3.5 w-3.5 stroke-[2.5]" />}
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
                className="h-12 rounded-retro-xs bg-[#E8DBC0] hover:bg-[#D8C49D] text-[#181816] text-xs font-black transition-all tap-effect border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
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
                className="h-12 flex items-center justify-center rounded-retro-xs bg-[#E8DBC0] hover:bg-[#D8C49D] text-[#181816] text-xs font-black transition-all tap-effect border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              >
                <Delete className="h-4 w-4 stroke-[2.5]" />
              </button>
            );
          }

          return (
            <button
              key={key}
              type="button"
              onClick={() => handleKeypadPress(key)}
              className="h-12 rounded-retro-xs bg-white hover:bg-[#FAF6EE] text-[#181816] text-base font-black transition-all tap-effect border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
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
        className="w-full flex items-center justify-center gap-2 py-3 rounded-retro-xs bg-[#C95D53] hover:bg-[#D45D52] text-white font-black text-xs border-2 border-[#181816] shadow-[4px_4px_0px_0px_#181816] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none transition-all tap-effect disabled:opacity-40 uppercase tracking-wider"
      >
        <span>{loading ? 'Memverifikasi...' : 'Buka Dashboard'}</span>
        <ArrowRight className="h-4 w-4 stroke-[3]" />
      </button>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full bg-[#D9C5A3] flex flex-col items-center justify-center p-4">
      <Suspense fallback={<div className="text-xs text-[#181816] font-bold">Memuat...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
