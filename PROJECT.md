# CI/CD Pipeline Template

A production-ready CI/CD pipeline for Next.js projects with 2026 best practices.

## Quick Start

```bash
# Clone and set up
git clone https://github.com/nullar-dev/afspraaq.git
cd afspraaq
pnpm install

# Test locally
pnpm run lint
pnpm run format:check
pnpm run typecheck
pnpm run test
pnpm run build
```

## Available Commands

| Command                   | Description             |
| ------------------------- | ----------------------- |
| `pnpm run lint`           | Run ESLint              |
| `pnpm run format`         | Auto-fix formatting     |
| `pnpm run format:check`   | Check formatting        |
| `pnpm run typecheck`      | TypeScript check        |
| `pnpm run test`           | Run all tests           |
| `pnpm run test:coverage`  | Run tests with coverage |
| `pnpm run test:unit`      | Unit tests              |
| `pnpm run test:component` | Component tests         |
| `pnpm run test:api`       | API tests               |
| `pnpm run test:e2e`       | E2E tests (Playwright)  |
| `pnpm run build`          | Build Next.js app       |

## Project Structure

```
src/
├── __tests__/
│   ├── unit/      # Vitest unit tests
│   ├── components/ # Vitest component tests
│   ├── api/       # Vitest API tests
│   └── e2e/       # Playwright E2E tests
└── app/           # Next.js app
```

## Configuration

### CI/CD Settings

- **ci-config.yml** - Main CI/CD configuration (Node version, pnpm version, test paths, etc.)
- **GitHub Variables** - Override defaults in repo Settings > Variables

### Test Configuration

- **vitest.config.ts** - Vitest configuration
- **playwright.config.ts** - Playwright configuration

### Code Quality

- **eslint.config.mjs** - ESLint configuration
- **.prettierrc** - Prettier configuration
- **tsconfig.json** - TypeScript configuration

## Updating Dependencies

### Node.js Version

Update in:

- `ci-config.yml` → `node_version`
- `.github/workflows/ci-cd.yml` → `NODE_VERSION`

### pnpm Version

Update in:

- `ci-config.yml` → `pnpm_version`
- `.github/workflows/ci-cd.yml` → `PNPM_VERSION`

### Other Dependencies

Edit `package.json` and run `pnpm install`

## Adding New Tests

### Unit/Component/API Tests

Add to `src/__tests__/unit/`, `components/`, or `api/` - Vitest will auto-discover

### E2E Tests

Add to `src/__tests__/e2e/` - Playwright will run these

## GitHub Actions Workflow

The CI runs on:

- Pull requests to `main` or `develop`
- Push to `main`

Jobs:

1. **Lint** - ESLint, Prettier, TypeScript
2. **Security** - npm audit, CodeQL, TruffleHog
3. **Unit Tests** - Vitest
4. **Component Tests** - Vitest
5. **API Tests** - Vitest
6. **E2E Tests** - Playwright
7. **Build** - Next.js build

## Troubleshooting

### Tests fail locally

Run full check:

```bash
pnpm run lint && pnpm run format && pnpm run typecheck && pnpm run test
```

### CI fails

Check the GitHub Actions tab for error details

### E2E tests timeout

Adjust in `playwright.config.ts` or set `E2E_TIMEOUT_MS` env var
