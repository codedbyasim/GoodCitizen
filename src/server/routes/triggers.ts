import { Hono } from 'hono';
import type {
  OnAppInstallRequest,
  OnPostCreateRequest,
  OnCommentCreateRequest,
  TriggerResponse,
} from '@devvit/web/shared';
import { context, redis, reddit } from '@devvit/web/server';
import { createPost } from '../core/post';
import {
  DEFAULT_CONFIG,
  KEYS,
  saveConfig,
  awardPoints,
  appendAudit,
} from '../core/redis';
import { checkAndApplyMilestones } from '../core/milestones';

export const triggers = new Hono();

// ─── On App Install ───────────────────────────────────────────────────────────
triggers.post('/on-app-install', async (c) => {
  try {
    // Seed default config if not already set
    const existing = await redis.get(KEYS.config());
    if (!existing) {
      await saveConfig(DEFAULT_CONFIG);
    }

    // Create the leaderboard post
    const post = await createPost();

    // Store the post ID for the scheduler to update
    await redis.set(KEYS.leaderboardPostId(), post.id);

    await c.req.json<OnAppInstallRequest>().catch(() => null);
    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `GoodCitizen installed in r/${context.subredditName}. Leaderboard post: ${post.id}`,
      },
      200
    );
  } catch (error) {
    console.error('Error during app install:', error);
    return c.json<TriggerResponse>(
      { status: 'error', message: 'Failed to initialize GoodCitizen app' },
      400
    );
  }
});

// ─── On Post Create (first-post welcome bonus) ────────────────────────────────
triggers.post('/on-post-create', async (c) => {
  try {
    const input = await c.req.json<OnPostCreateRequest>();
    const username = input.author?.name;

    if (!username) {
      return c.json<TriggerResponse>({ status: 'success', message: 'No author found' }, 200);
    }

    // Rate limit: check explicit lock key to prevent duplicate bonuses
    // (more reliable than checking history length which could have race conditions)
    const lockKey = KEYS.firstPostLock(username);
    const alreadyAwarded = await redis.get(lockKey);

    if (alreadyAwarded) {
      return c.json<TriggerResponse>(
        { status: 'success', message: `u/${username} already received first-post bonus` },
        200
      );
    }

    // Set the lock first (prevents race conditions)
    await redis.set(lockKey, '1');

    // Award the first-post bonus
    const { newTotal, previousBadge } = await awardPoints(
      username,
      DEFAULT_CONFIG.firstPostBonus,
      'First post in the community — welcome bonus! 🎉',
      'system'
    );

    await appendAudit({
      ts: Date.now(),
      action: 'award',
      modUsername: 'system',
      targetUsername: username,
      delta: DEFAULT_CONFIG.firstPostBonus,
      reason: 'First post welcome bonus',
    });

    // Check for milestone
    const subredditName = context.subredditName ?? '';
    await checkAndApplyMilestones(username, newTotal, previousBadge, subredditName);

    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `Awarded ${DEFAULT_CONFIG.firstPostBonus} first-post bonus to u/${username}`,
      },
      200
    );
  } catch (error) {
    console.error('Error in on-post-create trigger:', error);
    return c.json<TriggerResponse>({ status: 'error', message: 'Trigger error' }, 400);
  }
});

// ─── On Comment Create (Gratitude Sentiment Auto-Reward) ──────────────────────
triggers.post('/on-comment-create', async (c) => {
  try {
    const input = await c.req.json<OnCommentCreateRequest>();
    const comment = input.comment;
    if (!comment) {
      return c.json<TriggerResponse>({ status: 'success', message: 'No comment found' }, 200);
    }

    const body = (comment.body ?? '').toLowerCase();
    const gratitudeKeywords = [
      'thank you', 'thanks', 'helpful', 'saved me', 'legend', 'great help',
      'appreciate it', 'shukriya', 'shukria', 'meharbani', 'meharbaani',
      'worked for me', 'solved it', 'awesome answer'
    ];

    const hasGratitude = gratitudeKeywords.some((kw) => body.includes(kw));

    if (hasGratitude) {
      const commenter = comment.author;
      const parentId = comment.parentId;

      if (commenter && parentId) {
        let parentAuthor = '';
        try {
          if (parentId.startsWith('t1_')) {
            // Parent is a comment
            const parentComment = await reddit.getCommentById(parentId as `t1_${string}`);
            parentAuthor = parentComment.authorName;
          } else if (parentId.startsWith('t3_')) {
            // Parent is a post
            const parentPost = await reddit.getPostById(parentId as `t3_${string}`);
            parentAuthor = parentPost.authorName;
          }
        } catch (err) {
          console.error('[GoodCitizen Trigger] Failed to fetch parent author:', err);
        }

        // Make sure we found a valid author who is not the commenter themselves
        if (parentAuthor && parentAuthor !== commenter && parentAuthor !== '[deleted]' && parentAuthor !== 'AutoModerator') {
          // Award points for helpful contribution
          const { newTotal, previousBadge } = await awardPoints(
            parentAuthor,
            DEFAULT_CONFIG.goodContributionBonus,
            `Helpful contribution recognized by u/${commenter} ("${comment.body.slice(0, 40)}...")`,
            'system'
          );

          await appendAudit({
            ts: Date.now(),
            action: 'award',
            modUsername: 'system',
            targetUsername: parentAuthor,
            delta: DEFAULT_CONFIG.goodContributionBonus,
            reason: `Helpful contribution: recognized by u/${commenter}`,
          });

          // Check milestones
          const subredditName = context.subredditName ?? '';
          await checkAndApplyMilestones(parentAuthor, newTotal, previousBadge, subredditName);

          return c.json<TriggerResponse>(
            {
              status: 'success',
              message: `Awarded ${DEFAULT_CONFIG.goodContributionBonus} pts to u/${parentAuthor} for helpfulness acknowledged by u/${commenter}`,
            },
            200
          );
        }
      }
    }

    return c.json<TriggerResponse>({ status: 'success', message: 'Comment checked' }, 200);
  } catch (error) {
    console.error('Error in on-comment-create trigger:', error);
    return c.json<TriggerResponse>({ status: 'error', message: 'Comment trigger failed' }, 400);
  }
});

// ─── Daily Leaderboard Refresh (called by scheduler) ─────────────────────────
triggers.post('/daily-refresh', async (c) => {
  try {
    console.log(`[GoodCitizen] Daily leaderboard refresh triggered at ${new Date().toISOString()}`);
    return c.json<TriggerResponse>(
      { status: 'success', message: 'Daily refresh complete' },
      200
    );
  } catch (error) {
    console.error('Daily refresh error:', error);
    return c.json<TriggerResponse>({ status: 'error', message: 'Refresh failed' }, 400);
  }
});
