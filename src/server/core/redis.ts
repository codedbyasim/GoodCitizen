import { redis } from '@devvit/web/server';
import type {
  AppConfig,
  AuditEntry,
  BadgeAchievement,
  BadgeTier,
  MilestoneConfig,
  PointEvent,
} from '../../shared/api';

// ─── Default Config ───────────────────────────────────────────────────────────

export const DEFAULT_MILESTONES: MilestoneConfig[] = [
  {
    points: 50,
    badge: 'new_member',
    flairText: '🌱 New Member',
    dmMessage:
      "🎉 Congratulations! You've earned the **New Member** badge in this community. Keep contributing quality content!",
  },
  {
    points: 150,
    badge: 'regular',
    flairText: '⭐ Regular',
    dmMessage:
      "🌟 You've reached **Regular** status! The community appreciates your consistent contributions. You've been highlighted in our community leaderboard!",
  },
  {
    points: 300,
    badge: 'contributor',
    flairText: '💎 Contributor',
    dmMessage:
      "💎 Amazing! You're now a **Contributor** — one of the most valued members of this community. The moderators thank you personally for your quality contributions.",
  },
  {
    points: 500,
    badge: 'veteran',
    flairText: '🔥 Veteran',
    dmMessage:
      "🔥 You've achieved **Veteran** status! You're now featured on the weekly leaderboard and recognized as a pillar of this community.",
  },
  {
    points: 1000,
    badge: 'community_star',
    flairText: '🌟 Community Star',
    dmMessage:
      "🌟 You are a **Community Star** — the highest honor in this community! A pinned recognition post has been created in your honor. Thank you for being extraordinary!",
  },
];

export const DEFAULT_CONFIG: AppConfig = {
  subredditPreset: 'default',
  pointLabel: 'points',
  firstPostBonus: 5,
  approvedPostBonus: 10,
  goodContributionBonus: 15,
  helpfulNominationBonus: 30,
  dailyUserCap: 100,
  dailyModAwardLimit: 3,
  milestones: DEFAULT_MILESTONES,
};

export const PRESETS: Record<'default' | 'learnprogramming' | 'personalfinance' | 'loseit', Partial<AppConfig>> = {
  default: {
    subredditPreset: 'default',
    pointLabel: 'points',
    milestones: DEFAULT_MILESTONES,
  },
  learnprogramming: {
    subredditPreset: 'learnprogramming',
    pointLabel: 'Mentor points',
    milestones: [
      {
        points: 50,
        badge: 'new_member',
        flairText: '🌱 Apprentice Mentor',
        dmMessage: '🎉 Congratulations! You are now an Apprentice Mentor in r/learnprogramming. Keep helping others learn to code!',
      },
      {
        points: 150,
        badge: 'regular',
        flairText: '⭐ Junior Mentor',
        dmMessage: '🌟 Great job! You have reached Junior Mentor status in r/learnprogramming.',
      },
      {
        points: 300,
        badge: 'contributor',
        flairText: '💎 Mentor',
        dmMessage: '💎 Awesome! You are officially a Mentor in r/learnprogramming. Thank you for your support!',
      },
      {
        points: 500,
        badge: 'veteran',
        flairText: '🔥 Senior Mentor',
        dmMessage: '🔥 Incredible! You are a Senior Mentor, a true pillar of the programming community.',
      },
      {
        points: 1000,
        badge: 'community_star',
        flairText: '🌟 Master Mentor',
        dmMessage: '🌟 You are now a Master Mentor! A pinned recognition post has been created for your outstanding programming mentorship.',
      },
    ],
  },
  personalfinance: {
    subredditPreset: 'personalfinance',
    pointLabel: 'Trusted advice points',
    milestones: [
      {
        points: 50,
        badge: 'new_member',
        flairText: '🌱 Trainee Advisor',
        dmMessage: '🎉 You have earned the Trainee Advisor badge. Thanks for sharing compliant financial advice!',
      },
      {
        points: 150,
        badge: 'regular',
        flairText: '⭐ Junior Advisor',
        dmMessage: '🌟 You are now a Junior Advisor. Your compliant answers make a difference!',
      },
      {
        points: 300,
        badge: 'contributor',
        flairText: '💎 Trusted Advisor',
        dmMessage: '💎 Excellent! You are now a Trusted Advisor in r/personalfinance.',
      },
      {
        points: 500,
        badge: 'veteran',
        flairText: '🔥 Senior Advisor',
        dmMessage: '🔥 Amazing! You are now a Senior Advisor, helping thousands secure their financial future.',
      },
      {
        points: 1000,
        badge: 'community_star',
        flairText: '🌟 Financial Guru',
        dmMessage: '🌟 You have achieved the ultimate status of Financial Guru!',
      },
    ],
  },
  loseit: {
    subredditPreset: 'loseit',
    pointLabel: 'Encourager points',
    milestones: [
      {
        points: 50,
        badge: 'new_member',
        flairText: '🌱 Welcomer',
        dmMessage: '🎉 Thanks for welcoming new members to their health journey!',
      },
      {
        points: 150,
        badge: 'regular',
        flairText: '⭐ Encourager',
        dmMessage: '🌟 You are now a Regular Encourager. Your kindness keeps people motivated!',
      },
      {
        points: 300,
        badge: 'contributor',
        flairText: '💎 Community Motivator',
        dmMessage: '💎 Splendid! You are now a Community Motivator.',
      },
      {
        points: 500,
        badge: 'veteran',
        flairText: '🔥 Wellness Champion',
        dmMessage: '🔥 Spectacular! You are now a Wellness Champion.',
      },
      {
        points: 1000,
        badge: 'community_star',
        flairText: '🌟 Beacon of Hope',
        dmMessage: '🌟 You are a Beacon of Hope! A pinned thread has been created to celebrate your incredible community motivation.',
      },
    ],
  },
};

