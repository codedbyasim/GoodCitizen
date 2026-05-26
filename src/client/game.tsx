import './index.css';

import React, { StrictMode, useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { useGoodCitizen } from './hooks/useGoodCitizen';
import type {
  BadgeTier,
  LeaderboardEntry,
  UserStats,
  AppConfig,
  AuditEntry,
  MilestoneConfig,
  BadgeAchievement,
  WeeklyStats,
  PointEvent,
  ModQueuePost,
} from '../shared/api';

// ─── SVG Logo Component ────────────────────────────────────────────────────────

export const LogoSVG = ({ size = 22 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ filter: 'drop-shadow(0px 1.5px 3px rgba(0, 0, 0, 0.3))' }}
  >
    <defs>
      <linearGradient id="gc-logo-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="var(--brand-primary)" />
        <stop offset="100%" stopColor="var(--brand-secondary)" />
      </linearGradient>
    </defs>
    <path
      d="M12 2C12 2 20 5 20 11C20 17 12 22 12 22C12 22 4 17 4 11C4 5 12 2 12 2Z"
      fill="url(#gc-logo-grad)"
      stroke="rgba(255, 255, 255, 0.15)"
      strokeWidth="1.2"
    />
    <path
      d="M12 6.5L13.3 9.2L16.3 9.5L14 11.6L14.7 14.6L12 13.1L9.3 14.6L10 11.6L7.7 9.5L10.7 9.2L12 6.5Z"
      fill="white"
    />
  </svg>
);

// ─── Constants ────────────────────────────────────────────────────────────────

const BADGE_LABELS: Record<BadgeTier, string> = {
  none: 'No Badge',
  new_member: '🌱 New Member',
  regular: '⭐ Regular',
  contributor: '💎 Contributor',
  veteran: '🔥 Veteran',
  community_star: '🌟 Community Star',
};

const BADGE_EMOJI: Record<BadgeTier, string> = {
  none: '',
  new_member: '🌱',
  regular: '⭐',
  contributor: '💎',
  veteran: '🔥',
  community_star: '🌟',
};

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

const MILESTONE_ORDER: BadgeTier[] = [
  'new_member',
  'regular',
  'contributor',
  'veteran',
  'community_star',
];

const NEXT_MILESTONE_PTS: Record<BadgeTier, number | null> = {
  none: 50,
  new_member: 150,
  regular: 300,
  contributor: 500,
  veteran: 1000,
  community_star: null,
};

