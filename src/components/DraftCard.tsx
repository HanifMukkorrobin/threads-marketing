'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Package,
  Layers,
  Sparkles,
  Bot,
  User,
  CheckCircle2,
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
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div
      className={cn(
        'group relative flex flex-col justify-between rounded-bento border bg-surface p-6 transition-all duration-200 bento-card',
        draft.status === 'PENDING_REVIEW' && 'border-amber-300/80 bg-amber-50/20',
        draft.status === 'APPROVED' && 'border-lime-dark/30 bg-surface',
        draft.status === 'PUBLISHED' && 'border-surface-border bg-surface',
        draft.status === 'FAILED' && 'border-rose-200 bg-rose-50/30'
      )}
    >
      {/* Top Meta Bar */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Status Capsule */}
          <DraftStatusBadge status={draft.status} size="sm" />

          {/* Product & Source Pills */}
          <div className="flex items-center gap-1.5">
            {draft.product ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink border border-surface-border shadow-xs">
                <Package className="h-3 w-3 text-ink-secondary" />
                {draft.product.name}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-ink-muted border border-surface-border">
                Organik
              </span>
            )}

            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-ink-secondary border border-surface-border">
              {draft.source === 'HERMES_AI' ? (
                <>
                  <Bot className="h-3 w-3 text-sky-600" />
                  <span>AI</span>
                </>
              ) : (
                <>
                  <User className="h-3 w-3 text-zinc-500" />
                  <span>Manual</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Title & Hook Angle */}
        <div className="space-y-1">
          {draft.hookAngle && (
            <span className="inline-block text-[11px] font-bold text-amber-700 bg-amber-100/70 px-2.5 py-0.5 rounded-full">
              ⚡ {draft.hookAngle}
            </span>
          )}
          <Link href={`/drafts/${draft.id}`} className="block group/title">
            <h3 className="text-sm sm:text-base font-bold text-ink tracking-tight line-clamp-1 group-hover/title:text-ink-secondary transition-colors">
              {draft.title}
            </h3>
          </Link>
        </div>

        {/* Primary Post Preview Box */}
        <div className="rounded-2xl bg-white p-4 border border-surface-border/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[11px] text-ink-muted">
            <span className="font-semibold uppercase tracking-wider text-ink-secondary">
              Post #1 (Hook Utama)
            </span>
            <span className="font-mono text-[10px]">
              {firstPost.length} / 500
            </span>
          </div>

          <p className="text-xs text-ink leading-relaxed whitespace-pre-wrap line-clamp-4">
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
                className="flex items-center gap-1.5 text-xs font-bold text-ink hover:text-ink-secondary transition-colors"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>
                  {expandedThread ? 'Sembunyikan Rangkaian' : `Lihat Semua (${posts.length} Post)`}
                </span>
                {expandedThread ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>

              <BatteryCapacityDots current={posts.length} total={Math.max(5, posts.length)} variant="dark" />
            </div>

            {/* Expanded Posts Chain Accordion */}
            {expandedThread && (
              <div className="space-y-2.5 pt-2 border-t border-surface-border animate-fadeIn">
                {posts.slice(1).map((post, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl bg-white p-3.5 border border-surface-border/70 text-xs text-ink space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[10px] text-ink-muted font-semibold uppercase">
                      <span>Post #{idx + 2}</span>
                      <span className="font-mono">{post.content.length} / 500</span>
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {post.content}
                    </p>
                    {post.mediaUrl && (
                      <div className="pt-1 text-[11px] text-sky-600 truncate">
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
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-rose-800">Gagal Memposting:</span>
              <p className="text-[11px] leading-tight">{draft.errorMessage}</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="pt-5 mt-5 border-t border-surface-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(draft)}
              className="p-2 rounded-full text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors tap-effect"
              title="Hapus Draft"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}

          <Link
            href={`/drafts/${draft.id}`}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-white hover:bg-surface-hover text-ink text-xs font-semibold border border-surface-border transition-all tap-effect shadow-xs"
          >
            <Edit3 className="h-3.5 w-3.5" />
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
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-ink hover:bg-zinc-800 text-white text-xs font-bold transition-all tap-effect shadow-pill disabled:opacity-50"
            >
              {isApproving ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3 stroke-[2.5]" />
              )}
              <span>Setujui</span>
            </button>
          )}

          {draft.status === 'APPROVED' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-ink bg-lime px-3 py-1 rounded-full border border-lime-dark/30 shadow-xs">
              <Clock className="h-3 w-3" />
              <span>Antrean Siap</span>
            </span>
          )}

          {draft.status === 'PUBLISHED' && draft.threadPostUrl && (
            <a
              href={draft.threadPostUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-lime text-ink text-xs font-bold hover:bg-lime-hover transition-all tap-effect shadow-xs"
            >
              <span>Lihat di Threads</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}


