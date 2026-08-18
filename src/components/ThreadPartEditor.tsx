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
        'group relative rounded-retro-sm border-[2.5px] border-[#181816] bg-[#FAF6EE] p-5 sm:p-6 transition-all duration-150 shadow-[4px_4px_0px_0px_#181816]',
        !charStatus.isValid && 'bg-rose-50/70 border-[#C95D53]',
        charStatus.status === 'amber' && 'bg-[#FAF6EE]',
        charStatus.status === 'green' && 'hover:shadow-[5px_5px_0px_0px_#181816]'
      )}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 border-b-2 border-[#181816]/20 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'flex items-center justify-center rounded-retro-xs px-3 py-1 text-xs font-black border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816] uppercase tracking-wider',
              isFirst
                ? 'bg-[#6B9AC4] text-white'
                : 'bg-white text-[#181816]'
            )}
          >
            {isFirst ? 'Post #01 (Hook Utama)' : `Post #${String(index + 1).padStart(2, '0')}`}
          </span>

          {part.mediaUrl && (
            <span className="inline-flex items-center gap-1 rounded-retro-xs bg-[#D8C49D] px-2 py-0.5 text-[11px] font-bold text-[#181816] border border-[#181816] shadow-[1px_1px_0px_0px_#181816]">
              <ImageIcon className="h-3 w-3 stroke-[2.5]" />
              Gambar
            </span>
          )}
        </div>

        {/* Action Buttons: Move Up, Move Down, Delete */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onMoveUp(index)}
            disabled={disabled || isFirst}
            className={cn(
              'h-8 w-8 rounded-retro-xs flex items-center justify-center text-[#181816] bg-white border-2 border-[#181816] transition-all tap-effect',
              isFirst || disabled
                ? 'opacity-30 cursor-not-allowed shadow-none'
                : 'hover:bg-[#D8C49D] shadow-[2px_2px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
            )}
            title="Pindah ke Atas"
          >
            <ArrowUp className="h-4 w-4 stroke-[3]" />
          </button>

          <button
            type="button"
            onClick={() => onMoveDown(index)}
            disabled={disabled || isLast}
            className={cn(
              'h-8 w-8 rounded-retro-xs flex items-center justify-center text-[#181816] bg-white border-2 border-[#181816] transition-all tap-effect',
              isLast || disabled
                ? 'opacity-30 cursor-not-allowed shadow-none'
                : 'hover:bg-[#D8C49D] shadow-[2px_2px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
            )}
            title="Pindah ke Bawah"
          >
            <ArrowDown className="h-4 w-4 stroke-[3]" />
          </button>

          {totalParts > 1 && (
            <button
              type="button"
              onClick={() => onRemove(index)}
              disabled={disabled}
              className="h-8 w-8 rounded-retro-xs flex items-center justify-center text-[#C95D53] bg-white border-2 border-[#181816] hover:bg-[#C95D53] hover:text-white shadow-[2px_2px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all ml-1"
              title="Hapus Bagian Post Ini"
            >
              <Trash2 className="h-4 w-4 stroke-[2.5]" />
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
          className="w-full rounded-retro-xs bg-white border-2 border-[#181816] p-4 text-xs sm:text-sm text-[#181816] placeholder-zinc-400 font-medium focus:outline-none focus:bg-[#FAF6EE] shadow-[2px_2px_0px_0px_#181816] resize-y leading-relaxed font-sans"
        />

        {/* Bottom Status Row: Character Counter & Media Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {/* Media attachment toggle */}
          <button
            type="button"
            onClick={() => setShowMediaInput(!showMediaInput)}
            disabled={disabled}
            className={cn(
              'flex items-center gap-1.5 rounded-retro-xs px-3 py-1 text-xs font-bold border-2 border-[#181816] transition-all tap-effect shadow-[2px_2px_0px_0px_#181816]',
              showMediaInput || part.mediaUrl
                ? 'bg-[#6B9AC4] text-white'
                : 'bg-white text-[#181816] hover:bg-[#FAF6EE]'
            )}
          >
            <ImageIcon className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>{part.mediaUrl ? 'Ganti Media' : '+ Lampirkan Media'}</span>
          </button>

          {/* Character Count Badge */}
          <div className="flex items-center gap-2">
            {!charStatus.isValid && (
              <span className="flex items-center gap-1 text-[11px] font-black text-[#C95D53] animate-pulse">
                <AlertCircle className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>Melebihi limit {Math.abs(charStatus.remaining)} karakter!</span>
              </span>
            )}

            <div
              className={cn(
                'rounded-retro-xs px-3 py-1 text-xs font-black font-mono border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816]',
                charStatus.status === 'green' && 'bg-white text-[#181816]',
                charStatus.status === 'amber' && 'bg-[#D8C49D] text-[#181816]',
                charStatus.status === 'red' && 'bg-[#C95D53] text-white'
              )}
            >
              {charStatus.count} / {MAX_THREAD_CHAR_COUNT}
            </div>
          </div>
        </div>

        {/* Media URL Input Box */}
        {showMediaInput && (
          <div className="rounded-retro-xs bg-[#E8DBC0]/40 p-3.5 border-2 border-[#181816] space-y-2 mt-2 shadow-[2px_2px_0px_0px_#181816] animate-scale-in">
            <div className="flex items-center justify-between text-xs font-black text-[#181816]">
              <span className="flex items-center gap-1.5">
                <LinkIcon className="h-3.5 w-3.5 stroke-[2.5]" />
                URL Gambar / Media
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowMediaInput(false);
                  onMediaChange(index, null);
                }}
                className="text-[#181816] hover:text-[#C95D53] p-0.5 rounded-xs"
              >
                <X className="h-4 w-4 stroke-[3]" />
              </button>
            </div>

            <input
              type="url"
              value={part.mediaUrl || ''}
              onChange={(e) => handleMediaUrlChange(e.target.value)}
              placeholder="https://images.unsplash.com/photo-..."
              className="w-full rounded-retro-xs bg-white border-2 border-[#181816] px-3 py-2 text-xs text-[#181816] placeholder-zinc-400 font-mono shadow-[1.5px_1.5px_0px_0px_#181816] focus:outline-none"
            />

            {part.mediaUrl && !imageError && (
              <div className="relative rounded-retro-xs overflow-hidden border-2 border-[#181816] max-h-36 mt-2 shadow-[2px_2px_0px_0px_#181816]">
                <img
                  src={part.mediaUrl}
                  alt="Preview"
                  className="w-full h-36 object-cover"
                  onError={() => setImageError(true)}
                />
              </div>
            )}

            {imageError && (
              <p className="text-[11px] text-[#C95D53] font-bold">
                URL gambar tidak valid atau gagal dimuat.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