// ─── Redis Keys ───────────────────────────────────────────────────────────────

export const KEYS = {
  /** Sorted set: all-time leaderboard. Member=username, Score=points */
  leaderboard: () => 'gc:leaderboard',

  /** Sorted set: weekly leaderboard. Member=username, Score=weeklyPoints */
  weeklyLeaderboard: (weekNum: number) => `gc:weekly:${weekNum}:lb`,

  /** Total points for a user */
  userPoints: (username: string) => `gc:user:${username}:points`,

  /** Badge tier for a user */
  userBadge: (username: string) => `gc:user:${username}:badge`,

  /** Capped list of point events for a user (JSON, max 50) */
  userHistory: (username: string) => `gc:user:${username}:history`,

  /** App config (JSON) */
  config: () => 'gc:config',

  /** Capped audit log (JSON, max 200) */
  audit: () => 'gc:audit',

  /** Capped badge achievements feed (JSON, max 30) */
  achievements: () => 'gc:achievements',

  /** Weekly stats counters */
  weeklyBadges: (week: number) => `gc:stats:${week}:badges`,
  weeklyAwards: (week: number) => `gc:stats:${week}:awards`,
  weeklyPoints: (week: number) => `gc:stats:${week}:points`,
  weeklyTopUser: (week: number) => `gc:stats:${week}:top_user`,

  /** Daily points total for a user (anti-abuse) */
  dailyUserTotal: (username: string, day: string) =>
    `gc:daily:${username}:${day}`,

  /** Daily award count from a mod to a specific user */
  dailyModAward: (mod: string, target: string, day: string) =>
    `gc:mod:${mod}:${target}:${day}`,

  /** Leaderboard post ID (so scheduler can update it) */
  leaderboardPostId: () => 'gc:leaderboard_post_id',

  /** First-post lock — prevents duplicate welcome bonus */
  firstPostLock: (username: string) => `gc:first_post_lock:${username}`,

  /** Trust Score variables */
  userTrustScore: (username: string) => `gc:user:${username}:trust_score`,
  userRemovals: (username: string) => `gc:user:${username}:removals`,
  userWarnings: (username: string) => `gc:user:${username}:warnings`,
  userRuleBreaks: (username: string) => `gc:user:${username}:rule_breaks`,
  userHelpfulAwards: (username: string) => `gc:user:${username}:helpful_awards`,
  weeklyReportViolations: (week: number) => `gc:stats:${week}:violations`,
  weeklyFlairUpgrades: (week: number) => `gc:stats:${week}:flair_upgrades`,
};

