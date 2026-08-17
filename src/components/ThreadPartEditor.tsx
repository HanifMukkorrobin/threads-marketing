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
        'group relative rounded-bento border bg-surface p-5 sm:p-6 transition-all duration-200 shadow-xs',
        !charStatus.isValid && 'border-rose-300 ring-2 ring-rose-400/20 bg-rose-50/20',
        charStatus.status === 'amber' && 'border-amber-300',
        charStatus.status === 'green' && 'border-surface-border hover:border-zinc-400'
      )}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 border-b border-surface-border pb-3.5 mb-4">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'flex items-center justify-center rounded-full px-3 py-1 text-xs font-bold shadow-xs',
              isFirst
                ? 'bg-ink text-white'
                : 'bg-white text-ink border border-surface-border'
            )}
          >
            {isFirst ? 'Post #01 (Hook Utama)' : `Post #${String(index + 1).padStart(2, '0')}`}
          </span>

          {part.mediaUrl && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-sky-600 border border-surface-border">
              <ImageIcon className="h-3 w-3" />
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
              'h-7 w-7 rounded-full flex items-center justify-center text-ink-muted bg-white border border-surface-border transition-all tap-effect',
              isFirst || disabled
                ? 'opacity-30 cursor-not-allowed'
                : 'hover:text-ink hover:border-ink shadow-xs'
            )}
            title="Pindah ke Atas"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onMoveDown(index)}
            disabled={disabled || isLast}
            className={cn(
              'h-7 w-7 rounded-full flex items-center justify-center text-ink-muted bg-white border border-surface-border transition-all tap-effect',
              isLast || disabled
                ? 'opacity-30 cursor-not-allowed'
                : 'hover:text-ink hover:border-ink shadow-xs'
            )}
            title="Pindah ke Bawah"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>

          {totalParts > 1 && (
            <button
              type="button"
              onClick={() => onRemove(index)}
              disabled={disabled}
              className="h-7 w-7 rounded-full flex items-center justify-center text-rose-500 bg-white border border-surface-border hover:bg-rose-50 hover:border-rose-300 transition-all tap-effect ml-1 shadow-xs"
              title="Hapus Bagian Post Ini"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content Textarea */}
      <div className="space-y-3">
        <textarea
          value={part.content}
          onChange={(e) => onContentChange(index, e.target.value)}
          disabled={disabled}
          placeholder={
            isFirst
              ? 'Tulis hook utama thread yang memikat pembaca dalam 2 detik pertama (akhiri dengan 🧵👇)...'
              : `Tulis poin penjelasan post #${index + 1}...`
          }
          rows={4}
          className="w-full rounded-2xl bg-white border border-surface-border p-4 text-xs sm:text-sm text-ink placeholder-ink-muted focus:border-ink focus:ring-1 focus:ring-ink focus:outline-none transition-all resize-y leading-relaxed font-sans shadow-xs"
        />

        {/* Bottom Status Row: Character Counter & Media Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {/* Media attachment toggle */}
          <button
            type="button"
            onClick={() => setShowMediaInput(!showMediaInput)}
            disabled={disabled}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition-all tap-effect',
              showMediaInput || part.mediaUrl
                ? 'bg-ink text-white border-black'
                : 'bg-white text-ink-secondary border-surface-border hover:bg-surface-hover'
            )}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span>{part.mediaUrl ? 'Ganti Media' : '+ Lampirkan Media'}</span>
          </button>

          {/* Character Count Badge */}
          <div className="flex items-center gap-2">
            {!charStatus.isValid && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Melebihi limit {Math.abs(charStatus.remaining)} karakter!</span>
              </span>
            )}

            <div
              className={cn(
                'rounded-full px-3 py-1 text-xs font-bold font-mono border shadow-xs',
                charStatus.status === 'green' && 'bg-white text-ink border-surface-border',
                charStatus.status === 'amber' && 'bg-amber-100 text-amber-800 border-amber-300',
                charStatus.status === 'red' && 'bg-rose-100 text-rose-800 border-rose-300'
              )}
            >
              {charStatus.count} / {MAX_THREAD_CHAR_COUNT}
            </div>
          </div>
        </div>

        {/* Media URL Input Box */}
        {showMediaInput && (
          <div className="rounded-2xl bg-white p-3.5 border border-surface-border space-y-2 mt-2 shadow-xs animate-scale-in">
            <div className="flex items-center justify-between text-xs font-bold text-ink">
              <span className="flex items-center gap-1.5">
                <LinkIcon className="h-3.5 w-3.5 text-ink-muted" />
                URL Gambar / Media
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowMediaInput(false);
                  onMediaChange(index, null);
                }}
                className="text-ink-muted hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <input
              type="url"
              value={part.mediaUrl || ''}
              onChange={(e) => handleMediaUrlChange(e.target.value)}
              placeholder="https://images.unsplash.com/photo-..."
              className="w-full rounded-xl bg-surface border border-surface-border px-3 py-2 text-xs text-ink placeholder-ink-muted focus:border-ink focus:outline-none transition-colors font-mono"
            />

            {part.mediaUrl && !imageError && (
              <div className="relative rounded-xl overflow-hidden border border-surface-border max-h-32 mt-2">
                <img
                  src={part.mediaUrl}
                  alt="Preview"
                  className="w-full h-32 object-cover"
                  onError={() => setImageError(true)}
                />
              </div>
            )}

            {imageError && (
              <p className="text-[11px] text-rose-600 font-medium">
                URL gambar tidak valid atau gagal dimuat.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
