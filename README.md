# GoodCitizen — Reddit Reputation & Positive Behavior App

GoodCitizen is a gamified community rewards & positive behavior tracking system built on **Reddit's Developer Platform (Devvit)**. It incentivizes helpful engagement, welcomes new members, and rewards active contributors with visual badges, custom user flairs, and automated appreciation.

---

## 🌟 Features

### 1. 🏆 Interactive Leaderboard
- **All-Time & Weekly Views**: Toggle between all-time top contributors and the current week's leaderboard.
- **Medal Placement**: Ranks 1, 2, and 3 are automatically highlighted with gold 🥇, silver 🥈, and bronze 🥉 medals and matching card glow effects.
- **User Stat Deep-dives**: Tap any user on the leaderboard to immediately drill down into their individual profile card, stats, progress, and point timeline.

### 2. ⚡ Multi-Theme Visual Design
Select between three premium themes directly in the app header (settings persist in `localStorage`):
- 🌅 **Reddit Sunset** (Default): Coral-orange gradients on dark obsidian cards.
- 🌌 **Cyber Neon**: Purple-to-cyan glow effects on deep indigo cards.
- 🌲 **Emerald Forest**: Fresh mint gradients on dark charcoal surfaces.

### 3. 🎯 Points Engine & Triggers
- **Welcome Bonus (Auto)**: First post in the community automatically awards the user **+5 points**.
- **Gratitude Trigger (Auto)**: Background scanner parses new comments. Recognizing helpfulness keywords (e.g., *"thank you"*, *"thanks"*, *"helpful"*, *"saved me"*, *"worked for me"*, *"solved it"*) automatically rewards the parent author **+15 points** for their helpful contribution.
- **Moderator Awards (Manual)**: Mods can click the context menu (three dots) on any post or comment to manually award points (+10, +15, +30, etc.) with a required reason.

### 4. 🌱 Milestone Badges & Flairs
As users earn points, they automatically unlock ranks:
- **50 points** ➜ 🌱 **New Member** (Unlocks user flair + congratulatory DM)
- **150 points** ➜ ⭐ **Regular** (Unlocks user flair + congratulatory DM)
- **300 points** ➜ 💎 **Contributor** (Unlocks user flair + congratulatory DM)
- **500 points** ➜ 🔥 **Veteran** (Unlocks user flair + congratulatory DM)
- **1000 points** ➜ 🌟 **Community Star** (Triggers a system congratulatory DM and **automatically posts and pins a congratulatory appreciation thread** in the subreddit!)

### ⚙️ 5. Mod Tools Dashboard (Mods Only)
- **Stats Card**: Mod-only metrics showing total points awarded, badges earned, and top contributor of the week.
- **Config Editor**: Customization of points values (welcome bonus, helpful comment, approved post) and milestone tiers (required points, flair text, and DM message template).
- **Audit Trail**: Capped list of the last 50 moderator actions ensuring full transparency.
- **Revoke Panel**: Panel to revoke points from users for spam or rule violations.

---

## 🛡️ Anti-Abuse Safeguards
- **Daily Cap**: Standard limit of 100 points maximum earned by a user per day.
- **Mod Limitation**: Prevents moderators from awarding the same user more than 3 times a day.
- **Required Reason**: Every manual award/revoke action requires a logged explanation.

---

## 🛠️ Tech Stack & Architecture
- **Framework**: Devvit SDK (Custom WebView Posts, Triggers, Scheduler, Context Menus, and Forms).
- **Frontend**: React, TypeScript, Vite, custom styled CSS (supporting multi-theme variables).
- **Backend**: Hono Router running inside the Devvit sandboxed server runtime.
- **Storage**: Devvit Redis (supporting Sorted Sets for leaderboards and string-serialized JSON lists for audit logs & history feeds).

---

## 🚀 Getting Started

### Prerequisites
- Node.js (version 22 or higher)
- Devvit CLI installed (`npm install -g devvit`)

### Setup & Playtest
1. **Clone the repository** and install dependencies:
   ```bash
   npm install
   ```
2. **Log in** to your Devvit account:
   ```bash
   npm run login
   ```
3. **Configure your test subreddit** in [devvit.json](file:///h:/Reddit%20Hackthon/good-citizen-app/devvit.json#L59):
   ```json
     "dev": {
       "subreddit": "your_test_subreddit_name"
     }
   ```
4. **Start the playtest** server:
   ```bash
   npm run dev
   ```
5. Open the playtest URL generated in the terminal to view your live leaderboard post!

### Build & Deploy
- **Check TypeScript & Build**:
  ```bash
  npm run type-check
  npm run build
  ```
- **Upload / Deploy to Directory**:
  ```bash
  npm run deploy
  ```
- **Publish for Review**:
  ```bash
  npm run launch
  ```