// ─── Config helpers ───────────────────────────────────────────────────────────

export async function getConfig(): Promise<AppConfig> {
  const raw = await redis.get(KEYS.config());
  if (!raw) return DEFAULT_CONFIG;
  try {
    return JSON.parse(raw) as AppConfig;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveConfig(config: AppConfig): Promise<void> {
  await redis.set(KEYS.config(), JSON.stringify(config));
}

// ─── Helper for JSON Array Storage ─────────────────────────────────────────────

async function appendToJsonList<T>(key: string, item: T, limit: number): Promise<void> {
  try {
    const raw = await redis.get(key);
    const list: T[] = raw ? (JSON.parse(raw) as T[]) : [];
    list.unshift(item);
    const trimmed = list.slice(0, limit);
    await redis.set(key, JSON.stringify(trimmed));
  } catch (error) {
    console.error(`Error appending to JSON list at ${key}:`, error);
  }
}

async function getJsonList<T>(key: string, limit: number): Promise<T[]> {
  try {
    const raw = await redis.get(key);
    if (!raw) return [];
    const list = JSON.parse(raw) as T[];
    return Array.isArray(list) ? list.slice(0, limit) : [];
  } catch (error) {
    console.error(`Error reading JSON list at ${key}:`, error);
    return [];
  }
}

// ─── Points helpers ───────────────────────────────────────────────────────────

/** Returns today's date string "YYYY-MM-DD" in UTC */
export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Returns ISO week number for current date */
export function currentWeekNumber(): number {
  const d = new Date();
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - startOfYear.getTime();
  return Math.ceil((diff / 86400000 + startOfYear.getDay() + 1) / 7);
}

export async function getUserPoints(username: string): Promise<number> {
  const raw = await redis.get(KEYS.userPoints(username));
  return raw ? parseInt(raw) : 0;
}

export async function getUserBadge(username: string): Promise<BadgeTier> {
  const raw = await redis.get(KEYS.userBadge(username));
  return (raw as BadgeTier) ?? 'none';
}

/**
 * Award points to a user. Returns { newTotal, previousBadge }.
 */
export async function awardPoints(
  username: string,
  delta: number,
  reason: string,
  awardedBy: string
): Promise<{ newTotal: number; previousBadge: BadgeTier }> {
  const day = todayKey();
  const week = currentWeekNumber();

  const event: PointEvent = { ts: Date.now(), delta, reason, awardedBy };
  const previousBadge = await getUserBadge(username);

  // 1. Increment total points counter
  const newTotalStr = await redis.incrBy(KEYS.userPoints(username), delta);
  const newTotal = Number(newTotalStr);

  // 2. Update all-time sorted set
  await redis.zAdd(KEYS.leaderboard(), { member: username, score: newTotal });

  // 3. Update weekly sorted set
  await redis.zIncrBy(KEYS.weeklyLeaderboard(week), username, delta);

  // 4. Append to user history (capped at 50)
  await appendToJsonList<PointEvent>(KEYS.userHistory(username), event, 50);

  // 5. Daily user total (anti-abuse tracking)
  await redis.incrBy(KEYS.dailyUserTotal(username, day), delta);

  // 6. Weekly stats: increment awards count + points awarded
  if (delta > 0) {
    await redis.incrBy(KEYS.weeklyAwards(week), 1);
    await redis.incrBy(KEYS.weeklyPoints(week), delta);
    await redis.incrBy(KEYS.userHelpfulAwards(username), 1);
    await adjustTrustScore(username, 5); // Add +5 to trust score for a helpful award (up to 100)

    // Track top awarded user this week (simple approach: store username if their weekly score is highest)
    const weeklyScore = await redis.zScore(KEYS.weeklyLeaderboard(week), username);
    const currentTop = await redis.get(KEYS.weeklyTopUser(week));
    if (!currentTop) {
      await redis.set(KEYS.weeklyTopUser(week), username);
    } else if (currentTop !== username) {
      const topScore = await redis.zScore(KEYS.weeklyLeaderboard(week), currentTop);
      if ((weeklyScore ?? 0) > (topScore ?? 0)) {
        await redis.set(KEYS.weeklyTopUser(week), username);
      }
    }
  }

  return { newTotal, previousBadge };
}

/**
 * Revoke points from a user.
 */
export async function revokePoints(
  username: string,
  delta: number,
  reason: string,
  revokedBy: string
): Promise<number> {
  return (
    await awardPoints(username, -Math.abs(delta), `[REVOKED] ${reason}`, revokedBy)
  ).newTotal;
}

// ─── Leaderboard helpers ──────────────────────────────────────────────────────

export async function getLeaderboard(limit = 10) {
  const week = currentWeekNumber();

  const allTimeRaw = await redis.zRange(KEYS.leaderboard(), 0, limit - 1, {
    reverse: true,
    by: 'rank',
  });

  const weeklyRaw = await redis.zRange(
    KEYS.weeklyLeaderboard(week),
    0,
    limit - 1,
    { reverse: true, by: 'rank' }
  );

  return { allTimeRaw, weeklyRaw };
}

// ─── Audit helpers ────────────────────────────────────────────────────────────

export async function appendAudit(entry: AuditEntry): Promise<void> {
  await appendToJsonList<AuditEntry>(KEYS.audit(), entry, 200);
}

export async function getAuditLog(): Promise<AuditEntry[]> {
  return getJsonList<AuditEntry>(KEYS.audit(), 50);
}

// ─── Achievements feed ────────────────────────────────────────────────────────

export async function appendAchievement(entry: BadgeAchievement): Promise<void> {
  await appendToJsonList<BadgeAchievement>(KEYS.achievements(), entry, 30);
}

export async function getAchievements(): Promise<BadgeAchievement[]> {
  return getJsonList<BadgeAchievement>(KEYS.achievements(), 20);
}

// ─── Weekly stats ─────────────────────────────────────────────────────────────

export async function getWeeklyStats(): Promise<{
  badgesAwarded: number;
  awardsCount: number;
  pointsAwarded: number;
  topAwardedUser: string | null;
  weekNumber: number;
}> {
  const week = currentWeekNumber();
  const [badges, awards, points, topUser] = await Promise.all([
    redis.get(KEYS.weeklyBadges(week)),
    redis.get(KEYS.weeklyAwards(week)),
    redis.get(KEYS.weeklyPoints(week)),
    redis.get(KEYS.weeklyTopUser(week)),
  ]);
  return {
    badgesAwarded: badges ? parseInt(badges) : 0,
    awardsCount: awards ? parseInt(awards) : 0,
    pointsAwarded: points ? parseInt(points) : 0,
    topAwardedUser: topUser ?? null,
    weekNumber: week,
  };
}

// ─── User history helpers ─────────────────────────────────────────────────────

export async function getUserHistory(username: string) {
  return getJsonList<PointEvent>(KEYS.userHistory(username), 30);
}

// ─── Trust Score & Infraction Helpers ─────────────────────────────────────────

export async function getUserTrustScore(username: string): Promise<number> {
  const score = await redis.get(KEYS.userTrustScore(username));
  return score ? parseInt(score) : 100;
}

export async function getUserRemovals60Days(username: string): Promise<number> {
  const raw = await redis.get(KEYS.userRemovals(username));
  if (!raw) return 0;
  try {
    const list: number[] = JSON.parse(raw);
    const limit = Date.now() - 60 * 24 * 60 * 60 * 1000;
    const active = list.filter((ts) => ts > limit);
    if (active.length !== list.length) {
      await redis.set(KEYS.userRemovals(username), JSON.stringify(active));
    }
    return active.length;
  } catch {
    return 0;
  }
}

export async function getUserHelpfulAwardsCount(username: string): Promise<number> {
  const count = await redis.get(KEYS.userHelpfulAwards(username));
  return count ? parseInt(count) : 0;
}

export async function adjustTrustScore(username: string, delta: number): Promise<number> {
  const current = await getUserTrustScore(username);
  const next = Math.max(0, Math.min(100, current + delta));
  await redis.set(KEYS.userTrustScore(username), next.toString());
  return next;
}

export async function penalizeUser(
  username: string,
  action: 'warn' | 'remove' | 'rule_break',
  reason: string,
  modUsername: string
): Promise<number> {
  const week = currentWeekNumber();
  let trustDelta = 0;

  if (action === 'warn') {
    trustDelta = -10;
    await redis.incrBy(KEYS.userWarnings(username), 1);
  } else if (action === 'remove') {
    trustDelta = -15;
    // Add to removals timestamp list
    const raw = await redis.get(KEYS.userRemovals(username));
    const list: number[] = raw ? JSON.parse(raw) : [];
    list.push(Date.now());
    await redis.set(KEYS.userRemovals(username), JSON.stringify(list));
  } else if (action === 'rule_break') {
    trustDelta = -20;
    await redis.incrBy(KEYS.userRuleBreaks(username), 1);
  }

  // Deduct trust score
  const newTrust = await adjustTrustScore(username, trustDelta);

  // Increment repeat violations for the week stats
  await redis.incrBy(KEYS.weeklyReportViolations(week), 1);

  // Append a point event history (negative trust event)
  const event = {
    ts: Date.now(),
    delta: trustDelta,
    reason: `[PENALIZED - ${action.toUpperCase()}] ${reason}`,
    awardedBy: modUsername,
  };
  await appendToJsonList(KEYS.userHistory(username), event, 50);

  return newTrust;
}

export async function getFullUserStats(username: string) {
  const totalPoints = await getUserPoints(username);
  const badge = await getUserBadge(username);
  const history = await getUserHistory(username);
  const trustScore = await getUserTrustScore(username);
  const removals60Days = await getUserRemovals60Days(username);
  
  const warnings = await redis.get(KEYS.userWarnings(username));
  const warningsCount = warnings ? parseInt(warnings) : 0;
  
  const ruleBreaks = await redis.get(KEYS.userRuleBreaks(username));
  const ruleBreaksCount = ruleBreaks ? parseInt(ruleBreaks) : 0;
  
  const helpfulAwardsCount = await getUserHelpfulAwardsCount(username);
  
  const week = currentWeekNumber();
  const weeklyPtsRaw = await redis.zScore(KEYS.weeklyLeaderboard(week), username);
  const weeklyPoints = weeklyPtsRaw ? Number(weeklyPtsRaw) : 0;
  
  const rankRaw = await redis.zRank(KEYS.leaderboard(), username);
  let rank = null;
  if (rankRaw !== undefined && rankRaw !== null) {
    const totalCount = await redis.zCard(KEYS.leaderboard());
    rank = totalCount - Number(rankRaw);
  }

  // Daily earned points
  const day = todayKey();
  const dailyTotalStr = await redis.get(KEYS.dailyUserTotal(username, day));
  const dailyEarnedPoints = dailyTotalStr ? parseInt(dailyTotalStr) : 0;

  return {
    username,
    totalPoints,
    badge,
    weeklyPoints,
    rank,
    history,
    trustScore,
    removals60Days,
    warningsCount,
    ruleBreaksCount,
    helpfulAwardsCount,
    dailyEarnedPoints
  };
}

export async function getHealthReport() {
  const week = currentWeekNumber();
  
  // 1. Top 10 helpful users this week
  const weeklyRaw = await redis.zRange(
    KEYS.weeklyLeaderboard(week),
    0,
    9,
    { reverse: true, by: 'rank' }
  );
  const topHelpfulUsers = weeklyRaw.map((e) => e.member);
  
  // 2. Rewarded comments count
  const awards = await redis.get(KEYS.weeklyAwards(week));
  const rewardedComments = awards ? parseInt(awards) : 0;
  
  // 3. Repeat violations change (mocked delta or tracked comparison against last week)
  const currentViolations = await redis.get(KEYS.weeklyReportViolations(week));
  const prevViolations = await redis.get(KEYS.weeklyReportViolations(week - 1));
  const currViolCount = currentViolations ? parseInt(currentViolations) : 0;
  const prevViolCount = prevViolations ? parseInt(prevViolations) : 0;
  const repeatViolationsDelta = prevViolCount > 0 ? (prevViolCount - currViolCount) : Math.max(0, 8 - currViolCount);

  // 4. Flair upgrades
  const upgrades = await redis.get(KEYS.weeklyFlairUpgrades(week));
  const trustedFlairUpgrades = upgrades ? parseInt(upgrades) : 0;

  return {
    topHelpfulUsers,
    rewardedComments,
    repeatViolationsDelta,
    trustedFlairUpgrades
  };
}
