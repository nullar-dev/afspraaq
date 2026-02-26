# afspraaq - Production-Ready CI/CD Pipeline

> A production-ready CI/CD pipeline for Next.js projects with 2026 best practices.

---

## 🤖 For LLM Agents (Claude Code, Cursor, etc.)

Copy and paste this to your LLM agent:

```
I want to set up a production-ready CI/CD pipeline.
Follow the instructions here: https://raw.githubusercontent.com/nullar-dev/afspraaq/refs/heads/main/README.md

DO NOT ask me what to do. DO NOT make up steps. Just follow the guide above.
DO NOT edit any dependency versions. DO NOT make random changes.

I will answer YES/NO when you ask about optional features.
```

---

### Step 0: Ask Questions First

Before doing anything, ask these questions:

| #   | Question                               | Your Answer      |
| --- | -------------------------------------- | ---------------- |
| 1   | What's your GitHub username?           | (e.g., "john")   |
| 2   | What's your project name?              | (e.g., "my-app") |
| 3   | Do you already have a GitHub repo?     | YES (url) / NO   |
| 4   | If YES to #3, what do you want?        | (see below)      |
| 5   | Do you want Sentry for error tracking? | YES / NO         |
| 6   | Do you want AI PR Reviewer?            | YES / NO         |
| 7   | Do you want Coolify for hosting?       | YES / NO         |
| 8   | Do you have GitHub CLI (gh) installed? | YES / NO         |

**After you get all answers, THEN follow the step-by-step guide below.**

