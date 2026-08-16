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
  ExternalLink,
  AlertTriangle,
  Trash2,
  Edit3,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { ContentDraft, DraftStatus } from '@/types/draft';
import { DraftStatusBadge } from './DraftStatusBadge';
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
  const remainingCount = posts.length - 1;
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
        'group relative flex flex-col justify-between rounded-xl border border-threads-border bg-threads-card p-5 transition-all duration-200 hover:border-threads-secondary/50 hover:shadow-lg hover:shadow-black/40',
        draft.status === 'PENDING_REVIEW' && 'border-amber-500/20 hover:border-amber-500/40',
        draft.status === 'APPROVED' && 'border-emerald-500/20 hover:border-emerald-500/40',
        draft.status === 'FAILED' && 'border-rose-500/20 hover:border-rose-500/40'
      )}
    >
      {/* Header section: Meta badges & Status */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Status Badge */}
          <DraftStatusBadge status={draft.status} size="sm" />

          {/* Type & Source Badges */}
          <div className="flex items-center gap-1.5">
            {/* Source Pill */}
            {draft.source === 'HERMES_AI' ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-400 border border-purple-500/20">
                <Bot className="h-3 w-3" />
                Hermes AI
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-threads-secondary border border-threads-border">
                <User className="h-3 w-3" />
                Manual
              </span>
            )}

            {/* Type Pill */}
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium border',
                isThread
                  ? 'border-sky-500/20 bg-sky-500/10 text-sky-400'
                  : 'border-threads-border bg-threads-surface text-threads-secondary'
              )}
            >
              <Layers className="h-3 w-3" />
              {isThread ? `${posts.length} Post Thread` : 'Single Post'}
            </span>
          </div>
        </div>

        {/* Product & Hook Angle Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {draft.product ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-threads-border bg-threads-surface px-2.5 py-0.5 text-xs text-threads-text font-medium">
              <Package className="h-3 w-3 text-threads-accent" />
              {draft.product.name}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-threads-border/50 bg-threads-surface/50 px-2.5 py-0.5 text-xs text-threads-secondary">
              <Package className="h-3 w-3 text-threads-muted" />
              Umum / Tanpa Produk
            </span>
          )}

          {draft.hookAngle && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/5 px-2.5 py-0.5 text-xs text-amber-300">
              <Sparkles className="h-3 w-3 text-amber-400" />
              {draft.hookAngle}
            </span>
          )}
        </div>

        {/* Title */}
        <Link href={`/drafts/${draft.id}`} className="block group/title">
          <h3 className="text-base font-semibold tracking-tight text-threads-text line-clamp-1 group-hover/title:text-threads-accent transition-colors">
            {draft.title}
          </h3>
        </Link>

        {/* Post Preview Snippet */}
        <div className="rounded-lg border border-threads-border/80 bg-threads-bg/80 p-3.5 space-y-2">
          <div className="text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap line-clamp-3 font-sans">
            {firstPost}
          </div>

          {/* Expanded thread content */}
          {expandedThread && remainingCount > 0 && (
            <div className="mt-3 space-y-2.5 border-t border-threads-border/60 pt-3">
              {posts.slice(1).map((item, idx) => (
                <div key={item.id || idx} className="space-y-1">
                  <span className="text-[10px] font-semibold text-threads-secondary uppercase tracking-wider">
                    Post {idx + 2} dari {posts.length}
                  </span>
                  <div className="text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap">
                    {item.content}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Thread expand toggle */}
          {remainingCount > 0 && (
            <button
              type="button"
              onClick={() => setExpandedThread(!expandedThread)}
              className="flex items-center gap-1 text-[11px] font-medium text-threads-accent hover:underline pt-1"
            >
              {expandedThread ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  Sembunyikan {remainingCount} post lainnya
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  + {remainingCount} post lanjutan dalam thread
                </>
              )}
            </button>
          )}
        </div>

        {/* Published Link if published */}
        {draft.status === 'PUBLISHED' && draft.threadPostUrl && (
          <div className="flex items-center justify-between rounded-lg border border-sky-500/30 bg-sky-500/5 px-3 py-2 text-xs">
            <span className="text-sky-300 font-medium flex items-center gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              Live di Threads
            </span>
            <a
              href={draft.threadPostUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-threads-accent hover:underline text-xs font-semibold flex items-center gap-1"
            >
              Buka Post ↗
            </a>
          </div>
        )}

        {/* Error Banner if failed */}
        {draft.status === 'FAILED' && draft.errorMessage && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-rose-200">Gagal Memposting:</span>
              <p className="text-[11px] text-rose-300/90 leading-tight">{draft.errorMessage}</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer / Actions */}
      <div className="mt-5 flex items-center justify-between gap-2 border-t border-threads-border pt-4">
        {/* Left side actions: Edit & Quick status */}
        <div className="flex items-center gap-2">
          <Link
            href={`/drafts/${draft.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-threads-border bg-threads-surface px-3 py-1.5 text-xs font-medium text-threads-text transition-colors hover:bg-threads-border"
          >
            <Edit3 className="h-3.5 w-3.5 text-threads-secondary" />
            Editor Live
          </Link>

          {draft.status === 'PENDING_REVIEW' && onApprove && (
            <button
              type="button"
              onClick={handleQuickApprove}
              disabled={isApproving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
            >
              {isApproving ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Setujui
            </button>
          )}

          {draft.status === 'FAILED' && onApprove && (
            <button
              type="button"
              onClick={handleQuickApprove}
              disabled={isApproving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-500 disabled:opacity-50"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isApproving && 'animate-spin')} />
              Coba Ulang / Approve
            </button>
          )}
        </div>

        {/* Delete action */}
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(draft)}
            className="rounded-lg p-1.5 text-threads-secondary transition-colors hover:bg-rose-500/10 hover:text-rose-400"
            title="Hapus Draft"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
