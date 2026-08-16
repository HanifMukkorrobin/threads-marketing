import React from 'react';
import {
  Clock,
  CheckCircle2,
  Calendar,
  ExternalLink,
  AlertTriangle,
  FileEdit,
} from 'lucide-react';
import { DraftStatus } from '@/types/draft';
import { cn } from '@/lib/utils';

interface DraftStatusBadgeProps {
  status: DraftStatus | string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  showIcon?: boolean;
}

export function DraftStatusBadge({
  status,
  size = 'sm',
  className,
  showIcon = true,
}: DraftStatusBadgeProps) {
  switch (status) {
    case 'PENDING_REVIEW':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors',
            'border-amber-500/30 bg-amber-500/10 text-amber-400',
            size === 'xs' && 'px-2 py-0.5 text-[10px]',
            size === 'sm' && 'px-2.5 py-1 text-xs',
            size === 'md' && 'px-3 py-1.5 text-sm',
            className
          )}
        >
          {showIcon && <Clock className={size === 'xs' ? 'h-3 w-3' : 'h-3.5 w-3.5 text-amber-400'} />}
          <span>Menunggu Review</span>
        </span>
      );

    case 'APPROVED':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors',
            'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
            size === 'xs' && 'px-2 py-0.5 text-[10px]',
            size === 'sm' && 'px-2.5 py-1 text-xs',
            size === 'md' && 'px-3 py-1.5 text-sm',
            className
          )}
        >
          {showIcon && <CheckCircle2 className={size === 'xs' ? 'h-3 w-3' : 'h-3.5 w-3.5 text-emerald-400'} />}
          <span>Siap Diposting</span>
        </span>
      );

    case 'SCHEDULED':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors',
            'border-indigo-500/30 bg-indigo-500/10 text-indigo-400',
            size === 'xs' && 'px-2 py-0.5 text-[10px]',
            size === 'sm' && 'px-2.5 py-1 text-xs',
            size === 'md' && 'px-3 py-1.5 text-sm',
            className
          )}
        >
          {showIcon && <Calendar className={size === 'xs' ? 'h-3 w-3' : 'h-3.5 w-3.5 text-indigo-400'} />}
          <span>Dijadwalkan</span>
        </span>
      );

    case 'PUBLISHED':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors',
            'border-sky-500/30 bg-sky-500/10 text-sky-400',
            size === 'xs' && 'px-2 py-0.5 text-[10px]',
            size === 'sm' && 'px-2.5 py-1 text-xs',
            size === 'md' && 'px-3 py-1.5 text-sm',
            className
          )}
        >
          {showIcon && <ExternalLink className={size === 'xs' ? 'h-3 w-3' : 'h-3.5 w-3.5 text-sky-400'} />}
          <span>Terpublikasi</span>
        </span>
      );

    case 'FAILED':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors',
            'border-rose-500/30 bg-rose-500/10 text-rose-400',
            size === 'xs' && 'px-2 py-0.5 text-[10px]',
            size === 'sm' && 'px-2.5 py-1 text-xs',
            size === 'md' && 'px-3 py-1.5 text-sm',
            className
          )}
        >
          {showIcon && <AlertTriangle className={size === 'xs' ? 'h-3 w-3' : 'h-3.5 w-3.5 text-rose-400'} />}
          <span>Gagal Diposting</span>
        </span>
      );

    default:
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors',
            'border-threads-border bg-threads-card text-threads-secondary',
            size === 'xs' && 'px-2 py-0.5 text-[10px]',
            size === 'sm' && 'px-2.5 py-1 text-xs',
            size === 'md' && 'px-3 py-1.5 text-sm',
            className
          )}
        >
          {showIcon && <FileEdit className="h-3.5 w-3.5 text-threads-secondary" />}
          <span>{status || 'Draft'}</span>
        </span>
      );
  }
}
