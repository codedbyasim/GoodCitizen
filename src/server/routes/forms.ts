import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context, reddit } from '@devvit/web/server';
import { awardPoints, appendAudit } from '../core/redis';
import { checkAndApplyMilestones } from '../core/milestones';
import { checkAntiAbuse, recordModAward } from '../core/antiAbuse';

type AwardFormValues = {
  targetUsername?: string;
  points?: string;
  reason?: string;
};

export const forms = new Hono();

// ─── Award Points Form Submission ─────────────────────────────────────────────
forms.post('/award-submit', async (c) => {
  try {
    const body = await c.req.json<AwardFormValues>();
    const { targetUsername, points: pointsStr, reason } = body;

    // Validation
    if (!targetUsername?.trim() || !pointsStr || !reason?.trim()) {
      return c.json<UiResponse>(
        { showToast: '❌ All fields are required: username, points, and reason.' },
        400
      );
    }

    const points = parseInt(pointsStr);
    if (isNaN(points) || points < 1 || points > 500) {
      return c.json<UiResponse>(
        { showToast: '❌ Points must be a number between 1 and 500.' },
        400
      );
    }

    const modUsername = await reddit.getCurrentUsername();
    if (!modUsername) {
      return c.json<UiResponse>({ showToast: '❌ Could not identify moderator.' }, 401);
    }

    // Anti-abuse check
    const abuseCheck = await checkAntiAbuse(modUsername, targetUsername.trim(), points);
    if (!abuseCheck.allowed) {
      return c.json<UiResponse>({ showToast: `❌ ${abuseCheck.reason}` }, 429);
    }

    // Award points
    const { newTotal, previousBadge } = await awardPoints(
      targetUsername.trim(),
      points,
      reason.trim(),
      modUsername
    );

    // Record mod award for anti-abuse
    await recordModAward(modUsername, targetUsername.trim());

    // Audit log
    await appendAudit({
      ts: Date.now(),
      action: 'award',
      modUsername,
      targetUsername: targetUsername.trim(),
      delta: points,
      reason: reason.trim(),
    });

    // Check milestones
    const subredditName = context.subredditName ?? '';
    const milestoneReached = await checkAndApplyMilestones(
      targetUsername.trim(),
      newTotal,
      previousBadge,
      subredditName
    );

    const milestoneMsg = milestoneReached
      ? ` 🎉 Milestone reached: ${milestoneReached.replace('_', ' ')}!`
      : '';

    return c.json<UiResponse>(
      {
        showToast: `✅ Awarded ${points} pts to u/${targetUsername.trim()} (${newTotal} total).${milestoneMsg}`,
      },
      200
    );
  } catch (error) {
    console.error('Award form submission error:', error);
    return c.json<UiResponse>({ showToast: '❌ Failed to award points. Please try again.' }, 400);
  }
});
