# 🧹 HeyChores — Roommate Household Duty Rotation System

A simple, modern, mobile-first website application for roommates living together in a flat or house.

HeyChores solves household chore assignment with one non-negotiable rule: **The turn advances only when the task is completed.** Overdue tasks never silently transfer to someone else — the responsible roommate stays responsible until it is marked done.

---

## ✨ Key Features

- **Strict Completion-Driven Rotation**: Ahmed → Rahul → Sameer → Usman. Only advances when the current person clicks **[✓ MARK COMPLETED]**.
- **Prominent "YOUR TURN" Hero Card**: Zero ambiguity. Open the website and immediately see what you need to do, when it is due, and complete or exchange it in seconds.
- **Away / Vacation Support**: Mark yourself away (e.g. Sep 15 to Sep 20). The system automatically skips you while away without permanently removing your slot in the rotation.
- **Temporary Turn Exchange**: Need a swap? Pass your current turn to a flatmate with an optional note. The permanent rotation order remains intact.
- **Custom Frequencies**: Every 3 days, weekly, every 2 weeks, monthly, or any custom interval.
- **Per-Task Custom Rotations**: Each chore can have its own independent member order (drag / reorder with ease).
- **Intelligent Reminders**: Due notification → 12 hours later → 24 hours later → daily until completed. Once completed: **all reminders stop**.
- **Web Push & In-App Fallback**: Free standard Web Push notifications, plus prominent in-app notification center and iPhone/Safari PWA installation guidance.
- **No Always-On Device Required**: 100% serverless, zero Raspberry Pis, no credit cards required, deployable entirely on free tiers.

---

## 🛠 Technology Stack

- **Frontend**: [Next.js](https://nextjs.org/) (App Router) + TypeScript + React 19
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (mobile-first, dark mode, high touch targets)
- **Database & Auth**: [Supabase](https://supabase.com/) PostgreSQL + Supabase Auth with Row-Level Security (RLS)
- **Rotation Engine**: Pure, deterministic, transactional server module with automated test coverage
- **Hosting**: [Vercel](https://vercel.com/) (Free Hobby Tier)

---

## 🚀 Quick Start (Local Development)

### 1. Clone & Install
```bash
git clone https://github.com/your-username/heychores.git
cd heychores
npm install
```

### 2. Run Tests
HeyChores includes automated unit tests covering all rotation rules (basic rotation, away skip, multiple away, turn exchange, return, member removal, recurrence math, reminder schedule):
```bash
npm test
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

> **💡 Zero-Config Sandbox Mode**: Even before configuring Supabase, HeyChores will boot into an interactive preview mode preloaded with "Green House" (Ahmed, Rahul, Sameer, Usman) so you can test all UI flows, turn exchanges, away toggles, and completions immediately!

---

## 🗄️ Database Setup (Supabase Free Tier)

1. **Create Free Account & Project**:
   - Go to [supabase.com](https://supabase.com/) and create a free project.
   - Note down your project reference, database password, and region.

2. **Run Database Migration**:
   - In your Supabase dashboard, go to the **SQL Editor**.
   - Copy the entire contents of [`supabase/migrations/20261002_init.sql`](file:///Users/salman/Desktop/HeyChores/supabase/migrations/20261002_init.sql).
   - Click **Run**. This will create:
     - `profiles`, `groups`, `group_members`, `tasks`, `task_rotation`, `task_state`, `away_periods`, `task_completions`, `turn_exchanges`, `notification_subscriptions`, `in_app_notifications`.
     - Automatic user profile creation trigger.
     - Row-Level Security (RLS) policies protecting data access per flat.

3. **Configure Authentication**:
   - In Supabase Dashboard, navigate to **Authentication** → **Providers**.
   - Enable **Email / Password**.
   - (Optional) Enable **Google Provider** with your Google Cloud client credentials.
   - Under **URL Configuration**, add your production URL (e.g. `https://<your-app>.vercel.app/**`) and `http://localhost:3000/**`.

4. **Copy API Keys**:
   - Go to **Project Settings** → **API**.
   - Copy `Project URL` and `anon public` key.

---

## 🌐 Deploy to Vercel (Free Tier)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "feat: complete roommate task rotation system"
   git branch -M main
   git remote add origin https://github.com/<your-username>/heychores.git
   git push -u origin main
   ```

2. **Import to Vercel**:
   - Go to [vercel.com](https://vercel.com/) and click **Add New Project**.
   - Import your `heychores` GitHub repository.

3. **Configure Environment Variables**:
   In the Vercel project configuration, add:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
   NEXT_PUBLIC_SITE_URL=https://<your-project>.vercel.app
   CRON_SECRET=<any-random-secure-string>
   ```

4. **Deploy**:
   - Click **Deploy**. Your application will be live at `https://<your-project>.vercel.app`.

---

## ⏰ Notification & Reminder Scheduler (Serverless)

HeyChores does not require any 24/7 computer running in the flat. Reminders are processed by the serverless endpoint `/api/cron/reminders`.

### Free Scheduler Options:
- **Vercel Cron (Included in `vercel.json`)**: Runs automatically once per day on Hobby.
- **GitHub Actions (Free)**: A simple scheduled workflow triggering `/api/cron/reminders` every few hours.
- **Free Webhook Schedulers**: [cron-job.org](https://cron-job.org/) or [Upstash QStash](https://upstash.com/) (100% free, no credit card) pinging `https://<your-project>.vercel.app/api/cron/reminders` with header `Authorization: Bearer <CRON_SECRET>`.

---

## 📱 Progressive Web App (PWA) on iPhone & Android

1. Open your HeyChores website in Safari (iOS) or Chrome (Android).
2. Tap **Share** (iOS) or the three-dot menu (Android).
3. Tap **"Add to Home Screen"**.
4. The app opens full-screen like a native app, with offline caching and instant load times.

---

## 📄 License
MIT. Built with care for clean, harmonious shared living.
