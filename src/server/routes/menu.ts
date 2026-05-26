import { Hono } from 'hono';
import type { UiResponse, Form } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { createPost } from '../core/post';

export const menu = new Hono();

// ─── Create GoodCitizen Leaderboard Post ─────────────────────────────────────
menu.post('/post-create', async (c) => {
  try {
    const post = await createPost();
    return c.json<UiResponse>(
      {
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating GoodCitizen post: ${error}`);
    return c.json<UiResponse>({ showToast: 'Failed to create leaderboard post' }, 400);
  }
});

// ─── Award GoodCitizen Points (context menu on post/comment) ─────────────────
menu.post('/award-points', async (c) => {
  try {
    const body = await c.req.json().catch(() => null);
    const targetUsername = body?.target?.author ?? '';

    const form: Form = {
      title: 'Award GoodCitizen Points',
      acceptLabel: 'Award',
      fields: [
        {
          name: 'targetUsername',
          label: 'Recipient Username',
          type: 'string',
          required: true,
          defaultValue: targetUsername,
        },
        {
          name: 'points',
          label: 'Points to Award',
          type: 'number',
          required: true,
        },
        {
          name: 'reason',
          label: 'Reason',
          type: 'paragraph',
          required: true,
        },
      ],
    };

    return c.json<UiResponse>(
      {
        showForm: {
          name: 'awardPointsForm',
          form,
        },
      },
      200
    );
  } catch (error) {
    console.error(`Error showing award form: ${error}`);
    return c.json<UiResponse>({ showToast: 'Failed to open award form' }, 400);
  }
});
