# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 16 application with a production-ready CI/CD pipeline. It uses pnpm as the package manager and includes comprehensive testing (Vitest + Playwright).

## Common Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm dev          # Start dev server
pnpm build        # Build for production
pnpm start        # Start production server

# Code quality
pnpm lint              # Run ESLint
pnpm format            # Auto-fix formatting
pnpm format:check      # Check formatting
pnpm typecheck         # TypeScript check

# Testing
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # Run with coverage (80% threshold enforced)
pnpm test:unit         # Unit tests
pnpm test:component    # Component tests
pnpm test:api          # API tests
pnpm test:e2e          # E2E tests (Playwright)

# Run single test file
pnpm vitest run src/__tests__/unit/example.test.ts
```

## Architecture

- **Framework**: Next.js 16 with App Router
- **Testing**: Vitest (unit/component/API) + Playwright (E2E)
- **CI/CD**: GitHub Actions with pre-commit hooks
- **Error Tracking**: Sentry (optional)
- **Pre-commit hook**: Runs format → lint → typecheck → tests before each commit

## Test Structure

```
src/__tests__/
├── unit/         # Vitest unit tests
├── components/  # Vitest component tests (React Testing Library)
├── api/          # Vitest API tests
└── e2e/          # Playwright E2E tests
```

## Important Notes

- The pre-commit hook is enabled via `git config core.hooksPath .githooks`
- Coverage threshold is 80% - tests will fail if not met
- E2E tests require the dev server to be running on localhost:3000
