# GoodCitizen: Setup & Installation Guide

## 1. Prerequisites
To deploy or run GoodCitizen locally, make sure you have:
*   **Node.js** (Version >= 22.2.0)
*   **Devvit CLI** installed and authenticated:
    ```bash
    npm install -g @devvit/cli
    devvit login
    ```
*   A test subreddit where you have full moderator privileges.

---

## 2. Local Development (Playtest)
To run a local playtest server which builds and syncs your local modifications immediately:
1.  Navigate to the project root:
    ```bash
    cd good-citizen-app
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Launch playtest:
    ```bash
    npm run dev
    ```
4.  Copy the generated Playtest URL from the console and open it in your browser or Reddit App. The URL looks like:
    `https://www.reddit.com/r/[YOUR_SUBREDDIT]/?playtest=good-citizen-app`

---

## 3. Subreddit Installation (App Directory)
Once published, the app can be installed from Reddit's App Directory:
1.  Go to your subreddit's **Mod Tools** dashboard.
2.  Select **Apps** (Community Apps).
3.  Locate **GoodCitizen** and click **Install**.
4.  Once installed, the app automatically creates a stickied **GoodCitizen Leaderboard Post** in your subreddit.

---

## 4. Configuring Subreddit Presets
Subreddit moderators can tailor the points labels and milestone flairs:
1.  Open the **Leaderboard Post** on Reddit.
2.  Click the **Mod Tools** tab inside the dashboard widget.
3.  Navigate to the **Config** section.
4.  Choose your preset under **Subreddit Preset Selection**:
    *   *r/learnprogramming*: Transforms point labels to "Mentor points" and aligns flairs to code mentorship.
    *   *r/personalfinance*: Adjusts point labels to "Trusted advice points" and sets up advisor flairs.
    *   *r/loseit*: Modifies labels to "Encourager points" and sets motivators badges.
5.  Click **Save Configurations**. The changes will apply instantly across all posts, user stats, and flairs.

---

## 5. Simulating Mod Queue Priority
To demo or verify how priority badges assist moderators:
1.  Go to the **Mod Tools** tab in the widget.
2.  Click the **Mod Queue** section.
3.  You will see mock queued posts with different user profiles (High-Trust, Standard, and Low-Trust).
4.  Apply moderation actions (Warn, Remove, Violate) and watch their impact on the user's Trust Score in real time.
