import { Hono } from 'hono';
import { context, reddit, redis } from '@devvit/web/server';
import type {
  InitResponse,
  LeaderboardResponse,
  LeaderboardEntry,
  UserStatsResponse,
  AwardRequest,
  AwardResponse,
  RevokeRequest,
  RevokeResponse,
  ConfigResponse,
  SaveConfigRequest,
  SaveConfigResponse,
  AuditResponse,
  AchievementsResponse,
  WeeklyStatsResponse,
  ErrorResponse,
  PenalizeRequest,
  PenalizeResponse,
  HealthReportResponse,
  ModQueueResponse,
  ModQueueActionRequest,
  ModQueueActionResponse,
  ModQueuePost,
} from '../../shared/api';
import {
  getUserPoints,
  getUserBadge,
  getConfig,
  saveConfig,
  getAuditLog,
  appendAudit,
  getAchievements,
  getWeeklyStats,
  awardPoints,
  revokePoints,
  KEYS,
  currentWeekNumber,
  getFullUserStats,
  penalizeUser,
  getHealthReport,
  PRESETS,
  getUserTrustScore,
  getUserRemovals60Days,
  getUserHelpfulAwardsCount,
} from '../core/redis';
import { checkAndApplyMilestones } from '../core/milestones';
import { checkAntiAbuse, recordModAward } from '../core/antiAbuse';

export const api = new Hono();

// Helper: check if current user is a moderator
async function isCurrentUserMod(): Promise<boolean> {
  try {
    const username = await reddit.getCurrentUsername();
    if (!username || !context.subredditName) return false;
    const mods = await reddit.getModerators({
      subredditName: context.subredditName,
    }).all();
    return mods.some((m) => m.username === username);
  } catch {
    return false;
  }
}

// Helper: build a LeaderboardEntry from raw sorted set data
async function buildLeaderboardEntries(
  rawMembers: Array<{ member: string; score: number }>
): Promise<LeaderboardEntry[]> {
  return Promise.all(
    rawMembers.map(async ({ member, score }, idx) => ({
      username: member,
      points: Math.max(0, score),
      badge: await getUserBadge(member),
      rank: idx + 1,
    }))
  );
}

// ─── GET /api/init ─────────────────────────────────────────────────────────────
api.get('/init', async (c) => {
  try {
    const username = (await reddit.getCurrentUsername()) ?? 'anonymous';
    const isMod = await isCurrentUserMod();

    // Top 10 all-time leaderboard
    const allTimeRaw = await redis.zRange(KEYS.leaderboard(), 0, 9, {
      reverse: true,
      by: 'rank',
    });
    const leaderboard = await buildLeaderboardEntries(allTimeRaw);

    // Current user stats
    let userStats = null;
    if (username !== 'anonymous') {
      userStats = await getFullUserStats(username);
    }

    return c.json<InitResponse>({
      type: 'init',
      username,
      isMod,
      leaderboard,
      userStats,
    });
  } catch (error) {
    console.error('API Init Error:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Initialization failed' },
      400
    );
  }
});

// ─── GET /api/leaderboard ──────────────────────────────────────────────────────
api.get('/leaderboard', async (c) => {
  try {
    const week = currentWeekNumber();

    const allTimeRaw = await redis.zRange(KEYS.leaderboard(), 0, 9, {
      reverse: true,
      by: 'rank',
    });
    const weeklyRaw = await redis.zRange(
      KEYS.weeklyLeaderboard(week),
      0,
      9,
      { reverse: true, by: 'rank' }
    );

    const [allTime, weekly] = await Promise.all([
      buildLeaderboardEntries(allTimeRaw),
      buildLeaderboardEntries(weeklyRaw),
    ]);

    return c.json<LeaderboardResponse>({ type: 'leaderboard', weekly, allTime });
  } catch (error) {
    console.error('API Leaderboard Error:', error);
    return c.json<ErrorResponse>({ status: 'error', message: 'Failed to load leaderboard' }, 400);
  }
});

// ─── GET /api/user/:username ──────────────────────────────────────────────────
api.get('/user/:username', async (c) => {
  const { username } = c.req.param();
  try {
    const stats = await getFullUserStats(username);
    return c.json<UserStatsResponse>({
      type: 'user_stats',
      stats,
    });
  } catch (error) {
    console.error(`API User Error for ${username}:`, error);
    return c.json<ErrorResponse>({ status: 'error', message: 'Failed to load user stats' }, 400);
  }
});

