import React from 'react';
import {
  Calendar,
  AlertTriangle,
  FileEdit,
  Zap,
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
            'inline-flex items-center gap-1.5 rounded-retro-xs font-black transition-all uppercase tracking-wider',
            'bg-[#D8C49D] text-[#181816] border-2 border-[#181816] shadow-[1.5px_1.5px_0px_0px_#181816]',
            size === 'xs' && 'px-2 py-0.5 text-[10px]',
            size === 'sm' && 'px-2.5 py-1 text-xs',
            size === 'md' && 'px-3 py-1.5 text-sm',
            className
          )}
        >
          {showIcon && <span className="h-2 w-2 rounded-full bg-[#181816] animate-pulse" />}
          <span>Review</span>
        </span>
      );

    case 'APPROVED':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-retro-xs font-black transition-all uppercase tracking-wider',
            'bg-[#6B9AC4] text-white border-2 border-[#181816] shadow-[1.5px_1.5px_0px_0px_#181816]',
            size === 'xs' && 'px-2 py-0.5 text-[10px]',
            size === 'sm' && 'px-2.5 py-1 text-xs',
            size === 'md' && 'px-3 py-1.5 text-sm',
            className
          )}
        >
          {showIcon && <Zap className={cn('fill-white text-white', size === 'xs' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />}
          <span>Siap Posting</span>
        </span>
      );

    case 'SCHEDULED':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-retro-xs font-black transition-all uppercase tracking-wider',
            'bg-[#E8DBC0] text-[#181816] border-2 border-[#181816] shadow-[1.5px_1.5px_0px_0px_#181816]',
            size === 'xs' && 'px-2 py-0.5 text-[10px]',
            size === 'sm' && 'px-2.5 py-1 text-xs',
            size === 'md' && 'px-3 py-1.5 text-sm',
            className
          )}
        >
          {showIcon && <Calendar className={cn('text-[#181816] stroke-[2.5]', size === 'xs' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />}
          <span>Terjadwal</span>
        </span>
      );

    case 'PUBLISHED':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-retro-xs font-black transition-all uppercase tracking-wider',
            'bg-[#D8C49D] text-[#181816] border-2 border-[#181816] shadow-[1.5px_1.5px_0px_0px_#181816]',
            size === 'xs' && 'px-2 py-0.5 text-[10px]',
            size === 'sm' && 'px-2.5 py-1 text-xs',
            size === 'md' && 'px-3 py-1.5 text-sm',
            className
          )}
        >
          {showIcon && <span className="h-2 w-2 rounded-full bg-[#6B9AC4]" />}
          <span>Live Threads ↗</span>
        </span>
      );

    case 'FAILED':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-retro-xs font-black transition-all uppercase tracking-wider',
            'bg-[#C95D53] text-white border-2 border-[#181816] shadow-[1.5px_1.5px_0px_0px_#181816]',
            size === 'xs' && 'px-2 py-0.5 text-[10px]',
            size === 'sm' && 'px-2.5 py-1 text-xs',
            size === 'md' && 'px-3 py-1.5 text-sm',
            className
          )}
        >
          {showIcon && <AlertTriangle className={cn('text-white stroke-[2.5]', size === 'xs' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />}
          <span>Gagal Terbit</span>
        </span>
      );

    default:
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-retro-xs font-bold transition-all uppercase tracking-wider',
            'bg-white text-[#181816] border-2 border-[#181816] shadow-[1.5px_1.5px_0px_0px_#181816]',
            size === 'xs' && 'px-2 py-0.5 text-[10px]',
            size === 'sm' && 'px-2.5 py-1 text-xs',
            size === 'md' && 'px-3 py-1.5 text-sm',
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
 * Retro Pixel / Capsule Capacity Indicator
 */
export function BatteryCapacityDots({
  current = 3,
  total = 8,
  variant = 'denim',
  className,
}: {
  current?: number;
  total?: number;
  variant?: 'dark' | 'lime' | 'light' | 'denim';
  className?: string;
}) {
  const dots = Array.from({ length: total }, (_, i) => i < current);

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {dots.map((filled, idx) => (
        <span
          key={idx}
          className={cn(
            'h-5 w-2.5 rounded-none border-[1.5px] border-[#181816] transition-all duration-200',
            filled
              ? variant === 'denim'
                ? 'bg-[#6B9AC4] shadow-[1px_1px_0px_0px_#181816]'
                : variant === 'lime'
                ? 'bg-[#C95D53] shadow-[1px_1px_0px_0px_#181816]'
                : 'bg-[#6B9AC4] shadow-[1px_1px_0px_0px_#181816]'
              : 'bg-[#E8DBC0]/50 border-dashed border-[#181816]/40'
          )}
        />
      ))}
    </div>
  );
}
