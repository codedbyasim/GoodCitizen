# GoodCitizen: Reddit Hackathon Project Report

## 1. Project Overview & Inspiration
GoodCitizen is a comprehensive reputation governance and positive reinforcement moderation utility built for Reddit’s Developer Platform (Devvit). Instead of traditional karma systems, GoodCitizen introduces a holistic model of community contribution, combining **Reputation Points**, a **Trust Score**, **Automated Mod Queue Priority Signals**, **Community Health Reports**, and **Anti-Farming safeguards**.

The app is fully customizable with presets tailored to specific niches:
*   **r/learnprogramming** (Mentor points / Apprentice & Master Mentor flairs)
*   **r/personalfinance** (Trusted advice points / Advisor & Guru flairs)
*   **r/loseit** (Encourager points / Wellness Champion & Beacon of Hope flairs)

---

## 2. Core Moderation Innovations

### A. Trust Score (0-100)
Every user is assigned a dynamic Trust Score. Negative actions (warnings, removals, rules violations) deduct points from the Trust Score. Positive activities (helpful awards, contributions recognized by other members) rebuild the Trust Score. 

### B. Mod Queue Priority Signal
Moderators spend substantial time reviewing content in the Mod Queue. GoodCitizen flags queued content from trusted, long-standing contributors with priority signals such as:
> `High-trust user, 0 removals in 60 days, 12 helpful awards`
This enables moderators to fast-track approvals and focus attention on newer or low-trust users.

### C. Community Health Report
A weekly analytical report consolidating subreddit growth, helpfulness milestones, reduction in repeat infractions, and flair elevations.

### D. Anti-Farming System
Restricts bad actors by implementing strict daily point limits per user and restricting daily reward counts from a specific mod to the same user (preventing collusion).

---

## 3. Technology Stack & Architecture
*   **Platform:** Reddit Devvit SDK (V0.12.24)
*   **Backend Hono Router:** Direct integration for custom endpoints.
*   **Database:** Redis (Sandboxed storage per subreddit installation).
*   **Frontend:** React / Vite WebView, styled with responsive CSS (supporting Sunset, Cyber, and Emerald themes) with custom SVG icons.
