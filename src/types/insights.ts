export type InsightRange = '7d' | '14d' | '30d';
export type InsightMetricType = 'views' | 'engagements' | 'followers';

export interface DailyInsightPoint {
  date: string; // YYYY-MM-DD
  dayLabel: string; // "Sen", "Sel", etc.
  fullDateLabel: string; // "Senin, 17 Agu 2026"
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  engagements: number; // likes + replies + reposts
  followersCount: number;
}

export interface ThreadsInsightSummary {
  totalViews: number;
  totalEngagements: number;
  totalLikes: number;
  totalReplies: number;
  totalReposts: number;
  currentFollowers: number;
  avgEngagementRate: number; // percentage e.g. 6.8
  percentageGrowth: number; // percentage e.g. +14.2
  peakDay: string | null;
  peakValue: number;
}

export interface ThreadsInsightData {
  range: InsightRange;
  isLiveSynced: boolean;
  accountHandle: string;
  summary: ThreadsInsightSummary;
  series: DailyInsightPoint[];
}
