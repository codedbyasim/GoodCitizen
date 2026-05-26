import './index.css';

import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { requestExpandedMode } from '@devvit/web/client';
import type { LeaderboardEntry, BadgeTier } from '../shared/api';

const RANK_MEDALS = ['🥇', '🥈', '🥉'];
const RANK_COLORS = ['#ffd700', '#c0c0c0', '#cd7f32'];

const BADGE_LABELS: Record<BadgeTier, string> = {
  none: '',
  new_member: '🌱',
  regular: '⭐',
  contributor: '💎',
  veteran: '🔥',
  community_star: '🌟',
};

const LogoSVG = ({ size = 20 }: { size?: number }) => (
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

export const Splash = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const theme = localStorage.getItem('gc-theme') ?? 'theme-sunset';

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/init');
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        setEntries((data.leaderboard ?? []).slice(0, 3));
      } catch {
        // Show empty state
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <div className={`gc-splash ${theme}`}>
      {/* Header */}
      <div className="gc-splash-header">
        <div className="gc-splash-logo"><LogoSVG size={22} /></div>
        <span className="gc-splash-title">GoodCitizen</span>
        <span className="gc-splash-sub">Community Rewards</span>
      </div>

      {/* Top 3 Leaderboard */}
      <div className="gc-splash-lb">
        {loading ? (
          <div className="gc-spinner" style={{ padding: '16px' }}>
            <div className="gc-spinner-dot" />
            <div className="gc-spinner-dot" />
            <div className="gc-spinner-dot" />
          </div>
        ) : entries.length === 0 ? (
          <div className="gc-empty" style={{ padding: '12px', fontSize: '11px' }}>
            <span>No contributors yet — be the first! 🌱</span>
          </div>
        ) : (
          entries.map((e, i) => (
            <div
              key={e.username}
              className="gc-splash-row gc-fade-in"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <span
                className="gc-splash-rank"
                style={{ color: RANK_COLORS[i] ?? 'var(--text-muted)' }}
              >
                {RANK_MEDALS[i] ?? `#${e.rank}`}
              </span>
              <span className="gc-splash-user">
                {BADGE_LABELS[e.badge] ? `${BADGE_LABELS[e.badge]} ` : ''}
                u/{e.username}
              </span>
              <span className="gc-splash-pts">{e.points.toLocaleString()} pts</span>
            </div>
          ))
        )}
      </div>

      {/* CTA Button */}
      <button
        className="gc-splash-cta gc-glow-pulse"
        onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
      >
        View Full Leaderboard →
      </button>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
