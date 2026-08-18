import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/lib/prisma';

describe('ThreadsMetricSnapshot Database Model', () => {
  beforeAll(async () => {
    await prisma.threadsMetricSnapshot.deleteMany();
  });

  afterAll(async () => {
    await prisma.threadsMetricSnapshot.deleteMany();
    await prisma.$disconnect();
  });

  it('can create and query daily metric snapshot', async () => {
    const today = '2026-08-18';
    const snapshot = await prisma.threadsMetricSnapshot.create({
      data: {
        date: today,
        views: 4500,
        likes: 320,
        replies: 85,
        reposts: 40,
        followersCount: 1250,
        isLiveSynced: false,
      },
    });

    expect(snapshot.id).toBeDefined();
    expect(snapshot.date).toBe(today);
    expect(snapshot.views).toBe(4500);
    expect(snapshot.likes).toBe(320);
    expect(snapshot.replies).toBe(85);
    expect(snapshot.reposts).toBe(40);
    expect(snapshot.followersCount).toBe(1250);
    expect(snapshot.isLiveSynced).toBe(false);

    const found = await prisma.threadsMetricSnapshot.findUnique({
      where: { date: today },
    });
    expect(found).not.toBeNull();
    expect(found?.views).toBe(4500);
  });
});
