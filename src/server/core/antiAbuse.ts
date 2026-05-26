import { redis } from '@devvit/web/server';
import { KEYS, todayKey, getConfig } from './redis';

export type AntiAbuseResult =
  | { allowed: true }
  | { allowed: false; reason: string };

/**
 * Check if a mod can award points to a target user right now.
 * - User must not have hit the daily point cap.
 * - Mod must not have awarded the same user more than dailyModAwardLimit times today.
 */
export async function checkAntiAbuse(
  modUsername: string,
  targetUsername: string,
  pointsToAward: number
): Promise<AntiAbuseResult> {
  const config = await getConfig();
  const day = todayKey();

  // 1. Check daily user cap
  const dailyTotalStr = await redis.get(
    KEYS.dailyUserTotal(targetUsername, day)
  );
  const dailyTotal = dailyTotalStr ? parseInt(dailyTotalStr) : 0;

  if (dailyTotal + pointsToAward > config.dailyUserCap) {
    return {
      allowed: false,
      reason: `Daily point cap of ${config.dailyUserCap} pts reached for u/${targetUsername} today. Try again tomorrow.`,
    };
  }

  // 2. Check mod-to-user daily limit
  const modAwardKey = KEYS.dailyModAward(modUsername, targetUsername, day);
  const modAwardCountStr = await redis.get(modAwardKey);
  const modAwardCount = modAwardCountStr ? parseInt(modAwardCountStr) : 0;

  if (modAwardCount >= config.dailyModAwardLimit) {
    return {
      allowed: false,
      reason: `You have already awarded u/${targetUsername} ${config.dailyModAwardLimit} times today. Anti-abuse limit reached.`,
    };
  }

  return { allowed: true };
}

/**
 * Record that a mod has awarded a user today (call after a successful award).
 */
export async function recordModAward(
  modUsername: string,
  targetUsername: string
): Promise<void> {
  const day = todayKey();
  const modAwardKey = KEYS.dailyModAward(modUsername, targetUsername, day);
  await redis.incrBy(modAwardKey, 1);
  // Expire at end of day (86400 seconds)
  await redis.expire(modAwardKey, 86400);
}