// ─── POST /api/award ──────────────────────────────────────────────────────────
api.post('/award', async (c) => {
  try {
    const modUsername = await reddit.getCurrentUsername();
    if (!modUsername) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Not authenticated' }, 401);
    }

    const isMod = await isCurrentUserMod();
    if (!isMod) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Moderator access required' }, 403);
    }

    const body = await c.req.json<AwardRequest>();
    const { targetUsername, points, reason } = body;

    if (!targetUsername || !points || !reason?.trim()) {
      return c.json<ErrorResponse>({
        status: 'error',
        message: 'targetUsername, points, and reason are required',
      }, 400);
    }

    if (points < 1 || points > 500) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Points must be between 1 and 500' }, 400);
    }

    // Anti-abuse check
    const abuseCheck = await checkAntiAbuse(modUsername, targetUsername, points);
    if (!abuseCheck.allowed) {
      return c.json<ErrorResponse>({ status: 'error', message: abuseCheck.reason }, 429);
    }

    // Award points
    const { newTotal, previousBadge } = await awardPoints(
      targetUsername,
      points,
      reason.trim(),
      modUsername
    );

    // Record mod award count for anti-abuse
    await recordModAward(modUsername, targetUsername);

    // Audit log
    await appendAudit({
      ts: Date.now(),
      action: 'award',
      modUsername,
      targetUsername,
      delta: points,
      reason: reason.trim(),
    });

    // Check milestones
    const subredditName = context.subredditName ?? '';
    const milestoneReached = await checkAndApplyMilestones(
      targetUsername,
      newTotal,
      previousBadge,
      subredditName
    );

    return c.json<AwardResponse>({
      type: 'award',
      newTotal,
      milestoneReached,
    });
  } catch (error) {
    console.error('API Award Error:', error);
    return c.json<ErrorResponse>({ status: 'error', message: 'Award failed' }, 400);
  }
});

// ─── POST /api/revoke ─────────────────────────────────────────────────────────
api.post('/revoke', async (c) => {
  try {
    const modUsername = await reddit.getCurrentUsername();
    if (!modUsername) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Not authenticated' }, 401);
    }

    const isMod = await isCurrentUserMod();
    if (!isMod) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Moderator access required' }, 403);
    }

    const body = await c.req.json<RevokeRequest>();
    const { targetUsername, points, reason } = body;

    if (!targetUsername || !points || !reason?.trim()) {
      return c.json<ErrorResponse>({
        status: 'error',
        message: 'targetUsername, points, and reason are required',
      }, 400);
    }

    const newTotal = await revokePoints(
      targetUsername,
      points,
      reason.trim(),
      modUsername
    );

    await appendAudit({
      ts: Date.now(),
      action: 'revoke',
      modUsername,
      targetUsername,
      delta: -points,
      reason: reason.trim(),
    });

    return c.json<RevokeResponse>({ type: 'revoke', newTotal });
  } catch (error) {
    console.error('API Revoke Error:', error);
    return c.json<ErrorResponse>({ status: 'error', message: 'Revoke failed' }, 400);
  }
});

// ─── GET /api/config ─────────────────────────────────────────────────────────
api.get('/config', async (c) => {
  try {
    const config = await getConfig();
    return c.json<ConfigResponse>({ type: 'config', config });
  } catch (error) {
    console.error('API Config Error:', error);
    return c.json<ErrorResponse>({ status: 'error', message: 'Failed to load config' }, 400);
  }
});

// ─── POST /api/config ─────────────────────────────────────────────────────────
api.post('/config', async (c) => {
  try {
    const isMod = await isCurrentUserMod();
    if (!isMod) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Moderator access required' }, 403);
    }

    const modUsername = await reddit.getCurrentUsername();
    const newConfig = await c.req.json<SaveConfigRequest>();
    
    // Check if preset has changed and load preset defaults if so
    let configToSave = { ...newConfig };
    const currentConfig = await getConfig();
    if (newConfig.subredditPreset && newConfig.subredditPreset !== currentConfig.subredditPreset) {
      const presetData = PRESETS[newConfig.subredditPreset];
      configToSave = {
        ...configToSave,
        ...presetData,
      };
    }

    await saveConfig(configToSave);

    await appendAudit({
      ts: Date.now(),
      action: 'config_change',
      modUsername: modUsername ?? 'unknown',
      targetUsername: 'system',
      delta: 0,
      reason: `App configuration updated. Preset: ${configToSave.subredditPreset}`,
    });

    return c.json<SaveConfigResponse>({ type: 'config_saved' });
  } catch (error) {
    console.error('API Config Save Error:', error);
    return c.json<ErrorResponse>({ status: 'error', message: 'Failed to save config' }, 400);
  }
});

// ─── GET /api/audit ──────────────────────────────────────────────────────────
api.get('/audit', async (c) => {
  try {
    const isMod = await isCurrentUserMod();
    if (!isMod) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Moderator access required' }, 403);
    }

    const entries = await getAuditLog();
    return c.json<AuditResponse>({ type: 'audit', entries });
  } catch (error) {
    console.error('API Audit Error:', error);
    return c.json<ErrorResponse>({ status: 'error', message: 'Failed to load audit log' }, 400);
  }
});

