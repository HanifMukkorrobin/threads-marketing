'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Package,
  Layers,
  Sparkles,
  Bot,
  User,
  Check,
  ExternalLink,
  AlertTriangle,
  Trash2,
  Edit3,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { ContentDraft, DraftStatus } from '@/types/draft';
import { DraftStatusBadge, BatteryCapacityDots } from './DraftStatusBadge';
import { fireRetroConfetti } from '@/lib/confetti';
import { cn } from '@/lib/utils';

interface DraftCardProps {
  draft: ContentDraft;
  onApprove?: (draftId: string) => Promise<void> | void;
  onDelete?: (draft: ContentDraft) => void;
  onEdit?: (draft: ContentDraft) => void;
  onStatusChange?: (draftId: string, nextStatus: DraftStatus) => Promise<void> | void;
}

export function DraftCard({
  draft,
  onApprove,
  onDelete,
  onEdit,
  onStatusChange,
}: DraftCardProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [expandedThread, setExpandedThread] = useState(false);

  const posts = draft.posts || [];
  const firstPost = posts[0]?.content || 'Tidak ada konten';
  const isThread = draft.type === 'THREAD_CHAIN' || posts.length > 1;

  const handleQuickApprove = async () => {
    if (!onApprove) return;
    try {
      setIsApproving(true);
      await onApprove(draft.id);
      fireRetroConfetti(0.5, 0.5);
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div
      className={cn(
        'group relative flex flex-col justify-between rounded-retro-sm border-[2.5px] border-[#181816] bg-[#FAF6EE] p-5 sm:p-6 transition-all duration-150',
        draft.status === 'PENDING_REVIEW' && 'shadow-[4px_4px_0px_0px_#181816] hover:shadow-[6px_6px_0px_0px_#181816]',
        draft.status === 'APPROVED' && 'bg-[#F2ECE0] shadow-[4px_4px_0px_0px_#181816] hover:shadow-[6px_6px_0px_0px_#181816]',
        draft.status === 'PUBLISHED' && 'bg-white shadow-[4px_4px_0px_0px_#181816] hover:shadow-[6px_6px_0px_0px_#181816]',
        draft.status === 'FAILED' && 'bg-rose-50/70 shadow-[4px_4px_0px_0px_#181816]'
      )}
    >
      {/* Top Meta Bar */}
      <div className="space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#181816]/15 pb-3">
          {/* Status Capsule */}
          <DraftStatusBadge status={draft.status} size="sm" />

          {/* Product & Source Pills */}
          <div className="flex items-center gap-1.5">
            {draft.product ? (
              <span className="inline-flex items-center gap-1 rounded-retro-xs bg-white px-2.5 py-1 text-xs font-black text-[#181816] border-1.5 border-[#181816] shadow-[1px_1px_0px_0px_#181816]">
                <Package className="h-3 w-3 stroke-[2.5]" />
                {draft.product.name}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-retro-xs bg-[#E8DBC0] px-2.5 py-1 text-[11px] font-bold text-[#4A463F] border-1.5 border-[#181816] shadow-[1px_1px_0px_0px_#181816]">
                Organik
              </span>
            )}

            <span className="inline-flex items-center gap-1 rounded-retro-xs bg-white px-2 py-1 text-[11px] font-black text-[#181816] border-1.5 border-[#181816] shadow-[1px_1px_0px_0px_#181816]">
              {draft.source === 'HERMES_AI' ? (
                <>
                  <Bot className="h-3 w-3 text-[#6B9AC4] stroke-[2.5]" />
                  <span>AI</span>
                </>
              ) : (
                <>
                  <User className="h-3 w-3 text-zinc-600 stroke-[2.5]" />
                  <span>Manual</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Title & Hook Angle */}
        <div className="space-y-1.5">
          {draft.hookAngle && (
            <span className="inline-block text-[11px] font-black text-[#181816] bg-[#D8C49D] px-2.5 py-0.5 rounded-retro-xs border border-[#181816] shadow-[1px_1px_0px_0px_#181816] uppercase tracking-wider">
              ⚡ {draft.hookAngle}
            </span>
          )}
          <Link href={`/drafts/${draft.id}`} className="block group/title">
            <h3 className="text-sm sm:text-base font-black text-[#181816] tracking-tight line-clamp-1 uppercase group-hover/title:underline transition-colors">
              {draft.title}
            </h3>
          </Link>
        </div>

        {/* Primary Post Preview Box */}
        <div className="rounded-retro-xs bg-white p-4 border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816] space-y-2">
          <div className="flex items-center justify-between text-[11px] text-[#7A7468] font-bold border-b border-[#181816]/20 pb-1.5">
            <span className="font-black uppercase tracking-wider text-[#181816]">
              Post #1 (Hook Utama)
            </span>
            <span className="font-mono text-[10px] bg-[#FAF6EE] px-1.5 py-0.5 rounded-retro-xs border border-[#181816] text-[#181816] font-black">
              {firstPost.length}/500
            </span>
          </div>

          <p className="text-xs text-[#181816] leading-relaxed whitespace-pre-wrap line-clamp-4 font-medium">
            {firstPost}
          </p>
        </div>

        {/* Thread Chain Indicator & Battery Dots */}
        {isThread && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setExpandedThread(!expandedThread)}
                className="flex items-center gap-1.5 text-xs font-black text-[#181816] hover:underline transition-colors uppercase tracking-wider"
              >
                <Layers className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>
                  {expandedThread ? 'Tutup Rangkaian' : `Buka (${posts.length} Post)`}
                </span>
                {expandedThread ? <ChevronUp className="h-3.5 w-3.5 stroke-[3]" /> : <ChevronDown className="h-3.5 w-3.5 stroke-[3]" />}
              </button>

              <BatteryCapacityDots current={posts.length} total={Math.max(5, posts.length)} variant="denim" />
            </div>

            {/* Expanded Posts Chain Accordion */}
            {expandedThread && (
              <div className="space-y-2.5 pt-2 border-t-2 border-[#181816] animate-fadeIn">
                {posts.slice(1).map((post, idx) => (
                  <div
                    key={idx}
                    className="rounded-retro-xs bg-white p-3 border-2 border-[#181816] text-xs text-[#181816] space-y-1.5 shadow-[2px_2px_0px_0px_#181816]"
                  >
                    <div className="flex items-center justify-between text-[10px] text-[#7A7468] font-black uppercase">
                      <span>Post #{idx + 2}</span>
                      <span className="font-mono font-bold">{post.content.length}/500</span>
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed font-medium">
                      {post.content}
                    </p>
                    {post.mediaUrl && (
                      <div className="pt-1 text-[11px] text-[#6B9AC4] font-bold truncate">
                        🖼️ {post.mediaUrl}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error Banner if failed */}
        {draft.status === 'FAILED' && draft.errorMessage && (
          <div className="flex items-start gap-2 rounded-retro-xs border-2 border-[#181816] bg-rose-100 p-3 text-xs text-[#181816] shadow-[2px_2px_0px_0px_#181816]">
            <AlertTriangle className="h-4 w-4 shrink-0 text-[#C95D53] mt-0.5 stroke-[2.5]" />
            <div className="space-y-0.5">
              <span className="font-black text-[#181816] uppercase">Gagal Memposting:</span>
              <p className="text-[11px] leading-tight font-medium">{draft.errorMessage}</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="pt-4 mt-4 border-t-2 border-[#181816] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(draft)}
              className="p-1.5 rounded-retro-xs text-zinc-400 hover:text-white hover:bg-[#C95D53] hover:border-2 hover:border-[#181816] transition-colors"
              title="Hapus Draft"
            >
              <Trash2 className="h-4 w-4 stroke-[2.2]" />
            </button>
          )}

          <Link
            href={`/drafts/${draft.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-retro-xs bg-white hover:bg-[#FAF6EE] text-[#181816] text-xs font-black border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all uppercase tracking-wider"
          >
            <Edit3 className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Simulator & Edit</span>
          </Link>
        </div>

        {/* Quick Approve or Live Link */}
        <div>
          {draft.status === 'PENDING_REVIEW' && onApprove && (
            <button
              type="button"
              onClick={handleQuickApprove}
              disabled={isApproving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-retro-xs bg-[#C95D53] hover:bg-[#D45D52] text-white text-xs font-black border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-50 uppercase tracking-wider"
            >
              {isApproving ? (
                <RefreshCw className="h-3 w-3 animate-spin stroke-[2.5]" />
              ) : (
                <Check className="h-3.5 w-3.5 stroke-[3]" />
              )}
              <span>Setujui</span>
            </button>
          )}

          {draft.status === 'APPROVED' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-black text-white bg-[#6B9AC4] px-3 py-1 rounded-retro-xs border-2 border-[#181816] shadow-[1.5px_1.5px_0px_0px_#181816] uppercase tracking-wider">
              <Clock className="h-3 w-3 stroke-[2.5]" />
              <span>Antrean Siap</span>
            </span>
          )}

          {draft.status === 'PUBLISHED' && draft.threadPostUrl && (
            <a
              href={draft.threadPostUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-retro-xs bg-[#D8C49D] text-[#181816] text-xs font-black border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816] hover:bg-[#E2D2B0] transition-all uppercase tracking-wider"
            >
              <span>Lihat Threads</span>
              <ExternalLink className="h-3 w-3 stroke-[2.5]" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
