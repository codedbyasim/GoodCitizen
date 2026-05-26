# GoodCitizen: Tech Stack & Architecture

## 1. Project Directory Structure

```text
good-citizen-app/
├── docs/                      # Subreddit Documentation folder
│   ├── report.md              # Detailed hackathon project overview
│   ├── architecture.md        # Code structure and database details
│   └── installation.md        # Setup and developer execution guide
├── src/
│   ├── client/                # React / Vite Frontend (WebView UI)
│   │   ├── hooks/             # Frontend API integration hooks
│   │   ├── game.tsx           # Main dashboard UI with stats & simulator
│   │   ├── splash.tsx         # Splash screen loader
│   │   └── index.css          # Design system CSS styles & custom themes
│   ├── server/                # Hono Backend (Devvit hosting)
│   │   ├── core/              # DB methods, anti-abuse, and flairs
│   │   │   ├── antiAbuse.ts   # Checks daily caps and locks
│   │   │   ├── milestones.ts  # Handles user progression and flairs
│   │   │   ├── redis.ts       # Main Redis queries & transactions
│   │   │   └── post.ts        # Launcher post setup
│   │   ├── routes/            # Server routers
│   │   │   ├── api.ts         # WebView routes for leaderboards/mod actions
│   │   │   ├── triggers.ts    # Sentiment trigger on posts/comments
│   │   │   ├── menu.ts        # Mod context-menu forms
│   │   │   ├── forms.ts       # Interactive form processor
│   │   │   └── scheduler.ts   # Background analytics cleanups
│   │   └── index.ts           # Devvit entrypoint
│   └── shared/
│       └── api.ts             # API interfaces & shared TS contracts
```

---

## 2. Data Flow & Communication

1.  **Event Triggers:** When a user creates a post or comments "thank you," `triggers.ts` fires. It uses `redis.ts` and `antiAbuse.ts` to award points and checks `milestones.ts` to update flairs if a threshold is crossed.
2.  **Context Menu Actions:** When a moderator clicks "Award Points," the Devvit context menu `menu.ts` displays a Devvit form, which submits to `forms.ts` and runs safety checks before updating Redis.
3.  **Dashboard Interactions:** When the launcher post loads, it displays the WebView (`game.tsx`). The client triggers fetch queries to `server/routes/api.ts` (e.g., retrieving rankings, audit trails, configurations).

---

## 3. Database Schema (Redis Keys)

GoodCitizen stores information securely inside Reddit's sandboxed Redis namespace:

*   `gc:config` : Holds active JSON configuration (milestone limits, point labels, etc.).
*   `gc:leaderboard` : Sorted set containing total user points for rankings.
*   `gc:user:[username]:points` : Integer counter for a user's total points.
*   `gc:user:[username]:badge` : String representing user's current badge level.
*   `gc:user:[username]:trust_score` : Integer representing user's Trust Score (0-100).
*   `gc:user:[username]:history` : Capped list of `PointEvent` transactions.
*   `gc:user:[username]:removals` : List of timestamps indicating recent post/comment removals.
*   `gc:daily:[username]:[YYYY-MM-DD]` : Tracks daily points earned to enforce caps.
*   `gc:audit` : Global audit list containing last 200 moderator actions.