// ─── GET /api/achievements ────────────────────────────────────────────────────
api.get('/achievements', async (c) => {
  try {
    const achievements = await getAchievements();
    return c.json<AchievementsResponse>({ type: 'achievements', achievements });
  } catch (error) {
    console.error('API Achievements Error:', error);
    return c.json<ErrorResponse>({ status: 'error', message: 'Failed to load achievements' }, 400);
  }
});

// ─── GET /api/stats ───────────────────────────────────────────────────────────
api.get('/stats', async (c) => {
  try {
    const isMod = await isCurrentUserMod();
    if (!isMod) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Moderator access required' }, 403);
    }
    const stats = await getWeeklyStats();
    
    // Add additional properties dynamically for dashboard
    const report = await getHealthReport();
    
    return c.json<WeeklyStatsResponse>({
      type: 'weekly_stats',
      stats: {
        ...stats,
        rewardedCommentsCount: report.rewardedComments,
        repeatViolationsDelta: report.repeatViolationsDelta,
        trustedFlairUpgrades: report.trustedFlairUpgrades,
      },
    });
  } catch (error) {
    console.error('API Stats Error:', error);
    return c.json<ErrorResponse>({ status: 'error', message: 'Failed to load stats' }, 400);
  }
});

// Seed data for the simulator queue
const SEED_QUEUE_POSTS = [
  {
    id: 'post_1',
    author: 'helpful_mentor',
    title: 'How to understand recursion in Python - A Visual Guide',
    body: 'I created a set of diagrams showing how the stack grows and shrinks during recursive calls. Hope it helps beginners understand recursion!',
    createdAt: Date.now() - 30 * 60 * 1000,
    trustScore: 100,
    removals60Days: 0,
    helpfulAwards: 12,
    priorityBadge: 'high' as const,
    priorityReason: 'High-trust user · 0 removals in 60 days · 12 helpful awards',
    status: 'pending' as const,
  },
  {
    id: 'post_2',
    author: 'farming_bot',
    title: 'FREE CRYPTO GIVAWAY CLICK LINK NOW NOT SCAM!!!',
    body: 'Get 500 free tokens by clicking this link immediately. Limited offer for reddit users only.',
    createdAt: Date.now() - 15 * 60 * 1000,
    trustScore: 40,
    removals60Days: 5,
    helpfulAwards: 0,
    priorityBadge: 'low' as const,
    priorityReason: 'Suspicious user · 5 removals in 60 days · 0 helpful awards',
    status: 'pending' as const,
  },
  {
    id: 'post_3',
    author: 'new_user',
    title: 'Question: What is the best IDE for web development in 2026?',
    body: 'I am just starting out and wanted to know if VS Code is still the standard, or if newer tools like Antigravity are better.',
    createdAt: Date.now() - 5 * 60 * 1000,
    trustScore: 100,
    removals60Days: 0,
    helpfulAwards: 0,
    priorityBadge: 'medium' as const,
    priorityReason: 'Standard-trust user · 0 removals · 0 helpful awards',
    status: 'pending' as const,
  }
];

// ─── POST /api/penalize ───────────────────────────────────────────────────────
api.post('/penalize', async (c) => {
  try {
    const modUsername = await reddit.getCurrentUsername();
    if (!modUsername) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Not authenticated' }, 401);
    }

    const isMod = await isCurrentUserMod();
    if (!isMod) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Moderator access required' }, 403);
    }

    const body = await c.req.json<PenalizeRequest>();
    const { targetUsername, action, reason } = body;

    if (!targetUsername || !action || !reason?.trim()) {
      return c.json<ErrorResponse>({
        status: 'error',
        message: 'targetUsername, action, and reason are required',
      }, 400);
    }

    // Process penalty
    const newTrustScore = await penalizeUser(targetUsername, action, reason.trim(), modUsername);

    // Log to audit trail
    await appendAudit({
      ts: Date.now(),
      action,
      modUsername,
      targetUsername,
      delta: 0,
      reason: reason.trim(),
    });

    return c.json<PenalizeResponse>({
      type: 'penalize',
      newTrustScore,
    });
  } catch (error) {
    console.error('API Penalize Error:', error);
    return c.json<ErrorResponse>({ status: 'error', message: 'Penalty failed' }, 400);
  }
});

// ─── GET /api/health-report ───────────────────────────────────────────────────
api.get('/health-report', async (c) => {
  try {
    const isMod = await isCurrentUserMod();
    if (!isMod) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Moderator access required' }, 403);
    }

    const report = await getHealthReport();
    return c.json<HealthReportResponse>({
      type: 'health_report',
      ...report,
    });
  } catch (error) {
    console.error('API Health Report Error:', error);
    return c.json<ErrorResponse>({ status: 'error', message: 'Failed to load health report' }, 400);
  }
});

