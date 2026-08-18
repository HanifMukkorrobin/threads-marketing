'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  Eye,
  Flame,
  Users,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { InsightRange, InsightMetricType, ThreadsInsightData, DailyInsightPoint } from '@/types/insights';
import { cn } from '@/lib/utils';

interface ThreadsInsightsChartProps {
  onToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export function ThreadsInsightsChart({ onToast }: ThreadsInsightsChartProps) {
  const [range, setRange] = useState<InsightRange>('7d');
  const [metric, setMetric] = useState<InsightMetricType>('views');
  const [data, setData] = useState<ThreadsInsightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<DailyInsightPoint | null>(null);

  const fetchInsights = useCallback(async (selectedRange: InsightRange) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/insights?range=${selectedRange}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err: any) {
      console.error('Failed to load insights:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights(range);
  }, [range, fetchInsights]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      const res = await fetch('/api/insights/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (json.success) {
        onToast?.(json.message || 'Metrik Threads berhasil disinkronkan!', 'success');
        await fetchInsights(range);
      } else {
        onToast?.(json.error || 'Gagal sinkronisasi', 'error');
      }
    } catch (err: any) {
      onToast?.(err?.message || 'Terjadi kesalahan saat sync', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const series = data?.series || [];
  const summary = data?.summary;

  // Compute max value for current metric to scale bars
  const maxValue = Math.max(
    ...series.map((p) => {
      if (metric === 'views') return p.views;
      if (metric === 'engagements') return p.engagements;
      return p.followersCount;
    }),
    1
  );

  const getMetricValue = (p: DailyInsightPoint) => {
    if (metric === 'views') return p.views;
    if (metric === 'engagements') return p.engagements;
    return p.followersCount;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString('id-ID');
  };

  return (
    <div className="rounded-bento bg-surface border border-surface-border p-6 space-y-6 relative overflow-hidden bento-card">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <span>Threads Insights</span>
              <span className="text-xs font-normal text-ink-muted">// Account Analytics</span>
            </h3>

            {data?.isLiveSynced ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Meta Live
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-lime/20 text-ink text-[10px] font-bold border border-lime-dark/30">
                <Zap className="h-2.5 w-2.5 fill-lime" />
                Hermes Engine
              </span>
            )}
          </div>
          <p className="text-[11px] text-ink-muted">
            Monitoring performa interaksi, impresi, dan pertumbuhan akun {data?.accountHandle || '@hades.zshrc'}
          </p>
        </div>

        {/* Timeframe & Refresh Switcher */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Timeframe selector */}
          <div className="flex items-center rounded-full bg-surface-muted p-1 border border-surface-border">
            {(['7d', '14d', '30d'] as InsightRange[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={cn(
                  'px-3 py-1 text-[11px] font-bold rounded-full transition-all tap-effect',
                  range === r
                    ? 'bg-ink text-white shadow-sm'
                    : 'text-ink-secondary hover:text-ink'
                )}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            title="Sync Metrics"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface hover:bg-surface-hover border border-surface-border text-ink transition-all tap-effect disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', syncing && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Summary KPI Strip & Metric Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 pb-1 border-b border-surface-border">
        {/* Metric Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setMetric('views')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all tap-effect shrink-0',
              metric === 'views'
                ? 'bg-ink text-white shadow-sm'
                : 'bg-surface-muted text-ink-secondary hover:bg-surface-hover'
            )}
          >
            <Eye className="h-3 w-3" />
            <span>Views</span>
          </button>

          <button
            type="button"
            onClick={() => setMetric('engagements')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all tap-effect shrink-0',
              metric === 'engagements'
                ? 'bg-ink text-white shadow-sm'
                : 'bg-surface-muted text-ink-secondary hover:bg-surface-hover'
            )}
          >
            <Flame className="h-3 w-3" />
            <span>Engagements</span>
          </button>

          <button
            type="button"
            onClick={() => setMetric('followers')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all tap-effect shrink-0',
              metric === 'followers'
                ? 'bg-ink text-white shadow-sm'
                : 'bg-surface-muted text-ink-secondary hover:bg-surface-hover'
            )}
          >
            <Users className="h-3 w-3" />
            <span>Followers</span>
          </button>
        </div>

        {/* Highlight Stats Display */}
        <div className="flex items-baseline gap-3">
          <div className="text-right">
            <span className="text-xl sm:text-2xl font-black text-ink tracking-tight">
              {metric === 'views' && summary ? formatNumber(summary.totalViews) : null}
              {metric === 'engagements' && summary ? formatNumber(summary.totalEngagements) : null}
              {metric === 'followers' && summary ? formatNumber(summary.currentFollowers) : null}
            </span>
            <span className="text-[11px] font-semibold text-ink-muted ml-1.5">
              {metric === 'views' ? 'Total Tayangan' : metric === 'engagements' ? 'Total Interaksi' : 'Pengikut'}
            </span>
          </div>

          {summary && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-lime/20 px-2 py-0.5 text-[10px] font-black text-ink border border-lime-dark/30">
              <TrendingUp className="h-2.5 w-2.5 text-ink" />
              <span>+{summary.percentageGrowth}%</span>
            </span>
          )}

          {metric === 'engagements' && summary && (
            <span className="text-[11px] font-bold text-ink-muted">
              ER: <span className="text-ink font-extrabold">{summary.avgEngagementRate}%</span>
            </span>
          )}
        </div>
      </div>

      {/* Interactive Capsule Bar Chart Visualizer */}
      <div className="pt-2 pb-2 relative min-h-[220px] flex flex-col justify-end">
        {loading ? (
          <div className="flex items-center justify-center h-44 text-xs text-ink-muted">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            <span>Memuat insight grafik...</span>
          </div>
        ) : series.length === 0 ? (
          <div className="flex items-center justify-center h-44 text-xs text-ink-muted">
            <span>Tidak ada data metrik untuk rentang waktu ini.</span>
          </div>
        ) : (
          <>
            <div
              style={{ gridTemplateColumns: `repeat(${series.length}, minmax(0, 1fr))` }}
              className={cn(
                'grid items-end h-44 border-b border-surface-border pb-4 w-full',
                range === '7d' && 'gap-2 sm:gap-3',
                range === '14d' && 'gap-1 sm:gap-1.5',
                range === '30d' && 'gap-0.5 sm:gap-1'
              )}
            >
              {series.map((point, idx) => {
                const val = getMetricValue(point);
                // Safe height calculation: min 6% base for aesthetic slot indicator
                const heightPercent = maxValue > 0 && val > 0
                  ? Math.max(12, Math.min(100, Math.round((val / maxValue) * 100)))
                  : 6;

                const isHovered = hoveredPoint?.date === point.date;
                const isPeak = maxValue > 0 && val > 0 && summary?.peakDay === point.date;

                // Tooltip alignment to avoid clipping on edges
                const tooltipAlignClass =
                  idx < (range === '30d' ? 6 : 2)
                    ? 'left-0'
                    : idx > series.length - (range === '30d' ? 7 : 3)
                    ? 'right-0'
                    : 'left-1/2 -translate-x-1/2';

                // Label visibility rule for 14d and 30d
                const showLabelOnMobile =
                  range === '7d' ||
                  (range === '14d' && (idx % 2 === 0 || idx === series.length - 1)) ||
                  (range === '30d' && (idx === 0 || idx === series.length - 1 || (idx + 1) % 5 === 0));

                const showLabelOnDesktop =
                  range === '7d' ||
                  range === '14d' ||
                  (range === '30d' && (idx === 0 || idx === series.length - 1 || (idx + 1) % 3 === 0));

                return (
                  <div
                    key={point.date}
                    className="flex flex-col items-center gap-1.5 h-full justify-end group cursor-pointer relative"
                    onMouseEnter={() => setHoveredPoint(point)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    {/* Floating Tooltip */}
                    {isHovered && (
                      <div
                        className={cn(
                          'absolute -top-28 z-30 flex flex-col gap-1 p-2.5 rounded-xl bg-dock text-white text-[10px] shadow-2xl border border-zinc-800 pointer-events-none min-w-[135px] animate-scale-in',
                          tooltipAlignClass
                        )}
                      >
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-1">
                          <span className="font-bold text-lime text-[11px] truncate max-w-[110px]">
                            {point.fullDateLabel}
                          </span>
                          {isPeak && (
                            <span className="px-1 py-0.2 rounded bg-lime text-ink text-[8px] font-black">
                              PEAK
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center pt-0.5">
                          <span className="text-zinc-400">Views:</span>
                          <span className="font-bold">{point.views.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">Likes / Replies:</span>
                          <span className="font-bold">{point.likes} / {point.replies}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400">Reposts:</span>
                          <span className="font-bold">{point.reposts}</span>
                        </div>
                        <div className="flex justify-between items-center text-zinc-300 pt-0.5 border-t border-zinc-800">
                          <span className="text-lime">Total Interaksi:</span>
                          <span className="font-extrabold text-lime">{point.engagements}</span>
                        </div>
                      </div>
                    )}

                    {/* Capsule Pill Column */}
                    <div
                      className={cn(
                        'relative w-full flex flex-col justify-end items-center h-32 bg-surface-muted rounded-full overflow-hidden transition-all duration-200 group-hover:ring-2 group-hover:ring-lime',
                        range === '7d' && 'max-w-[28px] p-0.5',
                        range === '14d' && 'max-w-[16px] p-0.5',
                        range === '30d' && 'max-w-[10px] p-[1px]'
                      )}
                    >
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={cn(
                          'w-full rounded-full transition-all duration-500 relative',
                          val === 0
                            ? 'bg-zinc-300 dark:bg-zinc-700/40'
                            : isHovered || isPeak
                            ? 'bg-lime shadow-[0_0_8px_rgba(226,253,82,0.6)]'
                            : 'bg-ink group-hover:bg-zinc-800'
                        )}
                      >
                        {/* Sub-bar fill if in Views mode showing Engagements ratio */}
                        {metric === 'views' && point.views > 0 && (
                          <div
                            style={{ height: `${Math.min(100, Math.round((point.engagements / point.views) * 400))}%` }}
                            className="w-full absolute bottom-0 bg-lime rounded-full"
                          />
                        )}
                      </div>
                    </div>

                    {/* Day / Date Label */}
                    <div className="h-4 flex items-center justify-center">
                      {range === '7d' ? (
                        <span
                          className={cn(
                            'text-[10px] font-semibold transition-colors',
                            isHovered ? 'text-ink font-bold' : 'text-ink-secondary'
                          )}
                        >
                          {point.dayLabel}
                        </span>
                      ) : (
                        <>
                          <span
                            className={cn(
                              'text-[9px] font-semibold transition-colors',
                              isHovered ? 'text-ink font-bold' : 'text-ink-muted',
                              showLabelOnMobile ? 'block' : 'hidden',
                              showLabelOnDesktop ? 'sm:block' : 'sm:hidden'
                            )}
                          >
                            {point.date.slice(8)}
                          </span>
                          {!showLabelOnMobile && !showLabelOnDesktop && (
                            <span className="h-1 w-1 rounded-full bg-surface-border hidden sm:block" />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
