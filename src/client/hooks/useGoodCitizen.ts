import { useCallback, useEffect, useState } from 'react';
import type {
  InitResponse,
  LeaderboardResponse,
  UserStatsResponse,
  AwardRequest,
  AwardResponse,
  RevokeRequest,
  RevokeResponse,
  ConfigResponse,
  AuditResponse,
  AchievementsResponse,
  WeeklyStatsResponse,
  AppConfig,
  BadgeTier,
  LeaderboardEntry,
  UserStats,
  AuditEntry,
  BadgeAchievement,
  WeeklyStats,
  PenalizeRequest,
  PenalizeResponse,
  HealthReportResponse,
  ModQueuePost,
  ModQueueResponse,
  ModQueueActionRequest,
  ModQueueActionResponse,
} from '../../shared/api';

type FetchState = 'idle' | 'loading' | 'success' | 'error';

interface GoodCitizenState {
  username: string;
  isMod: boolean;
  leaderboard: LeaderboardEntry[];
  userStats: UserStats | null;
  initState: FetchState;
  errorMsg: string | null;
}

export const useGoodCitizen = () => {
  const [state, setState] = useState<GoodCitizenState>({
    username: '',
    isMod: false,
    leaderboard: [],
    userStats: null,
    initState: 'loading',
    errorMsg: null,
  });

  // ─── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/init');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: InitResponse = await res.json();
        setState((prev) => ({
          ...prev,
          username: data.username,
          isMod: data.isMod,
          leaderboard: data.leaderboard,
          userStats: data.userStats,
          initState: 'success',
        }));
      } catch (err) {
        console.error('Init failed:', err);
        setState((prev) => ({
          ...prev,
          initState: 'error',
          errorMsg: 'Failed to load GoodCitizen data',
        }));
      }
    };
    void init();
  }, []);

  // ─── Leaderboard (full weekly + all-time) ───────────────────────────────────
  const fetchLeaderboard = useCallback(async (): Promise<LeaderboardResponse | null> => {
    try {
      const res = await fetch('/api/leaderboard');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('Leaderboard fetch failed:', err);
      return null;
    }
  }, []);

  // ─── User Stats ─────────────────────────────────────────────────────────────
  const fetchUserStats = useCallback(async (username: string): Promise<UserStats | null> => {
    try {
      const res = await fetch(`/api/user/${encodeURIComponent(username)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: UserStatsResponse = await res.json();
      return data.stats;
    } catch (err) {
      console.error('User stats fetch failed:', err);
      return null;
    }
  }, []);

  // ─── Achievements Feed ───────────────────────────────────────────────────────
  const fetchAchievements = useCallback(async (): Promise<BadgeAchievement[]> => {
    try {
      const res = await fetch('/api/achievements');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AchievementsResponse = await res.json();
      return data.achievements;
    } catch (err) {
      console.error('Achievements fetch failed:', err);
      return [];
    }
  }, []);

  // ─── Weekly Stats ─────────────────────────────────────────────────────────────
  const fetchWeeklyStats = useCallback(async (): Promise<WeeklyStats | null> => {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: WeeklyStatsResponse = await res.json();
      return data.stats;
    } catch (err) {
      console.error('Weekly stats fetch failed:', err);
      return null;
    }
  }, []);

  // ─── Award Points ────────────────────────────────────────────────────────────
  const award = useCallback(
    async (
      targetUsername: string,
      points: number,
      reason: string
    ): Promise<{ success: true; newTotal: number; milestoneReached: BadgeTier | null } | { success: false; message: string }> => {
      try {
        const res = await fetch('/api/award', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetUsername, points, reason } as AwardRequest),
        });
        const data = await res.json();
        if (!res.ok) {
          return { success: false, message: data.message ?? 'Award failed' };
        }
        const awardData = data as AwardResponse;
        return { success: true, newTotal: awardData.newTotal, milestoneReached: awardData.milestoneReached };
      } catch (err) {
        console.error('Award failed:', err);
        return { success: false, message: 'Network error' };
      }
    },
    []
  );

  // ─── Revoke Points ───────────────────────────────────────────────────────────
  const revoke = useCallback(
    async (
      targetUsername: string,
      points: number,
      reason: string
    ): Promise<{ success: boolean; message?: string; newTotal?: number }> => {
      try {
        const res = await fetch('/api/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetUsername, points, reason } as RevokeRequest),
        });
        const data = await res.json();
        if (!res.ok) {
          return { success: false, message: data.message ?? 'Revoke failed' };
        }
        const revokeData = data as RevokeResponse;
        return { success: true, newTotal: revokeData.newTotal };
      } catch (err) {
        console.error('Revoke failed:', err);
        return { success: false, message: 'Network error' };
      }
    },
    []
  );

  // ─── Config ──────────────────────────────────────────────────────────────────
  const fetchConfig = useCallback(async (): Promise<AppConfig | null> => {
    try {
      const res = await fetch('/api/config');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ConfigResponse = await res.json();
      return data.config;
    } catch (err) {
      console.error('Config fetch failed:', err);
      return null;
    }
  }, []);

  const saveConfig = useCallback(async (config: AppConfig): Promise<boolean> => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      return res.ok;
    } catch (err) {
      console.error('Config save failed:', err);
      return false;
    }
  }, []);

  // ─── Audit Log ───────────────────────────────────────────────────────────────
  const fetchAudit = useCallback(async (): Promise<AuditEntry[]> => {
    try {
      const res = await fetch('/api/audit');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AuditResponse = await res.json();
      return data.entries;
    } catch (err) {
      console.error('Audit fetch failed:', err);
      return [];
    }
  }, []);

  // ─── Refresh leaderboard in state ────────────────────────────────────────────
  const refreshLeaderboard = useCallback(async () => {
    const data = await fetchLeaderboard();
    if (data) {
      setState((prev) => ({ ...prev, leaderboard: data.allTime }));
    }
  }, [fetchLeaderboard]);

  // ─── Penalize User ──────────────────────────────────────────────────────────
  const penalize = useCallback(
    async (
      targetUsername: string,
      action: 'warn' | 'remove' | 'rule_break',
      reason: string
    ): Promise<{ success: true; newTrustScore: number } | { success: false; message: string }> => {
      try {
        const res = await fetch('/api/penalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetUsername, action, reason } as PenalizeRequest),
        });
        const data = await res.json();
        if (!res.ok) {
          return { success: false, message: data.message ?? 'Penalty failed' };
        }
        const penData = data as PenalizeResponse;
        return { success: true, newTrustScore: penData.newTrustScore };
      } catch (err) {
        console.error('Penalization failed:', err);
        return { success: false, message: 'Network error' };
      }
    },
    []
  );

  // ─── Health Report ──────────────────────────────────────────────────────────
  const fetchHealthReport = useCallback(async (): Promise<HealthReportResponse | null> => {
    try {
      const res = await fetch('/api/health-report');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('Health report fetch failed:', err);
      return null;
    }
  }, []);

  // ─── Mod Queue Simulator ────────────────────────────────────────────────────
  const fetchModQueue = useCallback(async (): Promise<ModQueuePost[]> => {
    try {
      const res = await fetch('/api/mod-queue');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ModQueueResponse = await res.json();
      return data.posts;
    } catch (err) {
      console.error('Mod queue fetch failed:', err);
      return [];
    }
  }, []);

  const processModQueueAction = useCallback(
    async (
      postId: string,
      action: 'approve' | 'remove' | 'warn' | 'rule_break',
      reason: string
    ): Promise<{ success: true; postId: string; status: string; authorPoints: number; authorTrustScore: number } | { success: false; message: string }> => {
      try {
        const res = await fetch('/api/mod-queue/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId, action, reason } as ModQueueActionRequest),
        });
        const data = await res.json();
        if (!res.ok) {
          return { success: false, message: data.message ?? 'Queue action failed' };
        }
        const actData = data as ModQueueActionResponse;
        return {
          success: true,
          postId: actData.postId,
          status: actData.status,
          authorPoints: actData.authorPoints,
          authorTrustScore: actData.authorTrustScore,
        };
      } catch (err) {
        console.error('Mod queue action failed:', err);
        return { success: false, message: 'Network error' };
      }
    },
    []
  );

  return {
    ...state,
    fetchLeaderboard,
    fetchUserStats,
    fetchAchievements,
    fetchWeeklyStats,
    award,
    revoke,
    fetchConfig,
    saveConfig,
    fetchAudit,
    refreshLeaderboard,
    penalize,
    fetchHealthReport,
    fetchModQueue,
    processModQueueAction,
  } as const;
};
