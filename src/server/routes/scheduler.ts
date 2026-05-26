import { Hono } from 'hono';

// Note: Devvit web uses TaskRequest/TaskResponse for scheduler handlers
// The exact type may vary by SDK version; using inline types for safety
type TaskRequest = Record<string, unknown>;
type TaskResponse = { status: 'ok' | 'error'; message?: string };

export const scheduler = new Hono();

// Daily leaderboard refresh — triggered by Devvit scheduler (0 0 * * *)
scheduler.post('/daily-refresh', async (c) => {
  try {
    await c.req.json<TaskRequest>().catch(() => ({}));
    console.log(`[GoodCitizen Scheduler] Daily leaderboard refresh at ${new Date().toISOString()}`);
    // Future: Update the leaderboard post body with fresh rankings via Reddit API
    // For now, the leaderboard data is always live (pulled from Redis on page load)
    return c.json<TaskResponse>({ status: 'ok', message: 'Daily leaderboard refresh complete' }, 200);
  } catch (error) {
    console.error('[GoodCitizen Scheduler] Daily refresh error:', error);
    return c.json<TaskResponse>({ status: 'error', message: 'Refresh failed' }, 400);
  }
});
