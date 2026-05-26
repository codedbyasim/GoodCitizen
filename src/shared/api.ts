// ─── User & Leaderboard ───────────────────────────────────────────────────────

export type BadgeTier =
  | 'none'
  | 'new_member'
  | 'regular'
  | 'contributor'
  | 'veteran'
  | 'community_star';

export type LeaderboardEntry = {
  username: string;
  points: number;
  badge: BadgeTier;
  rank: number;
};

export type PointEvent = {
  ts: number; // unix ms
  delta: number;
  reason: string;
  awardedBy: string; // 'system' | mod username
};

export type UserStats = {
  username: string;
  totalPoints: number;
  badge: BadgeTier;
  weeklyPoints: number;
  rank: number | null;
  history: PointEvent[];
  trustScore?: number;
  removals60Days?: number;
  warningsCount?: number;
  ruleBreaksCount?: number;
  helpfulAwardsCount?: number;
  dailyEarnedPoints?: number;
};

// ─── Badge Achievement Feed ───────────────────────────────────────────────────

export type BadgeAchievement = {
  ts: number;
  username: string;
  badge: BadgeTier;
  points: number;
};

// ─── Weekly Stats ─────────────────────────────────────────────────────────────

export type WeeklyStats = {
  badgesAwarded: number;
  awardsCount: number;
  pointsAwarded: number;
  topAwardedUser: string | null;
  weekNumber: number;
  rewardedCommentsCount?: number;
  repeatViolationsDelta?: number;
  trustedFlairUpgrades?: number;
};

// ─── Config ──────────────────────────────────────────────────────────────────

export type MilestoneConfig = {
  points: number;
  badge: BadgeTier;
  flairText: string;
  dmMessage: string;
};

export type AppConfig = {
  subredditPreset?: 'default' | 'learnprogramming' | 'personalfinance' | 'loseit';
  pointLabel?: string;
  // Point values
  firstPostBonus: number;
  approvedPostBonus: number;
  goodContributionBonus: number;
  helpfulNominationBonus: number;
  // Limits
  dailyUserCap: number;
  dailyModAwardLimit: number;
  // Milestones
  milestones: MilestoneConfig[];
};

// ─── Audit ───────────────────────────────────────────────────────────────────

export type AuditEntry = {
  ts: number;
  action: 'award' | 'revoke' | 'config_change' | 'milestone' | 'warn' | 'remove' | 'rule_break';
  modUsername: string;
  targetUsername: string;
  delta: number;
  reason: string;
};

// ─── API Request / Response shapes ───────────────────────────────────────────

// GET /api/init
export type InitResponse = {
  type: 'init';
  username: string;
  isMod: boolean;
  leaderboard: LeaderboardEntry[];
  userStats: UserStats | null;
};

// GET /api/leaderboard
export type LeaderboardResponse = {
  type: 'leaderboard';
  weekly: LeaderboardEntry[];
  allTime: LeaderboardEntry[];
};

// GET /api/user/:username
export type UserStatsResponse = {
  type: 'user_stats';
  stats: UserStats;
};

// GET /api/achievements
export type AchievementsResponse = {
  type: 'achievements';
  achievements: BadgeAchievement[];
};

// GET /api/stats
export type WeeklyStatsResponse = {
  type: 'weekly_stats';
  stats: WeeklyStats;
};

// POST /api/award
export type AwardRequest = {
  targetUsername: string;
  points: number;
  reason: string;
};
export type AwardResponse = {
  type: 'award';
  newTotal: number;
  milestoneReached: BadgeTier | null;
};

// POST /api/revoke
export type RevokeRequest = {
  targetUsername: string;
  points: number;
  reason: string;
};
export type RevokeResponse = {
  type: 'revoke';
  newTotal: number;
};

// GET /api/config
export type ConfigResponse = {
  type: 'config';
  config: AppConfig;
};

// POST /api/config
export type SaveConfigRequest = AppConfig;
export type SaveConfigResponse = { type: 'config_saved' };

// GET /api/audit
export type AuditResponse = {
  type: 'audit';
  entries: AuditEntry[];
};

// Generic error
export type ErrorResponse = {
  status: 'error';
  message: string;
};

// ─── Penalize Endpoint ────────────────────────────────────────────────────────
export type PenalizeRequest = {
  targetUsername: string;
  action: 'warn' | 'remove' | 'rule_break';
  reason: string;
};
export type PenalizeResponse = {
  type: 'penalize';
  newTrustScore: number;
};

// ─── Health Report Endpoint ────────────────────────────────────────────────────
export type HealthReportResponse = {
  type: 'health_report';
  topHelpfulUsers: string[];
  rewardedComments: number;
  repeatViolationsDelta: number;
  trustedFlairUpgrades: number;
};

// ─── Mod Queue Simulator Endpoint ──────────────────────────────────────────────
export type ModQueuePost = {
  id: string;
  author: string;
  title: string;
  body: string;
  createdAt: number;
  trustScore: number;
  removals60Days: number;
  helpfulAwards: number;
  priorityBadge: 'high' | 'medium' | 'low';
  priorityReason: string;
  status: 'pending' | 'approved' | 'removed' | 'warned' | 'rule_break';
};
export type ModQueueResponse = {
  type: 'mod_queue';
  posts: ModQueuePost[];
};

export type ModQueueActionRequest = {
  postId: string;
  action: 'approve' | 'remove' | 'warn' | 'rule_break';
  reason: string;
};
export type ModQueueActionResponse = {
  type: 'mod_queue_action';
  postId: string;
  status: 'approved' | 'removed' | 'warned' | 'rule_break';
  authorPoints: number;
  authorTrustScore: number;
};
