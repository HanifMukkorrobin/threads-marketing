import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { GET as getInsights } from '../src/app/api/insights/route';
import { POST as syncInsights } from '../src/app/api/insights/sync/route';

describe('Threads Insights REST APIs', () => {
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

  describe('GET /api/insights', () => {
    it('returns 7d insights by default', async () => {
      const req = new NextRequest('http://localhost:3000/api/insights');
      const res = await getInsights(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.range).toBe('7d');
      expect(body.data.series).toHaveLength(7);
      expect(body.data.summary.totalViews).toBeGreaterThan(0);
    });

    it('returns 14d and 30d insights when requested', async () => {
      const req14 = new NextRequest('http://localhost:3000/api/insights?range=14d');
      const res14 = await getInsights(req14);
      const body14 = await res14.json();
      expect(body14.data.range).toBe('14d');
      expect(body14.data.series).toHaveLength(14);

      const req30 = new NextRequest('http://localhost:3000/api/insights?range=30d');
      const res30 = await getInsights(req30);
      const body30 = await res30.json();
      expect(body30.data.range).toBe('30d');
      expect(body30.data.series).toHaveLength(30);
    });
  });

  describe('POST /api/insights/sync', () => {
    it('handles sync trigger and returns success status', async () => {
      const req = new NextRequest('http://localhost:3000/api/insights/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const res = await syncInsights(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.message).toBeDefined();
    });
  });
});
