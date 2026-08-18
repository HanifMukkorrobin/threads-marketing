# Threads Account Performance & Insights Analytics Visualizer - Design Spec

**Date:** 2026-08-18  
**Topic:** Dashboard Threads Insights & Performance Analytics Chart  
**Status:** Approved by User (Ready for Planning)

---

## 1. Overview & Objectives

Transform the static/dummy "Statistics // Pipeline Performance" weekly bar section on the main Dashboard into a high-value, interactive **Threads Account Insights & Performance Analytics Visualizer**.

### Key Goals:
1. **Actionable Marketing Intelligence**: Display real account-level and content-level Threads metrics including Daily Views/Impressions, Engagements (Likes, Replies, Reposts), Follower counts, and calculated Engagement Rates.
2. **Interactive Visual Controls**: Provide multi-metric switching (`Views`, `Engagements`, `Followers`), timeframe toggling (`7D`, `14D`, `30D`), and smooth interactive hover tooltips with daily breakdowns.
3. **Smart Fallback Architecture**: Seamlessly fetch live data from Meta Threads Graph API if `THREADS_ACCESS_TOKEN` is configured in Settings; otherwise, generate and cache realistic, dynamic baseline metrics correlating with published content drafts so the dashboard is immediately functional.
4. **Authentic Threads Aesthetic**: Adhere to `DESIGN.md` guidelines with dark pitch-black surfaces, electric lime accents, pill tags, and fluid micro-interactions.

---

## 2. Architecture & Data Model

### 2.1 Database Schema (`prisma/schema.prisma`)
Add a new time-series snapshot model:

```prisma
model ThreadsMetricSnapshot {
  id             String    @id @default(cuid())
  date           String    @unique // Format YYYY-MM-DD (e.g. "2026-08-18")
  views          Int       @default(0)
  likes          Int       @default(0)
  replies        Int       @default(0)
  reposts        Int       @default(0)
  followersCount Int       @default(0)
  isLiveSynced   Boolean   @default(false)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}
```

### 2.2 System Configuration Keys (`SystemConfig`)
- `THREADS_ACCESS_TOKEN`: Meta Threads user access token.
- `THREADS_USER_ID`: Meta Threads user/account ID.

---

## 3. Service Layer & Business Logic

### File: `src/lib/threads-insights.ts`

1. **`getThreadsInsights(range: '7d' | '14d' | '30d')`**:
   - Computes target date range based on current date.
   - Queries `ThreadsMetricSnapshot` records within the range.
   - **Auto-populate Baseline**: If records for requested dates are missing or empty, generates realistic dynamic baseline snapshots proportional to existing `PUBLISHED` content drafts and persists them.
   - Computes aggregated summary statistics:
     - `totalViews`, `totalLikes`, `totalReplies`, `totalReposts`, `totalEngagements`.
     - `avgEngagementRate`: `((totalEngagements / totalViews) * 100).toFixed(1)%`.
     - `percentageGrowth`: Trend compared to the previous equivalent timeframe.
     - `currentFollowers`: Most recent follower count.
     - `peakDay`: Date with highest engagement or views in the period.
   - Returns normalized array of daily data points for rendering.

2. **`syncThreadsMetricsFromMeta(token: string, userId: string)`**:
   - Calls Meta Graph API endpoint: `https://graph.threads.net/v1.0/me/threads_insights?metric=views,likes,replies,reposts,quotes&period=day`.
   - Upserts retrieved metrics into `ThreadsMetricSnapshot` with `isLiveSynced: true`.
   - Returns sync summary (`{ syncedDays: number, isLive: true }`).
   - If Meta API call fails or token is invalid, logs warning, returns structured error, and preserves previous cached data.

3. **`generateRealisticBaseline(days: number)`**:
   - Deterministically generates realistic time-series data with natural day-of-week variance (e.g., peak performance on Thursdays & Fridays).

---

## 4. REST API Specification

### 4.1 `GET /api/insights`
- **Query Parameters**:
  - `range` (optional, enum: `7d` | `14d` | `30d`, default: `7d`)
- **Response**:
```json
{
  "success": true,
  "data": {
    "range": "7d",
    "isLiveSynced": false,
    "summary": {
      "totalViews": 38420,
      "totalEngagements": 2840,
      "totalLikes": 1950,
      "totalReplies": 620,
      "totalReposts": 270,
      "currentFollowers": 1420,
      "avgEngagementRate": 7.4,
      "percentageGrowth": 16.8,
      "peakDay": "2026-08-15"
    },
    "series": [
      {
        "date": "2026-08-12",
        "dayLabel": "Rab",
        "fullDateLabel": "Rabu, 12 Agu 2026",
        "views": 4800,
        "likes": 240,
        "replies": 80,
        "reposts": 35,
        "engagements": 355,
        "followersCount": 1390
      }
    ]
  }
}
```

### 4.2 `POST /api/insights/sync`
- **Body**: `{}` (uses saved tokens) or `{ token?: string, userId?: string }`
- **Response**:
```json
{
  "success": true,
  "message": "Sinkronisasi metrik Threads berhasil",
  "isLiveSynced": true,
  "syncedDays": 7
}
```

---

## 5. UI / UX Design & Frontend Components

### 5.1 Component: `src/components/ThreadsInsightsChart.tsx`
- **Header**:
  - Title: `Threads Insights` with subtitle `// Account Analytics`.
  - Live Status Pill: `🟢 Meta Synced` or `⚡ Hermes Baseline Engine`.
  - Metric Switcher Tabs: `👁️ Views`, `🔥 Engagements`, `👥 Followers`.
  - Timeframe Switcher Pills: `7D`, `14D`, `30D`.
- **Top Summary KPIs**:
  - Big metric display (e.g. `38.4K Views`), Growth badge (`+16.8% ↗` in Electric Lime), and Avg Engagement Rate pill.
- **Capsule Chart Area**:
  - Dynamic height capsule bars matching Threads dark-charcoal & electric lime styling.
  - Interactive hover state: highlights current bar and displays a floating precision tooltip with full breakdown (Views, Likes, Replies, Reposts, Followers).
  - Responsive X-axis day/date formatting.

### 5.2 Dashboard Integration: `src/app/page.tsx`
- Replaces the hardcoded static `Statistics // Pipeline Performance` section in `src/app/page.tsx` with `<ThreadsInsightsChart />`.

### 5.3 Settings Integration: `src/app/settings/page.tsx`
- Form fields for `THREADS_ACCESS_TOKEN` and `THREADS_USER_ID`.
- "Test & Sync Meta Insights" trigger button with instant toast feedback.

---

## 6. Testing & Quality Assurance

1. **Unit & API Tests**:
   - `tests/api/insights.test.ts`: Verify `GET /api/insights` (7d, 14d, 30d, invalid params), fallback behavior, and `POST /api/insights/sync`.
   - `tests/lib/threads-insights.test.ts`: Verify aggregation calculations, engagement rates, and trend calculations.
2. **Database Isolation**:
   - All tests execute against `prisma/test.db`.
3. **Build & Type Check**:
   - `npm test` & `npm run build` pass with zero type errors.
