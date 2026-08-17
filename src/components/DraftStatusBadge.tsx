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
            'inline-flex items-center gap-1.5 rounded-full font-semibold transition-all',
            'bg-amber-50 text-amber-800 border border-amber-200/80 shadow-pill',
            size === 'xs' && 'px-2.5 py-0.5 text-[10px]',
            size === 'sm' && 'px-3 py-1 text-xs',
            size === 'md' && 'px-3.5 py-1.5 text-sm',
            className
          )}
        >
          {showIcon && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />}
          <span>Menunggu Review</span>
        </span>
      );

    case 'APPROVED':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full font-bold transition-all',
            'bg-lime text-ink border border-lime-dark/30 shadow-pill',
            size === 'xs' && 'px-2.5 py-0.5 text-[10px]',
            size === 'sm' && 'px-3 py-1 text-xs',
            size === 'md' && 'px-3.5 py-1.5 text-sm',
            className
          )}
        >
          {showIcon && <span className="h-1.5 w-1.5 rounded-full bg-ink" />}
          <span>Siap Diposting</span>
        </span>
      );

    case 'SCHEDULED':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full font-semibold transition-all',
            'bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-pill',
            size === 'xs' && 'px-2.5 py-0.5 text-[10px]',
            size === 'sm' && 'px-3 py-1 text-xs',
            size === 'md' && 'px-3.5 py-1.5 text-sm',
            className
          )}
        >
          {showIcon && <Calendar className={size === 'xs' ? 'h-3 w-3' : 'h-3.5 w-3.5 text-indigo-600'} />}
          <span>Dijadwalkan</span>
        </span>
      );

    case 'PUBLISHED':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full font-semibold transition-all',
            'bg-[#121214] text-white border border-black shadow-pill',
            size === 'xs' && 'px-2.5 py-0.5 text-[10px]',
            size === 'sm' && 'px-3 py-1 text-xs',
            size === 'md' && 'px-3.5 py-1.5 text-sm',
            className
          )}
        >
          {showIcon && <span className="h-1.5 w-1.5 rounded-full bg-lime" />}
          <span>Live Threads ↗</span>
        </span>
      );

    case 'FAILED':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full font-semibold transition-all',
            'bg-rose-50 text-rose-700 border border-rose-200/80 shadow-pill',
            size === 'xs' && 'px-2.5 py-0.5 text-[10px]',
            size === 'sm' && 'px-3 py-1 text-xs',
            size === 'md' && 'px-3.5 py-1.5 text-sm',
            className
          )}
        >
          {showIcon && <AlertTriangle className={size === 'xs' ? 'h-3 w-3' : 'h-3.5 w-3.5 text-rose-500'} />}
          <span>Gagal Terbit</span>
        </span>
      );

    default:
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full font-medium transition-all',
            'bg-surface text-ink-secondary border border-surface-border',
            size === 'xs' && 'px-2.5 py-0.5 text-[10px]',
            size === 'sm' && 'px-3 py-1 text-xs',
            size === 'md' && 'px-3.5 py-1.5 text-sm',
            className
          )}
        >
          {showIcon && <FileEdit className={size === 'xs' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />}
          <span>{status}</span>
        </span>
      );
  }
}

/**
 * Capsule Pill Battery Meter (as seen in the reference image)
 * Renders a row of rounded pills representing capacity/percentage
 */
export function BatteryCapacityDots({
  current = 3,
  total = 8,
  variant = 'dark',
  className,
}: {
  current?: number;
  total?: number;
  variant?: 'dark' | 'lime' | 'light';
  className?: string;
}) {
  const dots = Array.from({ length: total }, (_, i) => i < current);

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {dots.map((filled, idx) => (
        <span
          key={idx}
          className={cn(
            'h-6 w-3 rounded-full transition-all duration-300',
            filled
              ? variant === 'lime'
                ? 'bg-ink'
                : 'bg-ink'
              : variant === 'lime'
              ? 'border-2 border-dashed border-ink/30 bg-transparent'
              : 'border-2 border-dashed border-zinc-300 bg-transparent'
          )}
        />
      ))}
    </div>
  );
}
