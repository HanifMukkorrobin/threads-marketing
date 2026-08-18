import { prisma } from '@/lib/prisma';
import { InsightRange, ThreadsInsightData, DailyInsightPoint, ThreadsInsightSummary } from '@/types/insights';

const DAY_NAMES_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const FULL_DAY_NAMES_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTH_NAMES_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function formatDateLabel(date: Date): { dayLabel: string; fullDateLabel: string } {
  const dayIdx = date.getDay();
  const day = date.getDate();
  const month = MONTH_NAMES_ID[date.getMonth()];
  const year = date.getFullYear();

  return {
    dayLabel: DAY_NAMES_ID[dayIdx],
    fullDateLabel: `${FULL_DAY_NAMES_ID[dayIdx]}, ${day} ${month} ${year}`,
  };
}

function getRangeDays(range: InsightRange): number {
  switch (range) {
    case '14d':
      return 14;
    case '30d':
      return 30;
    case '7d':
    default:
      return 7;
  }
}

export async function generateRealisticBaseline(days: number): Promise<void> {
  const publishedCount = await prisma.contentDraft.count({
    where: { status: 'PUBLISHED' },
  });

  const baseMultiplier = Math.max(1, publishedCount > 0 ? publishedCount * 1.4 : 3);
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isPeakWeekday = dayOfWeek === 4 || dayOfWeek === 5; // Thu, Fri

    const dayWeight = isPeakWeekday ? 1.35 : isWeekend ? 0.85 : 1.05;
    const variance = 1 + Math.sin(i * 1.5) * 0.15;

    const views = Math.round(1200 * baseMultiplier * dayWeight * variance + Math.floor(Math.random() * 200));
    const likes = Math.round(views * (0.058 + Math.random() * 0.015));
    const replies = Math.round(views * (0.018 + Math.random() * 0.008));
    const reposts = Math.round(views * (0.009 + Math.random() * 0.004));
    const followers = Math.round(850 + (days - i) * 12 + Math.floor(views * 0.008));

    await prisma.threadsMetricSnapshot.upsert({
      where: { date: dateStr },
      update: {
        views,
        likes,
        replies,
        reposts,
        followersCount: followers,
      },
      create: {
        date: dateStr,
        views,
        likes,
        replies,
        reposts,
        followersCount: followers,
        isLiveSynced: false,
      },
    });
  }
}