// ─── GET /api/mod-queue ───────────────────────────────────────────────────────
api.get('/mod-queue', async (c) => {
  try {
    const isMod = await isCurrentUserMod();
    if (!isMod) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Moderator access required' }, 403);
    }

    const raw = await redis.get('gc:sim:mod_queue');
    let posts = [];
    if (!raw) {
      posts = SEED_QUEUE_POSTS;
      await redis.set('gc:sim:mod_queue', JSON.stringify(posts));
    } else {
      posts = JSON.parse(raw);
    }

    // Refresh trust details for simulator users dynamically based on Redis trust database
    const refreshed = await Promise.all(posts.map(async (p: ModQueuePost) => {
      const trustScore = await getUserTrustScore(p.author);
      const removals60Days = await getUserRemovals60Days(p.author);
      const helpfulAwards = await getUserHelpfulAwardsCount(p.author);
      
      let priorityBadge: 'high' | 'medium' | 'low' = 'medium';
      if (trustScore >= 80 && removals60Days === 0) {
        priorityBadge = 'high';
      } else if (trustScore < 60 || removals60Days > 2) {
        priorityBadge = 'low';
      }
      
      const priorityReason = `${priorityBadge === 'high' ? 'High' : priorityBadge === 'low' ? 'Low' : 'Standard'}-trust user · ${removals60Days} removals in 60 days · ${helpfulAwards} helpful awards`;

      return {
        ...p,
        trustScore,
        removals60Days,
        helpfulAwards,
        priorityBadge,
        priorityReason,
      };
    }));

    return c.json<ModQueueResponse>({
      type: 'mod_queue',
      posts: refreshed,
    });
  } catch (error) {
    console.error('API Mod Queue Error:', error);
    return c.json<ErrorResponse>({ status: 'error', message: 'Failed to load mod queue' }, 400);
  }
});

// ─── POST /api/mod-queue/action ───────────────────────────────────────────────
api.post('/mod-queue/action', async (c) => {
  try {
    const modUsername = await reddit.getCurrentUsername();
    if (!modUsername) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Not authenticated' }, 401);
    }

    const isMod = await isCurrentUserMod();
    if (!isMod) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Moderator access required' }, 403);
    }

    const body = await c.req.json<ModQueueActionRequest>();
    const { postId, action, reason } = body;

    const raw = await redis.get('gc:sim:mod_queue');
    if (!raw) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Queue not initialized' }, 400);
    }
    const posts: ModQueuePost[] = JSON.parse(raw);
    const idx = posts.findIndex((p) => p.id === postId);
    if (idx === -1) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Post not found' }, 404);
    }

    const post = posts[idx]!;
    post.status = action === 'approve' ? 'approved' : action === 'warn' ? 'warned' : action === 'remove' ? 'removed' : 'rule_break';
    
    await redis.set('gc:sim:mod_queue', JSON.stringify(posts));

    let authorPoints = 0;
    let authorTrustScore = 100;

    if (action === 'approve') {
      const config = await getConfig();
      const points = config.approvedPostBonus || 10;
      const { newTotal } = await awardPoints(post.author, points, `Approved post: "${post.title}"`, modUsername);
      authorPoints = newTotal;
      authorTrustScore = await getUserTrustScore(post.author);
      
      await appendAudit({
        ts: Date.now(),
        action: 'award',
        modUsername,
        targetUsername: post.author,
        delta: points,
        reason: `Approved post in queue: ${post.title}`,
      });

      const subredditName = context.subredditName ?? '';
      const previousBadge = await getUserBadge(post.author);
      await checkAndApplyMilestones(post.author, newTotal, previousBadge, subredditName);
    } else {
      const penaltyAction = action === 'warn' ? 'warn' : action === 'remove' ? 'remove' : 'rule_break';
      authorTrustScore = await penalizeUser(post.author, penaltyAction, reason || `Mod Queue Action: ${action}`, modUsername);
      authorPoints = await getUserPoints(post.author);

      await appendAudit({
        ts: Date.now(),
        action: penaltyAction,
        modUsername,
        targetUsername: post.author,
        delta: 0,
        reason: reason || `Mod Queue Action: ${action} on post: ${post.title}`,
      });
    }

    return c.json<ModQueueActionResponse>({
      type: 'mod_queue_action',
      postId,
      status: post.status,
      authorPoints,
      authorTrustScore,
    });
  } catch (error) {
    console.error('API Mod Queue Action Error:', error);
    return c.json<ErrorResponse>({ status: 'error', message: 'Failed to process queue action' }, 400);
  }
});
