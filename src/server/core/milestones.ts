import { reddit, redis } from '@devvit/web/server';
import type { BadgeTier, MilestoneConfig } from '../../shared/api';
import { appendAudit, appendAchievement, KEYS, getConfig, currentWeekNumber } from './redis';

/**
 * Determine which badge tier a user currently qualifies for based on points.
 */
export function getBadgeForPoints(
  points: number,
  milestones: MilestoneConfig[]
): BadgeTier {
  const sorted = [...milestones].sort((a, b) => b.points - a.points);
  for (const m of sorted) {
    if (points >= m.points) return m.badge;
  }
  return 'none';
}

/**
 * Check if a user has crossed any new milestone thresholds after an award.
 * If so: apply flair, send DM, append to achievement feed, log to audit.
 * For Community Star: also create a pinned recognition post.
 * Returns the newly achieved badge (or null if none).
 */
export async function checkAndApplyMilestones(
  username: string,
  newTotal: number,
  previousBadge: BadgeTier,
  subredditName: string
): Promise<BadgeTier | null> {
  const config = await getConfig();
  const newBadge = getBadgeForPoints(newTotal, config.milestones);

  if (newBadge === previousBadge || newBadge === 'none') return null;

  const milestone = config.milestones.find((m) => m.badge === newBadge);
  if (!milestone) return null;

  // Store new badge
  await redis.set(KEYS.userBadge(username), newBadge);

  // Apply flair via Reddit API
  try {
    await reddit.setUserFlair({
      subredditName,
      username,
      text: milestone.flairText,
      cssClass: `gc-badge-${newBadge}`,
    });
  } catch (e) {
    console.error(`Failed to set flair for ${username}:`, e);
  }

  // Send congratulatory DM
  try {
    await reddit.sendPrivateMessage({
      to: username,
      subject: `🏆 GoodCitizen: You've earned the ${milestone.flairText} badge!`,
      text: milestone.dmMessage,
    });
  } catch (e) {
    console.error(`Failed to send DM to ${username}:`, e);
  }

  // Append to badge achievements feed
  await appendAchievement({
    ts: Date.now(),
    username,
    badge: newBadge,
    points: newTotal,
  });

  // Increment weekly badge count
  const week = currentWeekNumber();
  await redis.incrBy(KEYS.weeklyBadges(week), 1);
  await redis.incrBy(KEYS.weeklyFlairUpgrades(week), 1);

  // Community Star special action: create a pinned recognition post
  if (newBadge === 'community_star' && subredditName) {
    try {
      await reddit.submitPost({
        subredditName,
        title: `🌟 Community Star: u/${username} has reached 1000 points!`,
        text: `**Congratulations to u/${username}** for achieving **Community Star** status — the highest honor in our community!\n\n` +
              `They have earned **${newTotal} GoodCitizen points** through consistent quality contributions.\n\n` +
              `Thank you for making this community better. 🙏\n\n` +
              `*This post was automatically created by GoodCitizen — Community Rewards & Positive Behavior System.*`,
      });
    } catch (e) {
      console.error(`Failed to create Community Star recognition post for ${username}:`, e);
    }
  }

  // Log milestone to audit
  await appendAudit({
    ts: Date.now(),
    action: 'milestone',
    modUsername: 'system',
    targetUsername: username,
    delta: 0,
    reason: `Milestone reached: ${milestone.flairText} (${newTotal} pts)`,
  });

  return newBadge;
}
