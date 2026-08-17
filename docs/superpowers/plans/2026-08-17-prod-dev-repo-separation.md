# Multi-Branch & Production-Development Environment Separation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a secure, isolated dual-directory environment separating Development (`/home/ubuntu/project/threads-marketing` on branch `dev`) and Production (`/home/ubuntu/production/threads-marketing` on branch `main`) connected to the GitHub repository `git@github.com:HanifMukkorrobin/threads-marketing.git`.

**Architecture:** 
- Remote repository `git@github.com:HanifMukkorrobin/threads-marketing.git` serves as single source of truth.
- Production directory `/home/ubuntu/production/threads-marketing` tracks `main` branch, owns live `prisma/prod.db`, and is served by PM2 on port 4000 behind Nginx & Cloudflare domain `threads.hadestech.web.id`.
- Development directory `/home/ubuntu/project/threads-marketing` tracks `dev` branch with `prisma/dev.db` and port 3000 for rapid, risk-free iteration.
- Hermes Gateway schedulers point to the production directory.

**Tech Stack:** Git, GitHub SSH, Next.js 14 App Router, Prisma ORM (SQLite), PM2 cluster, Nginx, Python 3 / Hermes Scheduler.

---

### Task 1: Git Repository Initial Commit & Multi-Branch Setup (`main` & `dev`)

**Files:**
- Modify: `.gitignore` (ensure `*.db`, `*.db-journal`, `.env*` are properly ignored while `.env.example` is kept)
- Path: `/home/ubuntu/project/threads-marketing`

- [ ] **Step 1: Check and update .gitignore**
  Ensure SQLite database files and sensitive credentials are not committed to git.
- [ ] **Step 2: Commit all current code to main branch**
  Run:
  ```bash
  git branch -M main
  git add .
  git commit -m "feat: initial release with Hermes AI copilot, dynamic generator, and Threads integration"
  ```
- [ ] **Step 3: Add GitHub remote and push main branch**
  Run:
  ```bash
  git remote add origin git@github.com:HanifMukkorrobin/threads-marketing.git
  git push -u origin main
  ```
- [ ] **Step 4: Create and push dev branch**
  Run:
  ```bash
  git checkout -b dev
  git push -u origin dev
  ```

---

### Task 2: Provision Production Directory (`/home/ubuntu/production/threads-marketing`)

**Files:**
- Target Directory: `/home/ubuntu/production/threads-marketing`
- Database: `/home/ubuntu/production/threads-marketing/prisma/prod.db`
- Env: `/home/ubuntu/production/threads-marketing/.env.production` & `.env`

- [ ] **Step 1: Create production directory and clone main branch**
  Run:
  ```bash
  mkdir -p /home/ubuntu/production
  git clone -b main git@github.com:HanifMukkorrobin/threads-marketing.git /home/ubuntu/production/threads-marketing
  ```
- [ ] **Step 2: Install dependencies in production directory**
  Run:
  ```bash
  cd /home/ubuntu/production/threads-marketing
  npm ci || npm install
  ```
- [ ] **Step 3: Migrate live database & environment files**
  Copy live `prod.db` and `.env.production` from project directory into `/home/ubuntu/production/threads-marketing`:
  ```bash
  cp /home/ubuntu/project/threads-marketing/.env.production /home/ubuntu/production/threads-marketing/.env
  cp /home/ubuntu/project/threads-marketing/.env.production /home/ubuntu/production/threads-marketing/.env.production
  cp /home/ubuntu/project/threads-marketing/prisma/prod.db /home/ubuntu/production/threads-marketing/prisma/prod.db
  ```
- [ ] **Step 4: Generate Prisma Client & build Next.js production bundle**
  Run:
  ```bash
  cd /home/ubuntu/production/threads-marketing
  npx prisma generate
  npm run build
  ```

---

### Task 3: Reconfigure PM2 and Hermes Scheduler to Target Production Directory

**Files:**
- PM2 Service: `threads-marketing`
- Helper Scripts: `~/.hermes/scripts/threads_marketing_post.py` and `~/.hermes/scripts/threads_marketing_generate.py`

- [ ] **Step 1: Reconfigure and restart PM2 process from production directory**
  Run:
  ```bash
  pm2 delete threads-marketing || true
  cd /home/ubuntu/production/threads-marketing
  pm2 start npm --name "threads-marketing" -- run start -- -p 4000
  pm2 save
  ```
- [ ] **Step 2: Update Hermes scheduler scripts**
  Update `~/.hermes/scripts/threads_marketing_post.py` and `~/.hermes/scripts/threads_marketing_generate.py` so `PROJECT_DIR = "/home/ubuntu/production/threads-marketing"`.
- [ ] **Step 3: Ensure development directory is cleanly configured**
  In `/home/ubuntu/project/threads-marketing`, ensure `git status` is on branch `dev` with `.env.development` / `dev.db`.

---

### Task 4: End-to-End Verification

- [ ] **Step 1: Verify PM2 process is running from production directory on port 4000**
- [ ] **Step 2: Verify domain https://threads.hadestech.web.id responds HTTP/2 200/307**
- [ ] **Step 3: Verify Hermes cron scripts execute against production directory**
- [ ] **Step 4: Verify development directory is on branch `dev` and ready for isolated feature work**