export async function getThreadsInsights(range: InsightRange = '7d'): Promise<ThreadsInsightData> {
  const days = getRangeDays(range);
  const today = new Date();

  const [tokenConfig, userConfig, usernameConfig, followersConfig] = await Promise.all([
    prisma.systemConfig.findUnique({ where: { key: 'THREADS_ACCESS_TOKEN' } }),
    prisma.systemConfig.findUnique({ where: { key: 'THREADS_USER_ID' } }),
    prisma.systemConfig.findUnique({ where: { key: 'STORE_USERNAME' } }),
    prisma.systemConfig.findUnique({ where: { key: 'THREADS_FOLLOWERS_COUNT' } }),
  ]);

  const token = tokenConfig?.value || process.env.THREADS_ACCESS_TOKEN;
  const isLiveConnected = Boolean(token);
  const realLiveFollowers = followersConfig?.value ? parseInt(followersConfig.value, 10) : 0;
  const accountHandle = usernameConfig?.value
    ? (usernameConfig.value.startsWith('@') ? usernameConfig.value : `@${usernameConfig.value}`)
    : (userConfig?.value || '@hades.zshrc');

  const targetDates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    targetDates.push(d.toISOString().split('T')[0]);
  }

  let snapshots = await prisma.threadsMetricSnapshot.findMany({
    where: {
      date: { in: targetDates },
    },
    orderBy: { date: 'asc' },
  });

  if (snapshots.length < days) {
    if (isLiveConnected) {
      // For live connected accounts, insert 0 for missing dates (true real activity)
      for (const dateStr of targetDates) {
        const exists = snapshots.some((s) => s.date === dateStr);
        if (!exists) {
          await prisma.threadsMetricSnapshot.upsert({
            where: { date: dateStr },
            update: {},
            create: {
              date: dateStr,
              views: 0,
              likes: 0,
              replies: 0,
              reposts: 0,
              followersCount: realLiveFollowers,
              isLiveSynced: true,
            },
          });
        }
      }
    } else {
      // Offline/unconnected demo mode fallback
      await generateRealisticBaseline(days);
    }

    snapshots = await prisma.threadsMetricSnapshot.findMany({
      where: {
        date: { in: targetDates },
      },
      orderBy: { date: 'asc' },
    });
  }

  let totalViews = 0;
  let totalLikes = 0;
  let totalReplies = 0;
  let totalReposts = 0;
  let maxEngagement = -1;
  let peakDay: string | null = null;
  let peakValue = 0;

  const series: DailyInsightPoint[] = targetDates.map((dateStr) => {
    const found = snapshots.find((s) => s.date === dateStr);
    const d = new Date(dateStr);
    const { dayLabel, fullDateLabel } = formatDateLabel(d);

    const views = found?.views || 0;
    const likes = found?.likes || 0;
    const replies = found?.replies || 0;
    const reposts = found?.reposts || 0;
    const engagements = likes + replies + reposts;
    const followersCount = isLiveConnected
      ? (realLiveFollowers || found?.followersCount || 0)
      : (found?.followersCount || 0);

    totalViews += views;
    totalLikes += likes;
    totalReplies += replies;
    totalReposts += reposts;

    if (engagements > maxEngagement) {
      maxEngagement = engagements;
      peakDay = dateStr;
      peakValue = engagements;
    }

    return {
      date: dateStr,
      dayLabel,
      fullDateLabel,
      views,
      likes,
      replies,
      reposts,
      engagements,
      followersCount,
    };
  });

  const totalEngagements = totalLikes + totalReplies + totalReposts;
  const avgEngagementRate = totalViews > 0 ? Number(((totalEngagements / totalViews) * 100).toFixed(1)) : 0;
  const currentFollowers = isLiveConnected
    ? realLiveFollowers
    : (series.length > 0 ? series[series.length - 1].followersCount : 0);

  // Growth rate calculation based on first half vs second half of series
  const halfLen = Math.floor(series.length / 2);
  const firstHalfTotal = series.slice(0, halfLen).reduce((acc, curr) => acc + curr.views + curr.engagements, 0);
  const secondHalfTotal = series.slice(halfLen).reduce((acc, curr) => acc + curr.views + curr.engagements, 0);
  const percentageGrowth = firstHalfTotal > 0
    ? Number((((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100).toFixed(1))
    : secondHalfTotal > 0 ? 100.0 : 0.0;

  const summary: ThreadsInsightSummary = {
    totalViews,
    totalEngagements,
    totalLikes,
    totalReplies,
    totalReposts,
    currentFollowers,
    avgEngagementRate,
    percentageGrowth,
    peakDay,
    peakValue,
  };

  return {
    range,
    isLiveSynced: isLiveConnected || snapshots.some((s) => s.isLiveSynced),
    accountHandle,
    summary,
    series,
  };
}

export async function syncThreadsMetricsFromMeta(
  customToken?: string,
  customUserId?: string
): Promise<{ success: boolean; message: string; isLive: boolean; syncedDays: number }> {
  try {
    let token: string | undefined;
    let userId: string | undefined;

    if (customToken !== undefined) {
      token = customToken || undefined;
    } else {
      const tokenConfig = await prisma.systemConfig.findUnique({ where: { key: 'THREADS_ACCESS_TOKEN' } });
      token = tokenConfig?.value || process.env.THREADS_ACCESS_TOKEN;
    }

    if (customUserId !== undefined) {
      userId = customUserId || undefined;
    } else {
      const userConfig = await prisma.systemConfig.findUnique({ where: { key: 'THREADS_USER_ID' } });
      userId = userConfig?.value || process.env.THREADS_USER_ID;
    }

    if (!token) {
      // If no token provided, run baseline sync
      await generateRealisticBaseline(14);
      return {
        success: true,
        message: 'Token Meta Threads belum diatur. Menampilkan baseline insight cerdas.',
        isLive: false,
        syncedDays: 14,
      };
    }

    // 1. Fetch Profile info from Meta Graph API
    try {
      const profileUrl = `https://graph.threads.net/v1.0/me?fields=id,username,name,threads_profile_picture_url,threads_biography&access_token=${token}`;
      const profileRes = await fetch(profileUrl);
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        if (profileData.username) {
          await prisma.systemConfig.upsert({
            where: { key: 'STORE_USERNAME' },
            update: { value: profileData.username },
            create: { key: 'STORE_USERNAME', value: profileData.username, description: 'Threads Store Username' },
          });
        }
        if (profileData.threads_profile_picture_url) {
          await prisma.systemConfig.upsert({
            where: { key: 'STORE_AVATAR_URL' },
            update: { value: profileData.threads_profile_picture_url },
            create: { key: 'STORE_AVATAR_URL', value: profileData.threads_profile_picture_url, description: 'Threads Avatar URL' },
          });
        }
      }
    } catch (profErr) {
      console.warn('Could not sync profile metadata from Meta:', profErr);
    }

    // 2. Fetch User-Level Daily Insights from Meta Graph API (including followers_count)
    const metaApiUrl = `https://graph.threads.net/v1.0/${userId || 'me'}/threads_insights?metric=views,likes,replies,reposts,quotes,followers_count&period=day&access_token=${token}`;
    const response = await fetch(metaApiUrl, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.warn('Meta Threads Graph API sync returned error, keeping real cache:', errBody);
      return {
        success: true,
        message: 'Koneksi Meta Threads merespons dengan kendala akses. Menggunakan cache terakhir.',
        isLive: false,
        syncedDays: 0,
      };
    }

    const data = await response.json();
    const dailyMetrics: Record<string, { views: number; likes: number; replies: number; reposts: number }> = {};
    let latestFollowersCount: number | undefined;

    if (Array.isArray(data.data)) {
      for (const metric of data.data) {
        if (metric.name === 'followers_count') {
          const fVal = metric.total_value?.value ?? (Array.isArray(metric.values) && metric.values.length > 0 ? metric.values[metric.values.length - 1]?.value : undefined);
          if (typeof fVal === 'number') {
            latestFollowersCount = fVal;
          }
        }

        if (Array.isArray(metric.values)) {
          for (const v of metric.values) {
            const dateStr = v.end_time.split('T')[0];
            if (!dailyMetrics[dateStr]) {
              dailyMetrics[dateStr] = { views: 0, likes: 0, replies: 0, reposts: 0 };
            }
            if (metric.name === 'views') dailyMetrics[dateStr].views = (dailyMetrics[dateStr].views || 0) + (v.value || 0);
            if (metric.name === 'likes') dailyMetrics[dateStr].likes = (dailyMetrics[dateStr].likes || 0) + (v.value || 0);
            if (metric.name === 'replies') dailyMetrics[dateStr].replies = (dailyMetrics[dateStr].replies || 0) + (v.value || 0);
            if (metric.name === 'reposts' || metric.name === 'quotes') dailyMetrics[dateStr].reposts = (dailyMetrics[dateStr].reposts || 0) + (v.value || 0);
          }
        }
      }
    }

    if (latestFollowersCount !== undefined) {
      await prisma.systemConfig.upsert({
        where: { key: 'THREADS_FOLLOWERS_COUNT' },
        update: { value: String(latestFollowersCount) },
        create: { key: 'THREADS_FOLLOWERS_COUNT', value: String(latestFollowersCount), description: 'Total Live Followers' },
      });
    }

    // 3. Fetch Post-Level Insights to enrich daily metrics
    try {
      const postsUrl = `https://graph.threads.net/v1.0/me/threads?fields=id,timestamp&limit=50&access_token=${token}`;
      const postsRes = await fetch(postsUrl);
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        if (Array.isArray(postsData.data)) {
          for (const post of postsData.data) {
            const postDate = post.timestamp.split('T')[0];
            if (!dailyMetrics[postDate]) {
              dailyMetrics[postDate] = { views: 0, likes: 0, replies: 0, reposts: 0 };
            }

            const postInsightsUrl = `https://graph.threads.net/v1.0/${post.id}/insights?metric=views,likes,replies,reposts,quotes&access_token=${token}`;
            const postInsRes = await fetch(postInsightsUrl);
            if (postInsRes.ok) {
              const postInsData = await postInsRes.json();
              if (Array.isArray(postInsData.data)) {
                for (const m of postInsData.data) {
                  const val = m.values?.[0]?.value || m.total_value?.value || 0;
                  if (m.name === 'views') dailyMetrics[postDate].views = Math.max(dailyMetrics[postDate].views || 0, val);
                  if (m.name === 'likes') dailyMetrics[postDate].likes = (dailyMetrics[postDate].likes || 0) + val;
                  if (m.name === 'replies') dailyMetrics[postDate].replies = (dailyMetrics[postDate].replies || 0) + val;
                  if (m.name === 'reposts' || m.name === 'quotes') dailyMetrics[postDate].reposts = (dailyMetrics[postDate].reposts || 0) + val;
                }
              }
            }
          }
        }
      }
    } catch (postErr) {
      console.warn('Could not fetch detailed post metrics:', postErr);
    }

    // 4. Upsert aggregated real metrics into database
    let syncedDaysCount = 0;
    for (const [dateStr, metric] of Object.entries(dailyMetrics)) {
      await prisma.threadsMetricSnapshot.upsert({
        where: { date: dateStr },
        update: {
          views: metric.views,
          likes: metric.likes,
          replies: metric.replies,
          reposts: metric.reposts,
          followersCount: latestFollowersCount ?? 0,
          isLiveSynced: true,
        },
        create: {
          date: dateStr,
          views: metric.views,
          likes: metric.likes,
          replies: metric.replies,
          reposts: metric.reposts,
          followersCount: latestFollowersCount ?? 0,
          isLiveSynced: true,
        },
      });
      syncedDaysCount++;
    }

    return {
      success: true,
      message: `Berhasil menyinkronkan ${syncedDaysCount} hari data metrik langsung dari Meta Threads Graph API!`,
      isLive: true,
      syncedDays: syncedDaysCount,
    };
  } catch (err: any) {
    console.error('Error during Threads metric sync:', err);
    return {
      success: false,
      message: `Gagal sinkronisasi dari Meta: ${err.message}`,
      isLive: false,
      syncedDays: 0,
    };
  }
}
