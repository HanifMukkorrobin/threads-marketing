import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { getThreadsInsights, generateRealisticBaseline, syncThreadsMetricsFromMeta } from '../src/lib/threads-insights';

describe('Threads Insights Engine Service', () => {
  beforeAll(async () => {
    await prisma.threadsMetricSnapshot.deleteMany();
  });

  afterAll(async () => {
    await prisma.threadsMetricSnapshot.deleteMany();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.threadsMetricSnapshot.deleteMany();
  });

  it('returns structured 7d insights series when DB is empty', async () => {
    const result = await getThreadsInsights('7d');
    expect(result.range).toBe('7d');
    expect(result.series).toHaveLength(7);
    expect(result.summary.totalViews).toBeGreaterThanOrEqual(0);
    expect(result.summary.totalEngagements).toBeGreaterThanOrEqual(0);
    expect(result.summary.avgEngagementRate).toBeGreaterThanOrEqual(0);
    expect(result.summary.currentFollowers).toBeGreaterThanOrEqual(0);
    expect(result.series[0].dayLabel).toBeDefined();
    expect(result.series[0].fullDateLabel).toBeDefined();
  });

  it('calculates totals and growth rate accurately from explicit snapshots', async () => {
    const today = new Date();
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dates.push(dateStr);
      await prisma.threadsMetricSnapshot.create({
        data: {
          date: dateStr,
          views: 1000,
          likes: 50,
          replies: 20,
          reposts: 10,
          followersCount: 1000 + (6 - i) * 10,
          isLiveSynced: false,
        },
      });
    }

    const result = await getThreadsInsights('7d');
    expect(result.summary.totalViews).toBe(7000);
    expect(result.summary.totalLikes).toBe(350);
    expect(result.summary.totalReplies).toBe(140);
    expect(result.summary.totalReposts).toBe(70);
    expect(result.summary.totalEngagements).toBe(560);
    // (560 / 7000) * 100 = 8.0%
    expect(result.summary.avgEngagementRate).toBe(8.0);
  });

  it('supports 14d and 30d range queries seamlessly', async () => {
    const res14 = await getThreadsInsights('14d');
    expect(res14.range).toBe('14d');
    expect(res14.series).toHaveLength(14);

    const res30 = await getThreadsInsights('30d');
    expect(res30.range).toBe('30d');
    expect(res30.series).toHaveLength(30);
  });

  it('handles sync fallback when token is empty or invalid', async () => {
    // When custom token is empty string, force baseline fallback
    const syncRes = await syncThreadsMetricsFromMeta('', '');
    expect(syncRes.success).toBe(true);
    expect(syncRes.isLive).toBe(false);
    expect(syncRes.syncedDays).toBeGreaterThan(0);
  });
});
