# NullarAI Reviewer

Deep context-aware AI code reviewer with multi-agent parallel analysis.

## Quick Start

```bash
node nullar-ai/src/cli/run.mjs
```

## What It Does

1. **Collects changes** - Push diff + local uncommitted changes
2. **Expands context** - Finds all usages of changed functions/classes via grep
3. **Runs 3 parallel agents**:
   - **Security** - Finds vulnerabilities, injection, auth issues
   - **Logic** - Finds bugs, null checks, race conditions
   - **Quality** - Finds performance, maintainability, best practices
4. **Runs static analyzers** - ESLint (JS/TS), Ruff (Python)
5. **Prints issues** sorted by severity:
   - CRITICAL
   - MAJOR
   - MINOR
   - NIT
6. **Shows live progress** while waiting

## Setup

```bash
export MINIMAX_API_KEY="your-key"
cd nullar-ai && npm install
```

## Features

### Deep Context Expansion

- Extracts function/class names from diff
- Greps entire codebase for all usages
- Includes 12 lines of context around each usage
- Sends expanded context to LLM for deeper analysis

### Multi-Agent Parallel Review

- **Security Agent** - SQL injection, XSS, auth bypass, secrets, etc.
- **Logic Agent** - Null checks, race conditions, async errors, etc.
- **Quality Agent** - Performance, maintainability, best practices

All 3 agents run in parallel for faster results.

### Static Analysis Integration

- ESLint for JavaScript/TypeScript/TSX
- Ruff for Python
- Results merged with LLM findings

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
- `MINIMAX_TIMEOUT_MS` (optional, no timeout by default; set if you want auto-timeout)
- `MINIMAX_MAX_RETRIES` (optional, default `2`)
- `MINIMAX_MAX_DIFF_SIZE` (optional, default `60000`)
- `MOCK_MODE=true` for local testing
- `NULLAR_AI_DEBUG=1` for extra debug logs
- `NULLAR_SKIP_LINTERS=true` to disable static analyzers