> ⚠️ **IMPORTANT**: Use the user's answers to customize URLs in the guide!
>
> - Replace `YOUR_USERNAME` with their GitHub username
> - Replace `YOUR_REPO` with their project name
>
> Example: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings` → `https://github.com/john/my-app/settings`
>
> **If user has NO existing repo (Answer NO to #3):**
>
> - Automatically fork using: `gh repo fork nullar-dev/afspraaq --clone --remote-name origin`
>
> **If user has existing repo (Answer YES to #3):**
>
> - Ask question #4 and offer these options:
>   1. **Merge CI/CD into existing project** - Copy CI/CD files into their existing repo
>   2. **Start fresh** - Their existing code becomes the new main, CI/CD files overwrite (careful!)
>   3. **Create new repo** - Keep existing code elsewhere, create fresh with CI/CD
>
> **If user answered YES to Sentry:** Show them the "Optional: Sentry" section below
> **If user answered YES to AI PR Reviewer:** Show them the "Optional: AI PR Reviewer" section below
> **If user answered YES to Coolify:** Show them the "Optional: Coolify" section below
> **If NO:** Skip those sections
>
> **If user answered NO to gh CLI:** Include the "Prerequisite: Set Up GitHub CLI" section below in your instructions
> **If YES:** Skip that section

---

### ⚠️ DO NOT Change Settings

**Unless the user explicitly asks, do NOT:**

- ❌ Change dependency versions
- ❌ Change Node.js or pnpm versions
- ❌ Change test configurations
- ❌ Disable any checks
- ❌ Modify workflow files

This pipeline works perfectly by default. Don't change anything unless the user explicitly requests it.

---

## ⚡ Prerequisite: Set Up GitHub CLI (gh)

> **Note:** Only include this section if user answered NO to "Do you have GitHub CLI (gh) installed?"

The LLM uses `gh` CLI to create Pull Requests automatically. Here's how to set it up:

### Step 1: Install GitHub CLI

**macOS:**

```bash
brew install gh
```

**Windows:**

```bash
winget install GitHub.cli
```

**Linux (Debian/Ubuntu):**

```bash
sudo apt update
sudo apt install gh
```

**Or download from:** https://github.com/cli/cli#installation

### Step 2: Authenticate with GitHub

```bash
gh auth login
```

**Follow the prompts:**

1. **GitHub account:** `Login with a web browser`
2. **Copy one-time code:** Copy the code shown (e.g., `1234-5678`)
3. **Press Enter:** This opens GitHub in your browser
4. **Paste code:** Enter the code to authenticate
5. **Choose HTTPS:** Select `HTTPS`
6. **Authenticate Git credential:** `Yes`
7. **Login successful!** ✅

### Step 3: Verify Authentication

```bash
gh auth status
```

You should see: `Logged in to github.com as YOUR_USERNAME`

### Step 4: Configure Git (if not done)

```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

**Done!** Now the LLM can create PRs automatically.

---

## What is This?

This is a **plug-and-play CI/CD pipeline** for Next.js projects that automatically:

- ✅ Lints your code (ESLint, Prettier, TypeScript)
- ✅ Runs security scans (npm audit, CodeQL, secret scanning)
- ✅ Runs tests (Unit, Component, API, E2E)
- ✅ Builds your app
- ✅ Enforces 80% code coverage
- ✅ Auto-updates dependencies (Dependabot)

### What Gets Checked

| Check      | Tools                                         |
| ---------- | --------------------------------------------- |
| Code Style | ESLint, Prettier                              |
| Types      | TypeScript                                    |
| Security   | npm audit, CodeQL, TruffleHog                 |
| Tests      | Vitest (Unit/Component/API), Playwright (E2E) |
| Build      | Next.js                                       |

---

## ⚡ Quick Start (Advanced Users)

```bash
# 1. Fork this repo or copy files to your project
# 2. Set GitHub Secrets (see below)
# 3. Enable branch protection
# 4. Push code
# 5. Watch CI run!
```

---

## 📖 Step-by-Step Guide

### Step 1: Clone and Set Up (LLM Does This Automatically!)

**Choose the right flow based on user's answers:**

#### Option A: User has NO existing repo (fork)

```bash
# One command: fork on GitHub + clone locally
gh repo fork nullar-dev/afspraaq --clone --remote-name origin
cd afspraaq

# OR rename folder to your project name:
# mv afspraaq YOUR_PROJECT_NAME
# cd YOUR_PROJECT_NAME

# Update config: package.json + ci-config.yml with project name

# Create branch, commit, PR
git checkout -b feat/add-ci-cd
git add .
git commit -m "feat: add CI/CD pipeline"
git push -u origin feat/add-ci-cd
gh pr create --title "feat: add CI/CD pipeline" --body "..."
```

#### Option B: User has existing repo → Merge CI/CD (recommended)

```bash
# 1. Clone their existing repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO

# 2. Add the CI/CD files from this repo
git remote add afspraaq https://github.com/nullar-dev/afspraaq.git
git fetch afspraaq
git checkout -b afspraaq-files afspraaq/main

# 3. Copy all CI/CD files to your repo
# (If files already exist, merge carefully - keep existing config and add missing parts)
cp -r afspraaq-files/.github ./
cp afspraaq-files/vitest.config.ts ./
cp afspraaq-files/vitest.setup.ts ./
cp afspraaq-files/playwright.config.ts ./
cp afspraaq-files/eslint.config.mjs ./
cp afspraaq-files/tsconfig.json ./
cp afspraaq-files/package.json ./
cp afspraaq-files/ci-config.yml ./
cp afspraaq-files/sentry.client.config.ts ./
cp afspraaq-files/sentry.server.config.ts ./
cp afspraaq-files/.prettierrc ./
cp afspraaq-files/.prettierignore ./
cp afspraaq-files/.gitignore ./
cp afspraaq-files/.env.example ./

# 4. Update configuration files with your project name
# - package.json: Change "name": "afspraaq" to your project name
# - ci-config.yml: Change name: 'afspraaq' to your project name

# 5. Commit and push
git add .
git commit -m "feat: add CI/CD pipeline"
git push origin main
```

#### Option C: User wants to START FRESH (⚠️ careful - overwrites existing!)

```bash
# 1. Clone their existing repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO

# 2. WARNING: This will overwrite existing code! Get confirmation first!

# 3. Add the CI/CD files from this repo
git remote add afspraaq https://github.com/nullar-dev/afspraaq.git
git fetch afspraaq
git checkout -b afspraaq-files afspraaq/main

# 4. Copy all CI/CD files (overwrite existing)
cp -r afspraaq-files/.github ./
cp afspraaq-files/vitest.config.ts ./
cp afspraaq-files/vitest.setup.ts ./
cp afspraaq-files/playwright.config.ts ./
cp afspraaq-files/eslint.config.mjs ./
cp afspraaq-files/tsconfig.json ./
cp afspraaq-files/package.json ./
cp afspraaq-files/ci-config.yml ./
cp afspraaq-files/sentry.client.config.ts ./
cp afspraaq-files/sentry.server.config.ts ./
cp afspraaq-files/.prettierrc ./
cp afspraaq-files/.prettierignore ./
cp afspraaq-files/.gitignore ./
cp afspraaq-files/.env.example ./

# 5. Update configuration files with your project name
# - package.json: Change "name": "afspraaq" to your project name
# - ci-config.yml: Change name: 'afspraaq' to your project name

# 6. Commit and push
git add .
git commit -m "feat: add CI/CD pipeline"
git push origin main
```

#### Option D: User wants NEW REPO (keep old code elsewhere)

```bash
# Same as Option A - fork fresh CI/CD repo
gh repo fork nullar-dev/afspraaq --clone --remote-name origin
cd afspraaq

# Update config: package.json + ci-config.yml with project name

# Create branch, commit, PR
git checkout -b feat/add-ci-cd
git add .
git commit -m "feat: add CI/CD pipeline"
git push -u origin feat/add-ci-cd
gh pr create --title "feat: add CI/CD pipeline" --body "..."
```

**OR simpler - just copy these files to an existing Next.js project:**
(Merge carefully if files already exist!)

```
.github/workflows/ci-cd.yml (merge carefully!)
.github/workflows/review.yml (merge carefully!)
.github/dependabot.yml (merge carefully!)
.github/codeql/codeql-config.yml (merge carefully!)
vitest.config.ts (merge carefully!)
vitest.setup.ts (merge carefully!)
playwright.config.ts (merge carefully!)
eslint.config.mjs (merge carefully!)
tsconfig.json (merge carefully!)
package.json (merge carefully!)
ci-config.yml (merge carefully!)
sentry.client.config.ts (merge carefully!)
sentry.server.config.ts (merge carefully!)
.env.example (merge carefully!)
.prettierrc (merge carefully!)
.prettierignore
.gitignore
```

---

### Step 2: Configure GitHub Secrets

Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions/new`

#### Required Secrets (for CI/CD to work)

| Secret Name | Value                     | Required? |
| ----------- | ------------------------- | --------- |
| (none)      | CI works without secrets! | ✅ No     |

#### Optional Secrets

| Secret Name              | How to Get                           | Required? |
| ------------------------ | ------------------------------------ | --------- |
| `NEXT_PUBLIC_SENTRY_DSN` | See "Optional: Sentry" below         | ❌ No     |
| `MY_BOT_TOKEN`           | See "Optional: AI PR Reviewer" below | ❌ No     |
| `MINIMAX_API_KEY`        | See "Optional: AI PR Reviewer" below | ❌ No     |
| `GLM_API_KEY`            | See "Optional: AI PR Reviewer" below | ❌ No     |

---

### Step 3: Enable Branch Protection ⭐ IMPORTANT

This prevents broken code from being merged!

1. Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/branches`
2. Click **"Add branch protection rule"**

3. **Branch name pattern:** Type: `main`

4. **Require a pull request before merging:** ✅ CHECK
   - Optionally check "Require reviews from code owners"

5. **Require approvals:** ✅ CHECK
   - Type `1` in the approvals required field

6. **Dismiss stale reviews:** ✅ CHECK (uncheck if you want reviews to stay)

7. **Require status checks to pass:** ✅ CHECK
   - Click **"Add status check"** or use the search box
   - Search for: `CI/CD Pipeline`
   - Select it
   - ✅ Also check **"Require branches to be up to date"** (optional but recommended)

8. Click **"Create protection rule"** (green button)

---

### Step 4: Set Up Local Development

```bash
# Install git if not already installed
if ! command -v git &> /dev/null; then
  # macOS
  if command -v brew &> /dev/null; then
    brew install git
  # Linux
  elif command -v apt &> /dev/null; then
    sudo apt update && sudo apt install git
  fi
fi

# Setup nvm (Node Version Manager)
export NVM_DIR="$HOME/.nvm"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
fi
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node.js 24 if not already using it
CURRENT_NODE=$(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1)
if [ "$CURRENT_NODE" != "24" ]; then
  nvm install 24
fi
nvm use 24

# Install pnpm if not already installed
if ! command -v pnpm &> /dev/null; then
  npm install -g pnpm
fi

# Install dependencies
pnpm install
```

---

### Step 5: Test Locally Before Pushing

```bash
pnpm run lint      # Check code style
pnpm run format:check  # Check formatting
pnpm run typecheck # Check types
pnpm run test      # Run tests
pnpm run test:coverage  # Run tests with coverage (enforces 80%)
pnpm run build     # Build app
```

**If errors occur, fix them CAREFULLY:**

- Run `pnpm run format` to auto-fix formatting issues
- Fix lint/type errors manually - only change what's necessary
- Don't change dependency versions or add new dependencies
- Don't modify test configurations unless tests are actually broken
- Re-run the checks until all pass

---

### Step 6: Create Branch → PR → Verify CI

```bash
# Create a new branch
git checkout -b feat/add-ci-cd

# Commit and push
git add .
git commit -m "feat: add CI/CD pipeline"

# Push branch
git push -u origin feat/add-ci-cd
```

**Create Pull Request (LLM does this automatically):**

```bash
# Using gh CLI (LLM runs this):
gh pr create --title "feat: add CI/CD pipeline" \
  --body "## Summary
- Add production-ready CI/CD pipeline
- Lint, security, tests, build
- Optional: Sentry, AI PR Reviewer

## Test plan
- [ ] Verify CI passes
- [ ] Merge this PR"

# Or manually via browser:
# 1. Go to: https://github.com/YOUR_USERNAME/YOUR_REPO/pulls
# 2. Click "Compare & pull request"
# 3. Click "Create pull request"
```

**Watch CI run on the PR:**

- Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/actions`
- You should see "CI/CD Pipeline" running

**Verify all checks pass, then merge!**

---

## 🔧 Optional: Sentry (Error Tracking)

Want to track production errors? Here's the complete step-by-step:

---

### Step 1: Create Sentry Account

1. Go to: **https://sentry.io**
2. Click **"Sign Up"**
3. Enter your email and create a password
4. Click **"Create Account"**

---

### Step 2: Create Your Project

1. After login, click **"Projects"** in the sidebar
2. Click **"Create Project"** (blue button)
3. Select **"Next.js"** from the list
4. **Project name:** enter your project name (e.g., `my-app`)
5. Click **"Create Project"**

---

### Step 3: Get Your DSN

1. In Sentry, go to your project page
2. Click **"Settings"** (gear icon ⚙️ in sidebar)
3. Click **"Client Keys (DSN)"** in the left menu
4. You'll see a URL like: `https://xxxx@sentry.io/12345`
5. **Copy this entire URL**

---

### Step 4: Add DSN to GitHub Secrets

1. Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions/new`

2. Fill in the form:
   - **Name:** `NEXT_PUBLIC_SENTRY_DSN`
   - **Value:** Paste your DSN URL (e.g., `https://xxxx@sentry.io/12345`)

3. Click **"Add secret"**

---

### Step 5: Update Local .env

```bash
# In your project folder
cp .env.example .env.local
```

Open `.env.local` in a text editor and paste your DSN:

```
NEXT_PUBLIC_SENTRY_DSN=https://xxxx@sentry.io/12345
```

**Done!** 🎉 Errors will now be tracked in Sentry.

---

## 🤖 Optional: AI PR Reviewer

Want AI to automatically review your PRs? Here's the complete step-by-step:

---

### Step 1: Create GitHub Personal Access Token

**What is this?** A password that lets the AI comment on your PRs.

1. Go to: **https://github.com/settings/tokens**
2. Click **"Generate new token (classic)"**
3. **Note field:** Type something like `CI/CD AI Reviewer`
4. **Expiration:** Select **"No expiration"**
5. **Select scopes:** Check the **"repo"** checkbox
6. Scroll down and click **"Generate token"**
7. **IMPORTANT:** Copy the token immediately! It looks like: `ghp_xxxxxxxxxxxxxxxxxxxx`

---

### Step 2: Get MiniMax API Key

**What is this?** The main AI brain for reviewing your code.

1. Go to: **https://platform.minimax.io**
2. Sign up or log in
3. Go to **Account Management → API Keys**
4. Create a new API key
5. Copy it (it looks like: `eyJhbGciOiJxxx...`)

---

### Step 3: Get GLM API Key (Zhipu AI)

**What is this?** A helper AI for additional code analysis.

1. Go to: **https://z.ai**
2. Sign up or log in
3. Go to **API Keys** in the sidebar
4. Create a new API key
5. Copy it

---

### Step 4: Add All Secrets to GitHub

Now add ALL THREE secrets:

**Go to:** `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions/new`

**Add Secret 1:**

- **Name:** `MY_BOT_TOKEN`
- **Value:** Paste your GitHub token from Step 1
- Click **"Add secret"**

**Add Secret 2:**

- **Name:** `MINIMAX_API_KEY`
- **Value:** Paste your MiniMax API key from Step 2
- Click **"Add secret"**

**Add Secret 3:**

- **Name:** `GLM_API_KEY`
- **Value:** Paste your GLM API key from Step 3
- Click **"Add secret"**

---

### Step 5: Done!

The AI PR Reviewer automatically runs on every PR! No additional setup needed.

**What it does:**

- Reviews your PRs automatically
- Comments on code issues
- Suggests improvements

---

### ⚠️ Important Notes

- **Keep your keys secret!** Never share them publicly
- **Keys are free** (with limits): MiniMax and GLM have free tiers
- **If keys expire**, the CI will fail - just regenerate and update

---

## ☁️ Optional: Coolify (Self-Hosted Hosting)

Want to deploy your app with Coolify? Here's the complete step-by-step:

---

### Which Scenario Applies to You?

**Scenario A: I already have Coolify**
→ Skip to Step 2 below

**Scenario B: I'm new to Coolify**
→ Start with Step 1 below

---

### Step 1: Install Coolify (If You Don't Have It Yet)

**Option A: Coolify Cloud (Managed - Easiest)**

- Go to: https://coolify.io
- Sign up for an account
- Create your first project
- Done! Skip to Step 2

**Option B: Self-Hosted (Free - Your Own Server)**

- Install on your own server/VPS
- Follow: https://coolify.io/docs
- After installation, create a project
- Skip to Step 2

---

### Step 2: Connect Your GitHub Repository

1. In Coolify, go to your project
2. Click **"Add New Resource"**
3. Select **"GitHub Repository"**
4. Choose: `YOUR_USERNAME/YOUR_REPO`
5. Click **"Connect"**

---

### Step 3: Configure Build Settings

Fill in these settings:

| Setting             | Value                             |
| ------------------- | --------------------------------- |
| **Build Pack**      | `Nixpacks` (auto-detects Next.js) |
| **Port**            | `3000`                            |
| **Install Command** | `pnpm install`                    |
| **Build Command**   | `pnpm run build`                  |
| **Start Command**   | `pnpm run start`                  |

---

### Step 4: Add Environment Variables

Add the same environment variables from your local `.env.local`:

**Required:**

- (none - CI/CD handles this)

**If Sentry enabled:**

- Add `NEXT_PUBLIC_SENTRY_DSN` from your Sentry setup

**Other variables:**

- Any from your `.env.example`

---

### Step 5: Deploy

1. Click **"Deploy"** button
2. Wait for build to complete
3. Your app is live! 🌐

**Auto-Deploy:** Coolify automatically deploys when you push to GitHub!

---

## ⚙️ Configuration (No Code Editing!)

Want to customize? Just set GitHub Variables!

Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/variables/new`

### 🔧 Pre-Commit Hook (Recommended!)

This project includes a **pre-commit hook** that automatically runs checks before every commit:

```bash
# Enable the hook (run once)
git config core.hooksPath .githooks
```

**What it does (2026 best practice):**

1. **Format check** (fastest) → auto-fixes if needed
2. **ESLint** → auto-fixes if needed
3. **TypeScript** check
4. **Tests**
5. **Only stages** after ALL checks pass

**Why use it?**

- Catches issues **before** they reach CI
- Saves time waiting for CI
- Keeps your commits clean
- Auto-fixes what it can, warns for manual fixes

The hook will run automatically when you commit!

### Common Configurations

| Variable             | Default                    | Description         |
| -------------------- | -------------------------- | ------------------- |
| `NODE_VERSION`       | `24`                       | Node.js version     |
| `COVERAGE_THRESHOLD` | `80`                       | Min coverage %      |
| `TEST_UNIT_DIR`      | `src/__tests__/unit`       | Unit test path      |
| `TEST_COMPONENT_DIR` | `src/__tests__/components` | Component test path |
| `TEST_API_DIR`       | `src/__tests__/api`        | API test path       |
| `TEST_E2E_DIR`       | `src/__tests__/e2e`        | E2E test path       |
| `AUDIT_LEVEL`        | `moderate`                 | npm audit level     |
| `E2E_BASE_URL`       | `http://localhost:3000`    | E2E test URL        |

---

## 📁 File Structure

```
your-project/
├── .github/
│   ├── workflows/
│   │   ├── ci-cd.yml      # Main CI pipeline (lint → security → tests → build)
│   │   └── review.yml      # AI PR Reviewer
│   ├── dependabot.yml      # Auto-updates
│   └── codeql/             # Security config
├── src/
│   └── __tests__/
│       ├── unit/           # Unit tests (Vitest)
│       ├── components/     # Component tests (Vitest + RTL)
│       ├── api/           # API tests (Vitest)
│       └── e2e/           # E2E tests (Playwright)
├── vitest.config.ts
├── vitest.setup.ts
├── playwright.config.ts
├── eslint.config.mjs
├── tsconfig.json
├── ci-config.yml
├── sentry.client.config.ts
├── sentry.server.config.ts
├── .env.example
└── package.json
```

---

## 🆘 Troubleshooting

### "ESLint failed"

```bash
# Auto-fix
pnpm run format

# Check errors
pnpm run lint
```

### "TypeScript failed"

- Read the error message
- Fix missing types or wrong types

### "Tests failed"

```bash
# Run tests locally
pnpm run test

# Fix failing tests or code
```

### "Build failed"

```bash
# Test build locally
pnpm run build
```

### "Permission denied" in CI

- Check file permissions
- Push again (usually a caching issue)

### CI not running?

- Check branch protection is set up
- Verify workflow file is in `.github/workflows/`
- Check GitHub Actions is enabled

---

## Need Help?

| Problem                | Solution                                         |
| ---------------------- | ------------------------------------------------ |
| CI failing             | Go to Actions tab → Click failed job → Read logs |
| Tests failing          | Run `pnpm run test` locally                      |
| Build failing          | Run `pnpm run build` locally                     |
| Don't understand error | Google the error message                         |
| Something else         | Check GitHub Actions docs                        |

---

## 🎯 Fork This Project!

Want to use this for your own project?

1. Fork: https://github.com/nullar-dev/afspraaq
2. Rename to your project
3. Configure secrets (optional)
4. Push code
5. Watch CI run!

---

## ✅ Verify the Setup

After completing all steps, verify:

- [ ] Branch protection enabled on main
- [ ] CI runs on pull requests
- [ ] All checks pass (or user knows how to fix)
- [ ] Sentry configured (if YES)
- [ ] AI PR Reviewer configured (if YES)

Read this guide again and confirm everything was done correctly.

---

## 🎉 Congratulations!

Congratulations! 🎉 You have successfully set up your CI/CD pipeline!

**What's next?**

- Push code and watch CI run
- Set up Sentry for error tracking (optional)
- Add AI PR Reviewer for automated PR reviews (optional)
- Customize with GitHub Variables if needed

**Tips:**

- Run `pnpm run format` before pushing to avoid CI failures
- Check GitHub Actions logs if something fails
- This pipeline enforces 80% test coverage - write tests!

---

## Credits

Built with ❤️ using 2026 best practices:

- Parallel job execution
- Comprehensive caching
- Supply chain security
- Multi-layer security scanning
- Enforced quality standards

---

_Last updated: 2026-02-26_
