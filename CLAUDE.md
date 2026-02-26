# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next.js 16 production app with CI/CD pipeline. Uses pnpm, Vitest, and Playwright.

## Pre-commit Hook

The project has a pre-commit hook (enabled via `git config core.hooksPath .githooks`) that runs automatically before each commit:

1. **Format check** - Auto-fixes with Prettier if needed
2. **ESLint** - Auto-fixes if possible, otherwise fails
3. **TypeScript** - Fails if type errors
4. **Tests** - Fails if any test fails

To skip the hook for a single commit: `git commit --no-verify -m "message"`

## Common Commands

```bash
# Setup
pnpm install

# Build & Run
pnpm build        # Build for production
pnpm start        # Start production server (port 3000)

# Code quality
pnpm lint              # Run ESLint
pnpm format            # Auto-fix formatting with Prettier
pnpm format:check      # Check formatting only
pnpm typecheck         # TypeScript check

# Testing
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # Run with coverage (80% threshold enforced)
pnpm test:unit         # Unit tests
pnpm test:component    # Component tests
pnpm test:api          # API tests
pnpm test:e2e          # E2E tests (requires server running)

# Run specific test
npx vitest run src/__tests__/unit/example.test.ts
```

## Test Structure

```
src/__tests__/
├── unit/         # Vitest unit tests
├── components/  # Vitest component tests (React Testing Library)
├── api/         # Vitest API tests
└── e2e/         # Playwright E2E tests
```

## CI/CD

GitHub Actions runs on every PR and push to main:

- Lint (ESLint, Prettier, TypeScript)
- Security (npm audit, CodeQL)
- Tests (Unit, Component, API, Coverage, E2E)
- Build

## Important Notes

- Coverage threshold: 80% - tests will fail if not met
- E2E tests require server running on localhost:3000
