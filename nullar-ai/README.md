# NullarAI Reviewer

Simple review command:

```bash
node nullar-ai/src/cli/run.mjs
```

That command:

- collects changes to review
- sends them to MiniMax
- prints issues sorted by severity:
  - CRITICAL
  - MAJOR
  - MINOR
  - NIT

## Setup

```bash
export MINIMAX_API_KEY="your-key"
cd nullar-ai && npm install
```

## Review Scope

The reviewer checks both sources:

1. Commits that are about to be pushed (`upstream...HEAD`)
2. Local uncommitted changes

If both exist, NullarAI reviews both in one run.

## Pre-push Hook Mode

The included pre-push hook is now **warning mode**.

- It prints a warning and the review command
- It does **not** block push

So push still works, but you get a reminder to run:

```bash
node nullar-ai/src/cli/run.mjs
```

## Environment Variables

- `MINIMAX_API_KEY` (required unless mock)
- `MINIMAX_BASE_URL` (optional)
- `MINIMAX_MODEL` (optional)
- `MINIMAX_TIMEOUT_MS` (optional, default `20000`)
- `MINIMAX_MAX_RETRIES` (optional, default `1`)
- `MINIMAX_MAX_DIFF_SIZE` (optional, default `60000`)
- `MOCK_MODE=true` for local testing