const CURR_MILESTONE_PTS: Record<BadgeTier, number> = {
  none: 0,
  new_member: 50,
  regular: 150,
  contributor: 300,
  veteran: 500,
  community_star: 1000,
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Badge Pill ────────────────────────────────────────────────────────────────

const BadgePill = ({ badge }: { badge: BadgeTier }) =>
  badge === 'none' ? null : (
    <span className={`gc-badge gc-badge-${badge}`}>{BADGE_LABELS[badge]}</span>
  );

// ─── Rank cell ─────────────────────────────────────────────────────────────────

const RankCell = ({ rank }: { rank: number }) => {
  if (rank <= 3) {
    return (
      <span className={`gc-rank gc-rank-${rank}`}>{RANK_MEDALS[rank - 1]}</span>
    );
  }
  return <span className="gc-rank gc-rank-n">#{rank}</span>;
};

// ─── Leaderboard Row ───────────────────────────────────────────────────────────

const LbRow = ({
  entry,
  isMe,
  onClick,
  pointLabel,
}: {
  entry: LeaderboardEntry;
  isMe: boolean;
  onClick: (username: string) => void;
  pointLabel: string;
}) => (
  <div
    className={`gc-lb-row gc-fade-in ${entry.rank <= 3 ? `top-${entry.rank}` : ''} ${isMe ? 'is-me' : ''}`}
    style={{
      animationDelay: `${Math.min(entry.rank - 1, 9) * 0.05}s`,
      cursor: 'pointer',
    }}
    onClick={() => onClick(entry.username)}
    title={`Click to view u/${entry.username}'s stats`}
  >
    <RankCell rank={entry.rank} />
    <div className="gc-lb-info">
      <div className="gc-lb-username">
        u/{entry.username}
        {isMe && <span> (you)</span>}
      </div>
      <BadgePill badge={entry.badge} />
    </div>
    <div style={{ textAlign: 'right' }}>
      <div className="gc-lb-points">
        {entry.points.toLocaleString()}
        <span className="gc-lb-pts-label"> {pointLabel}</span>
      </div>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>tap for details</div>
    </div>
  </div>
);

// ─── Badge Achievement Item ────────────────────────────────────────────────────

const AchievementItem = ({
  achievement,
  delay,
}: {
  achievement: BadgeAchievement;
  delay: number;
}) => (
  <div
    className="gc-history-item gc-fade-in"
    style={{ animationDelay: `${delay}s`, borderLeft: '3px solid var(--badge-community_star)' }}
  >
    <span style={{ fontSize: '18px', lineHeight: 1 }}>
      {BADGE_EMOJI[achievement.badge]}
    </span>
    <div className="gc-history-info">
      <div className="gc-history-reason">
        <strong>u/{achievement.username}</strong> just became a{' '}
        <span style={{ color: `var(--badge-${achievement.badge})`, fontWeight: 700 }}>
          {BADGE_LABELS[achievement.badge]}
        </span>
        !
      </div>
      <div className="gc-history-meta">
        {achievement.points.toLocaleString()} total pts · {timeAgo(achievement.ts)}
      </div>
    </div>
  </div>
);

// ─── User Stats Panel ─────────────────────────────────────────────────────────

const UserStatsPanel = ({
  username,
  gc,
  onBack,
  pointLabel,
  dailyCap,
}: {
  username: string;
  gc: ReturnType<typeof useGoodCitizen>;
  onBack?: () => void;
  pointLabel: string;
  dailyCap: number;
}) => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const s = await gc.fetchUserStats(username);
      setStats(s);
      setLoading(false);
    };
    void load();
  }, [username]);

  if (loading) {
    return (
      <div className="gc-spinner">
        <div className="gc-spinner-dot" /><div className="gc-spinner-dot" /><div className="gc-spinner-dot" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="gc-panel">
        {onBack && (
          <button className="gc-btn gc-btn-secondary gc-btn-sm" onClick={onBack}>
            ← Back
          </button>
        )}
        <div className="gc-empty">
          <div className="gc-empty-icon">🌱</div>
          <div>u/{username} hasn't earned any points yet.</div>
        </div>
      </div>
    );
  }

  const nextPts = NEXT_MILESTONE_PTS[stats.badge];
  const curPts = CURR_MILESTONE_PTS[stats.badge] ?? 0;
  const progressPct = nextPts
    ? Math.min(100, ((stats.totalPoints - curPts) / (nextPts - curPts)) * 100)
    : 100;

  const nextBadge = nextPts
    ? MILESTONE_ORDER[MILESTONE_ORDER.indexOf(stats.badge) + 1] ?? null
    : null;

  return (
    <div className="gc-panel">
      {/* Back button */}
      {onBack && (
        <button className="gc-btn gc-btn-secondary gc-btn-sm" onClick={onBack} id="back-btn">
          ← Back to Leaderboard
        </button>
      )}

      {/* Stats Card */}
      <div className="gc-stats-card gc-fade-in">
        <div className="gc-stats-top">
          <div className="gc-stats-avatar">{BADGE_EMOJI[stats.badge] || '👤'}</div>
          <div style={{ flex: 1 }}>
            <div className="gc-stats-name">u/{stats.username}</div>
            <BadgePill badge={stats.badge} />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="gc-stats-points">{stats.totalPoints.toLocaleString()}</div>
            <div className="gc-stats-pts-label">total {pointLabel}</div>
          </div>
        </div>

        <div className="gc-stats-meta">
          <div className="gc-stats-meta-item">
            <div className="gc-stats-meta-label">This Week</div>
            <div className="gc-stats-meta-val">+{stats.weeklyPoints.toLocaleString()}</div>
          </div>
          <div className="gc-stats-meta-item">
            <div className="gc-stats-meta-label">Rank</div>
            <div className="gc-stats-meta-val">
              {stats.rank ? `#${stats.rank}` : 'Unranked'}
            </div>
          </div>
          <div className="gc-stats-meta-item">
            <div className="gc-stats-meta-label">Helpful Awards</div>
            <div className="gc-stats-meta-val">{stats.helpfulAwardsCount ?? 0}</div>
          </div>
        </div>

        {/* Trust Score Wrap */}
        <div className="gc-trust-wrap">
          <div className="gc-trust-label">
            <span>Security & Trust Score</span>
            <span className={`gc-trust-rating ${stats.trustScore !== undefined && stats.trustScore >= 80 ? 'high' : stats.trustScore !== undefined && stats.trustScore < 60 ? 'low' : 'medium'}`}>
              {stats.trustScore !== undefined && stats.trustScore >= 80 ? '🟢 High-Trust' : stats.trustScore !== undefined && stats.trustScore < 60 ? '🔴 Suspicious / Low-Trust' : '🟡 Standard-Trust'}
            </span>
          </div>
          <div className="gc-trust-bar-bg">
            <div 
              className={`gc-trust-bar-fill ${stats.trustScore !== undefined && stats.trustScore >= 80 ? 'high' : stats.trustScore !== undefined && stats.trustScore < 60 ? 'low' : 'medium'}`} 
              style={{ width: `${stats.trustScore ?? 100}%` }} 
            />
          </div>
          <div className="gc-trust-stats">
            <span>Score: {stats.trustScore ?? 100}/100</span>
            <span>{stats.removals60Days ?? 0} removals · {stats.warningsCount ?? 0} warnings · {stats.ruleBreaksCount ?? 0} violations</span>
          </div>
        </div>

        {/* Daily Cap Progress Wrap (Anti-Farming indicator) */}
        <div className="gc-farming-gauge">
          <div className="gc-progress-label">
            <span>Daily Point Limit Progress</span>
            <span>{stats.dailyEarnedPoints ?? 0} / {dailyCap} {pointLabel}</span>
          </div>
          <div className="gc-progress-bar">
            <div 
              className="gc-progress-fill" 
              style={{ 
                width: `${Math.min(100, (((stats.dailyEarnedPoints ?? 0) / dailyCap) * 100))}%`,
                background: (stats.dailyEarnedPoints ?? 0) >= dailyCap ? '#f85149' : 'linear-gradient(90deg, #10b981, #059669)'
              }} 
            />
          </div>
          {(stats.dailyEarnedPoints ?? 0) >= dailyCap && (
            <span className="gc-farming-warning">⚠️ Daily point limit reached. Anti-farming system is active.</span>
          )}
        </div>

        {/* Progress to next badge */}
        {nextPts && nextBadge ? (
          <div className="gc-progress-wrap">
            <div className="gc-progress-label">
              <span>Progress to {BADGE_LABELS[nextBadge]}</span>
              <span>{stats.totalPoints.toLocaleString()} / {nextPts.toLocaleString()} {pointLabel}</span>
            </div>
            <div className="gc-progress-bar">
              <div className="gc-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right' }}>
              {Math.max(0, nextPts - stats.totalPoints)} {pointLabel} to go
            </div>
          </div>
        ) : (
          <div className="gc-alert gc-alert-success">
            🌟 Highest tier achieved — Community Star!
          </div>
        )}
      </div>

      {/* Point History */}
      {stats.history.length > 0 && (
        <>
          <span className="gc-section-title">Point History</span>
          <div className="gc-history">
            {stats.history.map((ev: PointEvent, i: number) => (
              <div
                key={i}
                className="gc-history-item gc-fade-in"
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <span className={`gc-history-delta ${ev.delta >= 0 ? 'positive' : 'negative'}`}>
                  {ev.delta >= 0 ? '+' : ''}{ev.delta}
                </span>
                <div className="gc-history-info">
                  <div className="gc-history-reason">{ev.reason}</div>
                  <div className="gc-history-meta">
                    by {ev.awardedBy} · {formatTime(ev.ts)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ─── Leaderboard Tab ───────────────────────────────────────────────────────────

const LeaderboardTab = ({
  username,
  gc,
  onViewUser,
  pointLabel,
}: {
  username: string;
  gc: ReturnType<typeof useGoodCitizen>;
  onViewUser: (u: string) => void;
  pointLabel: string;
}) => {
  const [view, setView] = useState<'weekly' | 'alltime'>('alltime');
  const [weekly, setWeekly] = useState<LeaderboardEntry[]>([]);
  const [allTime, setAllTime] = useState<LeaderboardEntry[]>(gc.leaderboard);
  const [achievements, setAchievements] = useState<BadgeAchievement[]>([]);
  const [lbLoading, setLbLoading] = useState(false);
  const [showAchievements, setShowAchievements] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLbLoading(true);
      const [lbData, achData] = await Promise.all([
        gc.fetchLeaderboard(),
        gc.fetchAchievements(),
      ]);
      if (lbData) {
        setAllTime(lbData.allTime);
        setWeekly(lbData.weekly);
      }
      setAchievements(achData);
      setLbLoading(false);
    };
    void load();
  }, []);

  const shown = view === 'weekly' ? weekly : allTime;

  return (
    <div className="gc-panel">
      {/* Recent Achievements Feed */}
      {achievements.length > 0 && (
        <>
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
            onClick={() => setShowAchievements((v) => !v)}
          >
            <span className="gc-section-title">🎉 Recent Badge Achievements</span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {showAchievements ? '▲ hide' : '▼ show'}
            </span>
          </div>
          {showAchievements && (
            <div className="gc-history" style={{ marginBottom: '4px' }}>
              {achievements.slice(0, 5).map((a, i) => (
                <AchievementItem key={i} achievement={a} delay={i * 0.06} />
              ))}
            </div>
          )}
          <div className="gc-divider" />
        </>
      )}

      {/* Leaderboard header with toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="gc-section-title">Community Rankings</span>
        <div className="gc-toggle">
          <button
            className={`gc-toggle-btn ${view === 'alltime' ? 'active' : ''}`}
            onClick={() => setView('alltime')}
          >
            All Time
          </button>
          <button
            className={`gc-toggle-btn ${view === 'weekly' ? 'active' : ''}`}
            onClick={() => setView('weekly')}
          >
            This Week
          </button>
        </div>
      </div>

      {lbLoading ? (
        <div className="gc-spinner">
          <div className="gc-spinner-dot" /><div className="gc-spinner-dot" /><div className="gc-spinner-dot" />
        </div>
      ) : shown.length === 0 ? (
        <div className="gc-empty">
          <div className="gc-empty-icon">🏆</div>
          <div>No contributors yet — be the first!</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Mods award points via the post/comment menu.
          </div>
        </div>
      ) : (
        <div className="gc-leaderboard">
          {shown.map((e) => (
            <LbRow
              key={e.username}
              entry={e}
              isMe={e.username === username}
              onClick={onViewUser}
              pointLabel={pointLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Award Form ────────────────────────────────────────────────────────────────

const AwardForm = ({ gc, pointLabel }: { gc: ReturnType<typeof useGoodCitizen>; pointLabel: string }) => {
  const [targetUsername, setTargetUsername] = useState('');
  const [points, setPoints] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUsername.trim() || !points || !reason.trim()) {
      setFeedback({ ok: false, msg: 'All fields are required.' });
      return;
    }
    const pts = parseInt(points);
    if (isNaN(pts) || pts < 1 || pts > 500) {
      setFeedback({ ok: false, msg: `Points must be between 1 and 500.` });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    const result = await gc.award(targetUsername.trim(), pts, reason.trim());
    setSubmitting(false);
    if (result.success) {
      setFeedback({
        ok: true,
        msg: `✅ Awarded ${pts} ${pointLabel} to u/${targetUsername.trim()}! (Total: ${result.newTotal})${result.milestoneReached ? ` 🎉 ${BADGE_LABELS[result.milestoneReached]} milestone!` : ''}`,
      });
      setTargetUsername(''); setPoints(''); setReason('');
    } else {
      setFeedback({ ok: false, msg: `❌ ${result.message}` });
    }
  };

  return (
    <form className="gc-form" onSubmit={handleSubmit}>
      <div className="gc-form-title">🎁 Award {pointLabel}</div>
      {feedback && (
        <div className={`gc-alert ${feedback.ok ? 'gc-alert-success' : 'gc-alert-error'}`}>
          {feedback.msg}
        </div>
      )}
      <div className="gc-field">
        <label className="gc-label">Reddit Username</label>
        <input id="award-username" className="gc-input" placeholder="e.g. helpful_redditor"
          value={targetUsername} onChange={(e) => setTargetUsername(e.target.value)} disabled={submitting} />
      </div>
      <div className="gc-field">
        <label className="gc-label">{pointLabel} (1–500)</label>
        <input id="award-points" className="gc-input" type="number" min={1} max={500}
          placeholder="e.g. 15" value={points} onChange={(e) => setPoints(e.target.value)} disabled={submitting} />
      </div>
      <div className="gc-field">
        <label className="gc-label">Reason (required for audit log)</label>
        <textarea id="award-reason" className="gc-textarea"
          placeholder="e.g. Excellent step-by-step answer that helped many members"
          value={reason} onChange={(e) => setReason(e.target.value)} disabled={submitting} />
      </div>
      <button id="award-submit" className="gc-btn gc-btn-primary gc-btn-block" type="submit" disabled={submitting}>
        {submitting ? 'Awarding…' : `Award ${pointLabel}`}
      </button>
    </form>
  );
};

// ─── Revoke Form ───────────────────────────────────────────────────────────────

const RevokeForm = ({ gc, pointLabel }: { gc: ReturnType<typeof useGoodCitizen>; pointLabel: string }) => {
  const [targetUsername, setTargetUsername] = useState('');
  const [points, setPoints] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUsername.trim() || !points || !reason.trim()) {
      setFeedback({ ok: false, msg: 'All fields are required.' });
      return;
    }
    const pts = parseInt(points);
    if (isNaN(pts) || pts < 1) {
      setFeedback({ ok: false, msg: 'Points must be a positive number.' });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    const result = await gc.revoke(targetUsername.trim(), pts, reason.trim());
    setSubmitting(false);
    if (result.success) {
      setFeedback({ ok: true, msg: `✅ Revoked ${pts} ${pointLabel} from u/${targetUsername.trim()}. New total: ${result.newTotal}` });
      setTargetUsername(''); setPoints(''); setReason('');
    } else {
      setFeedback({ ok: false, msg: `❌ ${result.message}` });
    }
  };

  return (
    <form className="gc-form" onSubmit={handleSubmit}>
      <div className="gc-form-title">🚫 Revoke {pointLabel}</div>
      {feedback && (
        <div className={`gc-alert ${feedback.ok ? 'gc-alert-success' : 'gc-alert-error'}`}>
          {feedback.msg}
        </div>
      )}
      <div className="gc-field">
        <label className="gc-label">Reddit Username</label>
        <input id="revoke-username" className="gc-input" placeholder="e.g. suspected_farmer"
          value={targetUsername} onChange={(e) => setTargetUsername(e.target.value)} disabled={submitting} />
      </div>
      <div className="gc-field">
        <label className="gc-label">{pointLabel} to Revoke</label>
        <input id="revoke-points" className="gc-input" type="number" min={1}
          placeholder="e.g. 30" value={points} onChange={(e) => setPoints(e.target.value)} disabled={submitting} />
      </div>
      <div className="gc-field">
        <label className="gc-label">Reason (required)</label>
        <textarea id="revoke-reason" className="gc-textarea"
          placeholder="e.g. Suspected point farming — multiple low-effort posts"
          value={reason} onChange={(e) => setReason(e.target.value)} disabled={submitting} />
      </div>
      <button id="revoke-submit" className="gc-btn gc-btn-danger gc-btn-block" type="submit" disabled={submitting}>
        {submitting ? 'Revoking…' : `Revoke ${pointLabel}`}
      </button>
    </form>
  );
};

// ─── Weekly Stats Widget ───────────────────────────────────────────────────────

const WeeklyStatsWidget = ({ gc }: { gc: ReturnType<typeof useGoodCitizen> }) => {
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const s = await gc.fetchWeeklyStats();
      setStats(s);
      setLoading(false);
    };
    void load();
  }, []);

  if (loading) {
    return (
      <div className="gc-spinner" style={{ padding: '16px' }}>
        <div className="gc-spinner-dot" /><div className="gc-spinner-dot" /><div className="gc-spinner-dot" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* 4 Stats Cards */}
      <div className="gc-stats-card gc-fade-in" style={{ gap: '10px' }}>
        <div className="gc-form-title">📊 This Week's Stats</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
          }}
        >
          {[
            { label: 'Points Awarded', value: stats.pointsAwarded.toLocaleString(), emoji: '🎯' },
            { label: 'Award Actions', value: stats.awardsCount.toLocaleString(), emoji: '🎁' },
            { label: 'Badges Earned', value: stats.badgesAwarded.toLocaleString(), emoji: '🏅' },
            {
              label: 'Top Contributor',
              value: stats.topAwardedUser ? `u/${stats.topAwardedUser}` : '—',
              emoji: '👑',
            },
          ].map(({ label, value, emoji }) => (
            <div
              key={label}
              style={{
                background: 'var(--bg-surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ fontSize: '18px' }}>{emoji}</div>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.5px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {value}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                {label}
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right' }}>
          Week #{stats.weekNumber}
        </div>
      </div>

      {/* Community Health Report Card */}
      <div className="gc-stats-card gc-fade-in" style={{ borderLeft: '4px solid var(--brand-primary)', gap: '10px' }}>
        <div className="gc-form-title" style={{ color: 'var(--brand-primary)' }}>💚 Weekly Community Health Report</div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          Weekly health check and moderator signal analysis.
        </div>
        <div className="gc-health-stats" style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '4px 0' }}>
          <div className="gc-health-row" style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
            <span>👑</span>
            <strong style={{ color: 'var(--text-primary)' }}>Top Helpful Users:</strong>
            <span style={{ color: 'var(--badge-community_star)', fontWeight: 600 }}>
              {stats.topAwardedUser ? `u/${stats.topAwardedUser}` : 'None yet'}
            </span>
          </div>
          <div className="gc-health-row" style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
            <span>💬</span>
            <strong style={{ color: 'var(--text-primary)' }}>Rewarded Comments:</strong>
            <span>{stats.rewardedCommentsCount ?? 0} rewarded comments</span>
          </div>
          <div className="gc-health-row" style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
            <span>🛡️</span>
            <strong style={{ color: 'var(--text-primary)' }}>Repeat Violations Trend:</strong>
            <span style={{ color: (stats.repeatViolationsDelta ?? 0) >= 0 ? '#10b981' : '#f85149', fontWeight: 600 }}>
              {(stats.repeatViolationsDelta ?? 0) >= 0 
                ? `📉 ${stats.repeatViolationsDelta ?? 0} fewer repeat violations` 
                : `📈 ${Math.abs(stats.repeatViolationsDelta ?? 0)} more repeat violations`}
            </span>
          </div>
          <div className="gc-health-row" style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
            <span>🚀</span>
            <strong style={{ color: 'var(--text-primary)' }}>Moved to Trusted Flair:</strong>
            <span>{stats.trustedFlairUpgrades ?? 0} users upgraded</span>
          </div>
        </div>
        <div className="gc-health-summary" style={{ padding: '8px 10px', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '11px', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
          "Top helpful users, {stats.rewardedCommentsCount ?? 0} rewarded comments, {stats.repeatViolationsDelta ?? 0} fewer repeat violations, {stats.trustedFlairUpgrades ?? 0} users moved to trusted flair."
        </div>
      </div>
    </div>
  );
};

// ─── Config Panel ─────────────────────────────────────────────────────────────

const ConfigPanel = ({ gc }: { gc: ReturnType<typeof useGoodCitizen> }) => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [milestoneTab, setMilestoneTab] = useState<BadgeTier>('new_member');

  useEffect(() => {
    const load = async () => {
      const c = await gc.fetchConfig();
      setConfig(c);
      setLoading(false);
    };
    void load();
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    const ok = await gc.saveConfig(config);
    setSaving(false);
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
  };

  const handlePresetChange = async (preset: 'default' | 'learnprogramming' | 'personalfinance' | 'loseit') => {
    if (!config) return;
    setSaving(true);
    const updated = {
      ...config,
      subredditPreset: preset,
    };
    const ok = await gc.saveConfig(updated);
    if (ok) {
      const c = await gc.fetchConfig();
      setConfig(c);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  if (loading || !config) {
    return (
      <div className="gc-spinner">
        <div className="gc-spinner-dot" /><div className="gc-spinner-dot" /><div className="gc-spinner-dot" />
      </div>
    );
  }

  const updateField = <K extends keyof AppConfig>(key: K, val: AppConfig[K]) =>
    setConfig((prev: AppConfig | null) => prev ? { ...prev, [key]: val } : prev);

  const updateMilestone = (badge: BadgeTier, field: keyof MilestoneConfig, val: string | number) =>
    setConfig((prev: AppConfig | null) => {
      if (!prev) return prev;
      return {
        ...prev,
        milestones: prev.milestones.map((m: MilestoneConfig) =>
          m.badge === badge ? { ...m, [field]: val } : m
        ),
      };
    });

  const currentMilestone = config.milestones.find((m: MilestoneConfig) => m.badge === milestoneTab);

  const pointLabel = config.pointLabel ?? 'points';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {saved && <div className="gc-alert gc-alert-success">✅ Configuration saved!</div>}

      {/* Preset dropdown */}
      <div className="gc-form">
        <div className="gc-form-title">📋 Subreddit Preset Selector</div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
          Select a preset to dynamically adjust points terminology, flairs, and configurations.
        </div>
        <select
          value={config.subredditPreset ?? 'default'}
          onChange={(e) => handlePresetChange(e.target.value as 'default' | 'learnprogramming' | 'personalfinance' | 'loseit')}
          className="gc-select"
          disabled={saving}
        >
          <option value="default">Standard Subreddit Preset (GoodCitizen Points)</option>
          <option value="learnprogramming">r/learnprogramming (Mentor Points)</option>
          <option value="personalfinance">r/personalfinance (Trusted Advice Points)</option>
          <option value="loseit">r/loseit (Encourager Points)</option>
        </select>
      </div>

      {/* Point Values */}
      <div className="gc-form">
        <div className="gc-form-title">🎯 {pointLabel.toUpperCase()} Point Values</div>
        {[
          { label: 'First Post Welcome Bonus', key: 'firstPostBonus' as const },
          { label: 'Approved Post Bonus', key: 'approvedPostBonus' as const },
          { label: 'Good Contribution Tag', key: 'goodContributionBonus' as const },
          { label: 'Helpful Nomination Bonus', key: 'helpfulNominationBonus' as const },
        ].map(({ label, key }) => (
          <div className="gc-config-row" key={key}>
            <span className="gc-config-label">{label}</span>
            <input
              className="gc-input gc-config-input-sm"
              type="number" min={0} max={500}
              value={config[key] as number}
              onChange={(e) => updateField(key, parseInt(e.target.value) || 0)}
            />
          </div>
        ))}
      </div>

      {/* Anti-Abuse */}
      <div className="gc-form">
        <div className="gc-form-title">🛡️ Anti-Abuse Limits</div>
        <div className="gc-config-row">
          <span className="gc-config-label">Daily User Point Cap</span>
          <input className="gc-input gc-config-input-sm" type="number" min={10} max={1000}
            value={config.dailyUserCap}
            onChange={(e) => updateField('dailyUserCap', parseInt(e.target.value) || 100)} />
        </div>
        <div className="gc-config-row">
          <span className="gc-config-label">Mod Awards Per User Per Day</span>
          <input className="gc-input gc-config-input-sm" type="number" min={1} max={20}
            value={config.dailyModAwardLimit}
            onChange={(e) => updateField('dailyModAwardLimit', parseInt(e.target.value) || 3)} />
        </div>
      </div>

      {/* Milestone Config */}
      <div className="gc-form">
        <div className="gc-form-title">🏅 Milestone Configuration</div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
          Customize flair text and DM message for each badge tier.
        </div>

        {/* Milestone tier selector */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
          {MILESTONE_ORDER.map((badge) => (
            <button
              key={badge}
              className={`gc-btn gc-btn-sm ${milestoneTab === badge ? 'gc-btn-primary' : 'gc-btn-secondary'}`}
              onClick={() => setMilestoneTab(badge)}
              style={{ fontSize: '10px' }}
            >
              {BADGE_EMOJI[badge]} {badge.replace('_', ' ')}
            </button>
          ))}
        </div>

        {currentMilestone && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="gc-config-row" style={{ flexWrap: 'wrap', gap: '6px' }}>
              <span className="gc-config-label" style={{ flex: '0 0 100%' }}>
                Point Threshold
              </span>
              <input
                className="gc-input gc-config-input-sm"
                type="number" min={1} max={10000}
                value={currentMilestone.points}
                onChange={(e) =>
                  updateMilestone(milestoneTab, 'points', parseInt(e.target.value) || 0)
                }
              />
            </div>
            <div className="gc-field">
              <label className="gc-label">Flair Text</label>
              <input
                className="gc-input"
                placeholder="e.g. 🌱 New Member"
                value={currentMilestone.flairText}
                onChange={(e) => updateMilestone(milestoneTab, 'flairText', e.target.value)}
              />
            </div>
            <div className="gc-field">
              <label className="gc-label">Congratulatory DM Message</label>
              <textarea
                className="gc-textarea"
                style={{ minHeight: '80px' }}
                placeholder="Message sent to user when they reach this milestone…"
                value={currentMilestone.dmMessage}
                onChange={(e) => updateMilestone(milestoneTab, 'dmMessage', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <button
        id="config-save"
        className="gc-btn gc-btn-primary gc-btn-block"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Saving…' : 'Save All Configuration'}
      </button>
    </div>
  );
};

// ─── Audit Log Panel ──────────────────────────────────────────────────────────

const AuditPanel = ({ gc }: { gc: ReturnType<typeof useGoodCitizen> }) => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const e = await gc.fetchAudit();
      setEntries(e);
      setLoading(false);
    };
    void load();
  }, []);

  if (loading) {
    return <div className="gc-spinner"><div className="gc-spinner-dot" /><div className="gc-spinner-dot" /><div className="gc-spinner-dot" /></div>;
  }

  if (entries.length === 0) {
    return <div className="gc-empty"><div className="gc-empty-icon">📋</div><div>No audit entries yet.</div></div>;
  }

  return (
    <div className="gc-history" style={{ gap: '6px' }}>
      {entries.map((e, i) => (
        <div key={i} className={`gc-audit-item ${e.action} gc-fade-in`} style={{ animationDelay: `${i * 0.03}s` }}>
          <div className="gc-audit-header">
            <span className={`gc-audit-action ${e.action}`}>{e.action.replace('_', ' ')}</span>
            <span className="gc-audit-time">{formatTime(e.ts)}</span>
          </div>
          <div className="gc-audit-body">
            {e.delta !== 0 && <strong>{e.delta > 0 ? '+' : ''}{e.delta} pts</strong>}{' '}
            {e.action !== 'config_change'
              ? <>to u/{e.targetUsername} by u/{e.modUsername}</>
              : <>by u/{e.modUsername}</>}
          </div>
          {e.reason && <div className="gc-audit-reason">"{e.reason}"</div>}
        </div>
      ))}
    </div>
  );
};

// ─── Mod Dashboard Tab ────────────────────────────────────────────────────────

const ModQueueSimulator = ({ gc, pointLabel }: { gc: ReturnType<typeof useGoodCitizen>; pointLabel: string }) => {
  const [posts, setPosts] = useState<ModQueuePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ id: string; msg: string; success: boolean } | null>(null);
  const [reasonInputs, setReasonInputs] = useState<Record<string, string>>({});

  const load = async (showLoading = true) => {
    if (showLoading && typeof showLoading === 'boolean') setLoading(true);
    const p = await gc.fetchModQueue();
    setPosts(p);
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(false);
  }, []);

  const handleAction = async (postId: string, action: 'approve' | 'remove' | 'warn' | 'rule_break') => {
    const reason = reasonInputs[postId] || '';
    if (action !== 'approve' && !reason.trim()) {
      setFeedback({ id: postId, msg: 'A reason note is required for penalties (Anti-Farming safeguard).', success: false });
      return;
    }

    setFeedback(null);
    const res = await gc.processModQueueAction(postId, action, reason.trim());
    if (res.success) {
      setFeedback({
        id: postId,
        msg: `Processed: ${action.toUpperCase()}. Author's new trust: ${res.authorTrustScore}/100, ${pointLabel}: ${res.authorPoints}.`,
        success: true,
      });
      setReasonInputs((prev) => ({ ...prev, [postId]: '' }));
      const p = await gc.fetchModQueue();
      setPosts(p);
      void gc.refreshLeaderboard();
    } else {
      setFeedback({ id: postId, msg: res.message, success: false });
    }
  };

  if (loading) {
    return (
      <div className="gc-spinner">
        <div className="gc-spinner-dot" /><div className="gc-spinner-dot" /><div className="gc-spinner-dot" />
      </div>
    );
  }

  const pendingPosts = posts.filter((p) => p.status === 'pending');

  return (
    <div className="gc-sim-queue" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div className="gc-form-title">📥 Moderator Queue (Simulator)</div>
      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
        Review posts from users. High-trust contributors have priority signals to save processing time.
      </div>

      {feedback && feedback.success && (
        <div className="gc-alert gc-alert-success" style={{ marginBottom: '4px' }}>
          {feedback.msg}
        </div>
      )}

      {pendingPosts.length === 0 ? (
        <div className="gc-empty">
          <div className="gc-empty-icon">✅</div>
          <div>All clear! No posts in the queue.</div>
          <button className="gc-btn gc-btn-secondary gc-btn-sm" onClick={() => void load()} style={{ marginTop: '8px' }}>
            Reload Simulator Posts
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
          {pendingPosts.map((post) => (
            <div key={post.id} className="gc-queue-card" style={{ padding: '12px', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Priority Signal */}
              <div className={`gc-queue-signal priority-${post.priorityBadge}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', padding: '6px 8px', borderRadius: 'var(--radius-sm)', background: post.priorityBadge === 'high' ? 'rgba(16, 185, 129, 0.12)' : post.priorityBadge === 'low' ? 'rgba(248, 81, 73, 0.12)' : 'rgba(245, 158, 11, 0.12)', border: '1px solid', borderColor: post.priorityBadge === 'high' ? 'rgba(16, 185, 129, 0.3)' : post.priorityBadge === 'low' ? 'rgba(248, 81, 73, 0.3)' : 'rgba(245, 158, 11, 0.3)', color: post.priorityBadge === 'high' ? '#10b981' : post.priorityBadge === 'low' ? '#f85149' : '#f59e0b', fontWeight: 600 }}>
                <span>⚡</span>
                <span>{post.priorityReason}</span>
              </div>

              {/* Post Details */}
              <div className="gc-queue-post-title" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>"{post.title}"</div>
              <div className="gc-queue-post-body" style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--bg-surface)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>{post.body}</div>
              <div className="gc-queue-post-author" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Submitted by u/{post.author}</div>

              {/* Action Feedback */}
              {feedback && !feedback.success && feedback.id === post.id && (
                <div className="gc-alert gc-alert-error" style={{ padding: '6px 8px', fontSize: '11px' }}>
                  {feedback.msg}
                </div>
              )}

              {/* Penalty Reason Input */}
              <div className="gc-field">
                <input
                  className="gc-input"
                  style={{ fontSize: '11px', padding: '6px 8px' }}
                  placeholder="Reason for warning / removal / rule break (required for audits)..."
                  value={reasonInputs[post.id] || ''}
                  onChange={(e) => setReasonInputs((prev) => ({ ...prev, [post.id]: e.target.value }))}
                />
              </div>

              {/* Action Buttons */}
              <div className="gc-queue-actions" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  className="gc-btn gc-btn-sm gc-btn-primary"
                  style={{ background: '#10b981', flex: 1 }}
                  onClick={() => handleAction(post.id, 'approve')}
                >
                  Approve
                </button>
                <button
                  className="gc-btn gc-btn-sm gc-btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => handleAction(post.id, 'warn')}
                >
                  Warn (-10)
                </button>
                <button
                  className="gc-btn gc-btn-sm gc-btn-danger"
                  style={{ flex: 1 }}
                  onClick={() => handleAction(post.id, 'remove')}
                >
                  Remove (-15)
                </button>
                <button
                  className="gc-btn gc-btn-sm gc-btn-danger"
                  style={{ background: '#7f1d1d', borderColor: '#991b1b', color: '#fca5a5', flex: 1 }}
                  onClick={() => handleAction(post.id, 'rule_break')}
                >
                  Violate (-20)
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ModDashTab = ({ gc, pointLabel }: { gc: ReturnType<typeof useGoodCitizen>; pointLabel: string }) => {
  const [section, setSection] = useState<'stats' | 'queue' | 'award' | 'revoke' | 'config' | 'audit'>('stats');

  return (
    <div className="gc-panel">
      {/* Sub-nav */}
      <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-surface)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {([
          { key: 'stats', label: '📊 Stats' },
          { key: 'queue', label: '📥 Mod Queue' },
          { key: 'award', label: '🎁 Award' },
          { key: 'revoke', label: '🚫 Revoke' },
          { key: 'config', label: '⚙️ Config' },
          { key: 'audit', label: '📋 Audit' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            id={`mod-nav-${key}`}
            className={`gc-btn gc-btn-sm ${section === key ? 'gc-btn-primary' : 'gc-btn-secondary'}`}
            onClick={() => setSection(key)}
            style={{ flex: 1 }}
          >
            {label}
          </button>
        ))}
      </div>

      {section === 'stats'  && <WeeklyStatsWidget gc={gc} />}
      {section === 'queue'  && <ModQueueSimulator gc={gc} pointLabel={pointLabel} />}
      {section === 'award'  && <AwardForm gc={gc} pointLabel={pointLabel} />}
      {section === 'revoke' && <RevokeForm gc={gc} pointLabel={pointLabel} />}
      {section === 'config' && <ConfigPanel gc={gc} />}
      {section === 'audit'  && (
        <>
          <span className="gc-section-title">Audit Log (last 50 actions)</span>
          <AuditPanel gc={gc} />
        </>
      )}
    </div>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────────

type TabId = 'leaderboard' | 'stats' | 'mod';

export const App = () => {
  const gc = useGoodCitizen();
  const [tab, setTab] = useState<TabId>('leaderboard');
  const [config, setConfig] = useState<AppConfig | null>(null);
  // Viewing a specific user's stats (from leaderboard click)
  const [viewingUser, setViewingUser] = useState<string | null>(null);
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('gc-theme') ?? 'theme-sunset');

  useEffect(() => {
    if (gc.initState === 'success') {
      const load = async () => {
        const c = await gc.fetchConfig();
        setConfig(c);
      };
      void load();
    }
  }, [gc.initState, gc.userStats?.totalPoints]); // Sync configurations if state changes

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('gc-theme', newTheme);
  };

  const handleViewUser = useCallback((username: string) => {
    setViewingUser(username);
    setTab('stats');
  }, []);

  const handleBackFromUser = useCallback(() => {
    setViewingUser(null);
  }, []);

  const tabs: { id: TabId; label: string; modOnly?: boolean }[] = [
    { id: 'leaderboard', label: '🏆 Leaderboard' },
    { id: 'stats', label: '📊 My Stats' },
    { id: 'mod', label: '⚙️ Mod Tools', modOnly: true },
  ];

  const visibleTabs = tabs.filter((t) => !t.modOnly || gc.isMod);

  const handleTabChange = (id: TabId) => {
    if (id !== 'stats') setViewingUser(null); // Clear viewed user when leaving stats tab
    setTab(id);
  };

  if (gc.initState === 'loading') {
    return (
      <div className="gc-app" style={{ justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div className="gc-spinner-dot" style={{ width: 12, height: 12 }} />
          <div className="gc-spinner-dot" style={{ width: 12, height: 12, animationDelay: '0.2s' }} />
          <div className="gc-spinner-dot" style={{ width: 12, height: 12, animationDelay: '0.4s' }} />
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Loading GoodCitizen…</div>
      </div>
    );
  }

  if (gc.initState === 'error') {
    return (
      <div className="gc-app" style={{ justifyContent: 'center', padding: '24px' }}>
        <div className="gc-alert gc-alert-error">{gc.errorMsg ?? 'Failed to load. Please refresh.'}</div>
      </div>
    );
  }

  const pointLabel = config?.pointLabel ?? 'points';
  const dailyCap = config?.dailyUserCap ?? 100;

  // Header shows points of currently viewing user (or self)
  const displayStats = viewingUser && viewingUser !== gc.username ? null : gc.userStats;

  return (
    <div className={`gc-app ${theme}`}>
      {/* Header */}
      <header className="gc-header">
        <div className="gc-header-logo"><LogoSVG size={26} /></div>
        <span className="gc-header-title">GoodCitizen</span>

        {/* Theme Selector */}
        <select
          value={theme}
          onChange={(e) => handleThemeChange(e.target.value)}
          className="gc-select"
          style={{ width: 'auto', padding: '2px 8px', fontSize: '11px', height: '24px', marginLeft: '12px' }}
        >
          <option value="theme-sunset">🌅 Sunset</option>
          <option value="theme-cyber">🌌 Cyber</option>
          <option value="theme-emerald">🌲 Emerald</option>
        </select>

        {displayStats && (
          <span className="gc-header-sub">
            {BADGE_EMOJI[displayStats.badge] || ''} {displayStats.totalPoints.toLocaleString()} {pointLabel}
          </span>
        )}
        {viewingUser && viewingUser !== gc.username && (
          <span className="gc-header-sub" style={{ color: 'var(--badge-regular)' }}>
            viewing u/{viewingUser}
          </span>
        )}
      </header>

      {/* Tab bar */}
      <nav className="gc-tabs">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            className={`gc-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => handleTabChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="gc-scroll">
        {tab === 'leaderboard' && (
          <LeaderboardTab username={gc.username} gc={gc} onViewUser={handleViewUser} pointLabel={pointLabel} />
        )}
        {tab === 'stats' && (
          viewingUser ? (
            <UserStatsPanel
              username={viewingUser}
              gc={gc}
              onBack={handleBackFromUser}
              pointLabel={pointLabel}
              dailyCap={dailyCap}
            />
          ) : (
            <UserStatsPanel
              username={gc.username}
              gc={gc}
              pointLabel={pointLabel}
              dailyCap={dailyCap}
            />
          )
        )}
        {tab === 'mod' && gc.isMod && <ModDashTab gc={gc} pointLabel={pointLabel} />}
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
