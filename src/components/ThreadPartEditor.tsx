'use client';

import React, { useState } from 'react';
import {
  ArrowUp,
  ArrowDown,
  Trash2,
  Image as ImageIcon,
  AlertCircle,
  Link as LinkIcon,
  X,
  Sparkles,
  Layers,
} from 'lucide-react';
import {
  ThreadPartState,
  getCharCountStatus,
  MAX_THREAD_CHAR_COUNT,
} from '@/lib/thread-editor';
import { cn } from '@/lib/utils';

interface ThreadPartEditorProps {
  part: ThreadPartState;
  index: number;
  totalParts: number;
  onContentChange: (index: number, content: string) => void;
  onMediaChange: (index: number, mediaUrl: string | null) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
}

export function ThreadPartEditor({
  part,
  index,
  totalParts,
  onContentChange,
  onMediaChange,
  onMoveUp,
  onMoveDown,
  onRemove,
  disabled = false,
}: ThreadPartEditorProps) {
  const [showMediaInput, setShowMediaInput] = useState(!!part.mediaUrl);
  const [imageError, setImageError] = useState(false);

  const charStatus = getCharCountStatus(part.content);
  const isFirst = index === 0;
  const isLast = index === totalParts - 1;

  const handleMediaUrlChange = (val: string) => {
    setImageError(false);
    onMediaChange(index, val);
  };

  return (
    <div
      className={cn(
        'group relative rounded-xl border border-threads-border bg-threads-card p-4 sm:p-5 transition-all duration-200 shadow-sm',
        !charStatus.isValid && 'border-rose-500/60 ring-1 ring-rose-500/30',
        charStatus.status === 'amber' && 'border-amber-500/40',
        charStatus.status === 'green' && 'hover:border-threads-secondary/60'
      )}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 border-b border-threads-border/70 pb-3 mb-3.5">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'flex items-center justify-center rounded-lg px-2.5 py-1 text-xs font-semibold tracking-tight border',
              isFirst
                ? 'bg-threads-accent/15 text-threads-accent border-threads-accent/30'
                : 'bg-threads-surface text-threads-text border-threads-border'
            )}
          >
            {isFirst ? 'Post #1 (Utama / Hook)' : `Post #${index + 1} (Reply Thread)`}
          </span>

          {part.mediaUrl && (
            <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300 border border-threads-border">
              <ImageIcon className="h-3 w-3 text-sky-400" />
              Gambar
            </span>
          )}
        </div>

        {/* Action Buttons: Move Up, Move Down, Delete */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMoveUp(index)}
            disabled={disabled || isFirst}
            className={cn(
              'rounded-lg p-1.5 text-threads-secondary transition-colors',
              isFirst || disabled
                ? 'opacity-30 cursor-not-allowed'
                : 'hover:bg-threads-surface hover:text-threads-text active:scale-95'
            )}
            title="Pindah ke Atas"
            aria-label="Pindah ke Atas"
          >
            <ArrowUp className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => onMoveDown(index)}
            disabled={disabled || isLast}
            className={cn(
              'rounded-lg p-1.5 text-threads-secondary transition-colors',
              isLast || disabled
                ? 'opacity-30 cursor-not-allowed'
                : 'hover:bg-threads-surface hover:text-threads-text active:scale-95'
            )}
            title="Pindah ke Bawah"
            aria-label="Pindah ke Bawah"
          >
            <ArrowDown className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-threads-border mx-1" />

          <button
            type="button"
            onClick={() => onRemove(index)}
            disabled={disabled || totalParts <= 1}
            className={cn(
              'rounded-lg p-1.5 text-threads-secondary transition-colors',
              totalParts <= 1 || disabled
                ? 'opacity-30 cursor-not-allowed'
                : 'hover:bg-rose-500/15 hover:text-rose-400 active:scale-95'
            )}
            title={totalParts <= 1 ? 'Minimal 1 post' : 'Hapus Post Part'}
            aria-label="Hapus Post Part"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Content Textarea */}
      <div className="space-y-2">
        <textarea
          value={part.content}
          onChange={(e) => onContentChange(index, e.target.value)}
          disabled={disabled}
          placeholder={
            isFirst
              ? 'Tulis kalimat pembuka (hook) yang menarik audiens di Threads...'
              : 'Tulis lanjutan poin, penjelasan, atau call-to-action untuk thread ini...'
          }
          rows={4}
          className={cn(
            'w-full resize-y rounded-xl border border-threads-border/90 bg-threads-bg px-3.5 py-3 text-sm leading-relaxed text-threads-text placeholder-threads-muted/70 transition-colors',
            'focus:border-threads-accent focus:outline-none focus:ring-1 focus:ring-threads-accent/50',
            disabled && 'opacity-60 cursor-not-allowed',
            !charStatus.isValid && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/40'
          )}
        />

        {/* Visual Progress Bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-threads-surface">
          <div
            className={cn(
              'h-full transition-all duration-200 rounded-full',
              charStatus.status === 'green' && 'bg-emerald-500',
              charStatus.status === 'amber' && 'bg-amber-500',
              charStatus.status === 'red' && 'bg-rose-500'
            )}
            style={{ width: `${charStatus.progressPercentage}%` }}
          />
        </div>

        {/* Live Character Counter & Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            {!charStatus.isValid ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Melebihi batas {MAX_THREAD_CHAR_COUNT} karakter!
              </span>
            ) : charStatus.status === 'amber' ? (
              <span className="text-[11px] font-medium text-amber-400">
                Mendekati batas maksimal ({charStatus.remaining} tersisa)
              </span>
            ) : (
              <span className="text-[11px] text-threads-secondary">
                Panjang konten ideal
              </span>
            )}
          </div>

          {/* Numerical Counter */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'font-mono text-xs font-semibold tabular-nums',
                charStatus.status === 'green' && 'text-emerald-400',
                charStatus.status === 'amber' && 'text-amber-400',
                charStatus.status === 'red' && 'text-rose-400 font-bold'
              )}
            >
              {charStatus.count} / {MAX_THREAD_CHAR_COUNT}
            </span>

            {/* Media toggle button */}
            <button
              type="button"
              onClick={() => setShowMediaInput(!showMediaInput)}
              className={cn(
                'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors',
                part.mediaUrl || showMediaInput
                  ? 'border-threads-accent/40 bg-threads-accent/10 text-threads-accent'
                  : 'border-threads-border bg-threads-surface text-threads-secondary hover:text-threads-text'
              )}
            >
              <ImageIcon className="h-3 w-3" />
              <span>{part.mediaUrl ? 'Edit Gambar' : '+ Gambar/Media'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Media URL Input Section */}
      {showMediaInput && (
        <div className="mt-3.5 space-y-2 rounded-xl border border-threads-border/80 bg-threads-surface/50 p-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
              <LinkIcon className="h-3.5 w-3.5 text-sky-400" />
              URL Gambar Lampiran (Opsional)
            </label>
            {part.mediaUrl && (
              <button
                type="button"
                onClick={() => handleMediaUrlChange('')}
                className="text-[11px] text-rose-400 hover:underline"
              >
                Hapus Lampiran
              </button>
            )}
          </div>

          <div className="relative flex items-center">
            <input
              type="url"
              value={part.mediaUrl || ''}
              onChange={(e) => handleMediaUrlChange(e.target.value)}
              disabled={disabled}
              placeholder="https://example.com/banner-canva.jpg"
              className="w-full rounded-lg border border-threads-border bg-threads-bg px-3 py-1.5 text-xs text-threads-text placeholder-threads-muted focus:border-threads-accent focus:outline-none"
            />
            {part.mediaUrl && (
              <button
                type="button"
                onClick={() => handleMediaUrlChange('')}
                className="absolute right-2.5 text-threads-secondary hover:text-threads-text"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Media Preview thumbnail */}
          {part.mediaUrl && (
            <div className="pt-2">
              {!imageError ? (
                <div className="relative overflow-hidden rounded-lg border border-threads-border bg-black max-h-48 flex items-center justify-center">
                  <img
                    src={part.mediaUrl}
                    alt={`Preview media post #${index + 1}`}
                    className="max-h-48 w-auto object-contain"
                    onError={() => setImageError(true)}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Gambar tidak dapat dimuat dari URL yang diberikan.</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
