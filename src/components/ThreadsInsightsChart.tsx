'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Eye,
  Flame,
  Users,
  RefreshCw,
  Zap,
} from 'lucide-react';
import {
  ThreadsInsightsResponse,
  InsightDataPoint,
  InsightRange,
  InsightMetricType,
} from '@/types/insights';
import { cn } from '@/lib/utils';

interface ThreadsInsightsChartProps {
  onToast?: (message: string, type: 'success' | 'info' | 'error') => void;
}

export function ThreadsInsightsChart({ onToast }: ThreadsInsightsChartProps) {
  const [data, setData] = useState<ThreadsInsightsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [range, setRange] = useState<InsightRange>('7d');
  const [metric, setMetric] = useState<InsightMetricType>('views');
  const [hoveredPoint, setHoveredPoint] = useState<InsightDataPoint | null>(null);

  const fetchInsights = useCallback(async (selectedRange: InsightRange) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/insights?range=${selectedRange}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch {
      if (onToast) onToast('Gagal memuat analitik Threads', 'error');
    } finally {
      setLoading(false);
    }
  }, [onToast]);

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
        if (onToast) {
          onToast(
            json.isLiveSynced
              ? 'Data metrik live Meta Threads berhasil diperbarui!'
              : 'Data insight diperbarui dengan simulasi pertumbuhan cerdas.',
            'success'
          );
        }
        await fetchInsights(range);
      }
    } catch {
      if (onToast) onToast('Gagal melakukan sinkronisasi analitik', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const series = useMemo(() => data?.series || [], [data]);
  const summary = useMemo(() => data?.summary, [data]);

  const getMetricValue = useCallback((point: InsightDataPoint): number => {
    if (metric === 'views') return point.views;
    if (metric === 'engagements') return point.engagements;
    return point.followersCount;
  }, [metric]);

  const maxValue = useMemo(() => {
    if (series.length === 0) return 100;
    const values = series.map((p) => getMetricValue(p));
    const max = Math.max(...values);
    return max === 0 ? 10 : Math.ceil(max * 1.25);
  }, [series, getMetricValue]);

  const formatNumber = (num: number): string => {
    return num.toLocaleString('id-ID');
  };

  return (
    <div className="rounded-retro-sm bg-[#FAF6EE] border-2 border-[#181816] p-4 sm:p-5 space-y-4 shadow-[4px_4px_0px_0px_#181816]">
      {/* Header Row: Title, Meta Status & Timeframe Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#181816] pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-black text-[#181816] uppercase tracking-wide">
              Threads Insights
            </h3>
            <span className="text-[10px] font-mono text-[#7A7468] font-bold">// 90s Analytics</span>
          </div>

          <div className="flex items-center gap-2">
            {data?.isLiveSynced ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-retro-xs bg-[#6B9AC4] text-white text-[9px] font-black border border-[#181816] shadow-[1px_1px_0px_0px_#181816] uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                Meta Live
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-retro-xs bg-[#D8C49D] text-[#181816] text-[9px] font-black border border-[#181816] shadow-[1px_1px_0px_0px_#181816] uppercase">
                <Zap className="h-2.5 w-2.5 fill-[#181816]" />
                Hermes Baseline
              </span>
            )}
            <span className="text-[10px] text-[#4A463F] font-semibold truncate max-w-[160px]">
              {data?.accountHandle || '@tokodigital.id'}
            </span>
          </div>
        </div>

        {/* Timeframe selector & Sync button */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <div className="flex items-center rounded-retro-xs bg-white p-0.5 border-2 border-[#181816] shadow-[1.5px_1.5px_0px_0px_#181816]">
            {(['7d', '14d', '30d'] as InsightRange[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={cn(
                  'px-2.5 py-1 text-[10px] font-black rounded-none transition-all uppercase tracking-wider',
                  range === r
                    ? 'bg-[#6B9AC4] text-white shadow-[1px_1px_0px_0px_#181816]'
                    : 'text-[#181816] hover:bg-[#FAF6EE]'
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
            className="flex h-8 w-8 items-center justify-center rounded-retro-xs bg-white hover:bg-[#D8C49D] border-2 border-[#181816] text-[#181816] transition-all tap-effect shadow-[1.5px_1.5px_0px_0px_#181816] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5 stroke-[2.5]', syncing && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Row 2: Segmented Metric Selector Tabs */}
      <div className="grid grid-cols-3 gap-1.5 bg-white p-1 rounded-retro-xs border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816]">
        <button
          type="button"
          onClick={() => setMetric('views')}
          className={cn(
            'flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-retro-xs text-[11px] font-black transition-all uppercase tracking-wider border',
            metric === 'views'
              ? 'bg-[#6B9AC4] text-white border-[#181816] shadow-[1.5px_1.5px_0px_0px_#181816]'
              : 'bg-transparent text-[#181816] border-transparent hover:bg-[#FAF6EE]'
          )}
        >
          <Eye className="h-3.5 w-3.5 stroke-[2.5]" />
          <span>Views</span>
        </button>

        <button
          type="button"
          onClick={() => setMetric('engagements')}
          className={cn(
            'flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-retro-xs text-[11px] font-black transition-all uppercase tracking-wider border',
            metric === 'engagements'
              ? 'bg-[#C95D53] text-white border-[#181816] shadow-[1.5px_1.5px_0px_0px_#181816]'
              : 'bg-transparent text-[#181816] border-transparent hover:bg-[#FAF6EE]'
          )}
        >
          <Flame className="h-3.5 w-3.5 stroke-[2.5]" />
          <span>Interaksi</span>
        </button>

        <button
          type="button"
          onClick={() => setMetric('followers')}
          className={cn(
            'flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-retro-xs text-[11px] font-black transition-all uppercase tracking-wider border',
            metric === 'followers'
              ? 'bg-[#D8C49D] text-[#181816] border-[#181816] shadow-[1.5px_1.5px_0px_0px_#181816]'
              : 'bg-transparent text-[#181816] border-transparent hover:bg-[#FAF6EE]'
          )}
        >
          <Users className="h-3.5 w-3.5 stroke-[2.5]" />
          <span>Followers</span>
        </button>
      </div>

      {/* Row 3: Highlight Stats Counter */}
      <div className="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-retro-xs border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816]">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black text-[#181816] tracking-tight leading-none">
            {metric === 'views' && summary ? formatNumber(summary.totalViews) : null}
            {metric === 'engagements' && summary ? formatNumber(summary.totalEngagements) : null}
            {metric === 'followers' && summary ? formatNumber(summary.currentFollowers) : null}
          </span>
          <span className="text-[11px] font-black text-[#7A7468] uppercase tracking-wider">
            {metric === 'views' ? 'Total Tayangan' : metric === 'engagements' ? 'Total Interaksi' : 'Pengikut Aktif'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {summary && (
            <span className="inline-flex items-center gap-1 rounded-retro-xs bg-[#6B9AC4] text-white px-2 py-0.5 text-[10px] font-black border border-[#181816] shadow-[1px_1px_0px_0px_#181816]">
              <TrendingUp className="h-3 w-3 stroke-[3]" />
              <span>+{summary.percentageGrowth}%</span>
            </span>
          )}

          {metric === 'engagements' && summary && (
            <span className="text-[10px] font-black text-[#7A7468] bg-[#FAF6EE] px-1.5 py-0.5 rounded-retro-xs border border-[#181816]">
              ER: <span className="text-[#181816]">{summary.avgEngagementRate}%</span>
            </span>
          )}
        </div>
      </div>

      {/* Row 4: Capsule Bar Chart Visualizer */}
      <div className="pt-2 pb-1 relative min-h-[200px] flex flex-col justify-end">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-xs text-[#7A7468] font-bold">
            <RefreshCw className="h-4 w-4 animate-spin mr-2 stroke-[2.5]" />
            <span>Memuat data analitik...</span>
          </div>
        ) : series.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-xs text-[#7A7468] font-bold">
            <span>Tidak ada data untuk rentang waktu ini.</span>
          </div>
        ) : (
          <div
            style={{ gridTemplateColumns: `repeat(${series.length}, minmax(0, 1fr))` }}
            className={cn(
              'grid items-end h-40 border-b-2 border-[#181816] pb-2 w-full',
              range === '7d' && 'gap-2 sm:gap-3',
              range === '14d' && 'gap-1 sm:gap-1.5',
              range === '30d' && 'gap-0.5 sm:gap-1'
            )}
          >
            {series.map((point, idx) => {
              const val = getMetricValue(point);
              const heightPercent = maxValue > 0 && val > 0
                ? Math.max(12, Math.min(100, Math.round((val / maxValue) * 100)))
                : 6;

              const isHovered = hoveredPoint?.date === point.date;
              const isPeak = maxValue > 0 && val > 0 && summary?.peakDay === point.date;

              const tooltipAlignClass =
                idx < (range === '30d' ? 6 : 2)
                  ? 'left-0'
                  : idx > series.length - (range === '30d' ? 7 : 3)
                  ? 'right-0'
                  : 'left-1/2 -translate-x-1/2';

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
                  {/* Floating Retro Tooltip */}
                  {isHovered && (
                    <div
                      className={cn(
                        'absolute -top-32 z-30 flex flex-col gap-1 p-2.5 rounded-retro-xs bg-white text-[#181816] text-[10px] shadow-[3px_3px_0px_0px_#181816] border-2 border-[#181816] pointer-events-none min-w-[140px] animate-scale-in',
                        tooltipAlignClass
                      )}
                    >
                      <div className="flex items-center justify-between border-b-2 border-[#181816] pb-1">
                        <span className="font-black text-[#181816] text-xs truncate max-w-[100px]">
                          {point.fullDateLabel}
                        </span>
                        {isPeak && (
                          <span className="px-1 py-0.2 rounded-retro-xs bg-[#C95D53] text-white text-[8px] font-black border border-[#181816]">
                            PEAK
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center pt-0.5 font-bold">
                        <span className="text-[#7A7468]">Views:</span>
                        <span className="font-black">{point.views.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-[#7A7468]">Likes/Replies:</span>
                        <span className="font-black">{point.likes} / {point.replies}</span>
                      </div>
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-[#7A7468]">Reposts:</span>
                        <span className="font-black">{point.reposts}</span>
                      </div>
                      <div className="flex justify-between items-center text-[#181816] pt-1 border-t-2 border-[#181816] font-black">
                        <span>Total Interaksi:</span>
                        <span className="bg-[#D8C49D] px-1 rounded-retro-xs border border-[#181816]">{point.engagements}</span>
                      </div>
                    </div>
                  )}

                  {/* Capsule Pill Column */}
                  <div
                    className={cn(
                      'relative w-full flex flex-col justify-end items-center h-28 bg-white border-2 border-[#181816] rounded-retro-xs overflow-hidden transition-all duration-150 group-hover:bg-[#FAF6EE] shadow-[1px_1px_0px_0px_#181816]',
                      range === '7d' && 'max-w-[28px]',
                      range === '14d' && 'max-w-[16px]',
                      range === '30d' && 'max-w-[10px]'
                    )}
                  >
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={cn(
                        'w-full transition-all duration-300 relative border-t-2 border-[#181816]',
                        val === 0
                          ? 'bg-[#E8DBC0]'
                          : isHovered || isPeak
                          ? 'bg-[#C95D53]'
                          : 'bg-[#6B9AC4] group-hover:bg-[#5386B4]'
                      )}
                    >
                      {metric === 'views' && point.views > 0 && (
                        <div
                          style={{ height: `${Math.min(100, Math.round((point.engagements / point.views) * 400))}%` }}
                          className="w-full absolute bottom-0 bg-[#D8C49D] border-t border-[#181816]"
                        />
                      )}
                    </div>
                  </div>

                  {/* Day / Date Label */}
                  <div className="h-4 flex items-center justify-center font-black">
                    {range === '7d' ? (
                      <span
                        className={cn(
                          'text-[10px] transition-colors uppercase',
                          isHovered ? 'text-[#181816] underline' : 'text-[#7A7468]'
                        )}
                      >
                        {point.dayLabel}
                      </span>
                    ) : (
                      <>
                        <span
                          className={cn(
                            'text-[9px] transition-colors',
                            isHovered ? 'text-[#181816] underline' : 'text-[#7A7468]',
                            showLabelOnMobile ? 'block' : 'hidden',
                            showLabelOnDesktop ? 'sm:block' : 'sm:hidden'
                          )}
                        >
                          {point.date.slice(8)}
                        </span>
                        {!showLabelOnMobile && !showLabelOnDesktop && (
                          <span className="h-1 w-1 rounded-full bg-[#181816] hidden sm:block" />
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
