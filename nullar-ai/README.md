# NullarAI - Plug-and-Play AI Code Reviewer

AI-powered code review using MiniMax M2.5. Drag-and-drop into any repo.

## Quick Setup

```bash
# 1. Copy nullar-ai folder to your repo
cp -r nullar-ai /path/to/your-repo/

# 2. Set API key
export MINIMAX_API_KEY="your-minimax-api-key"

# 3. Install dependencies
cd nullar-ai && npm install

# 4. Set up pre-push hook
cp nullar-ai/hooks/pre-push .git/hooks/pre-push
chmod +x .git/hooks/pre-push

# 5. Test
node nullar-ai/src/cli/run.mjs
```

## Usage

### For Users

```bash
git push  # Blocked - LLM will guide you
```

### For LLMs (including opencode)

When user asks to push:

1. Run: `node nullar-ai/src/cli/run.mjs`
2. Script shows `>>> ASK_USER_RUN_REVIEW <<<`
3. Use **question tool** to ask user:
   - Question: "Do you want to run an AI Code Review before pushing?"
   - Options: "Yes" / "No"
4. After user answers, run appropriate command:
   - User said **No**: `node nullar-ai/src/cli/run.mjs push`
   - User said **Yes**: `node nullar-ai/src/cli/run.mjs run`
5. Review runs, shows issues
6. Use **question tool** to ask:
   - "Re-run review?" (if issues found)
   - "Push anyways?" (if issues > 0)
7. After final answer:
   - Push: `node nullar-ai/src/cli/run.mjs push`
   - Block: `node nullar-ai/src/cli/run.mjs block`

## Commands

| Command                                | Description                    |
| -------------------------------------- | ------------------------------ |
| `node nullar-ai/src/cli/run.mjs`       | Start - shows initial question |
| `node nullar-ai/src/cli/run.mjs run`   | Run the review                 |
| `node nullar-ai/src/cli/run.mjs push`  | Force push                     |
| `node nullar-ai/src/cli/run.mjs block` | Block push (exit 1)            |

## Environment Variables

| Variable          | Required | Description                            |
| ----------------- | -------- | -------------------------------------- |
| `MINIMAX_API_KEY` | Yes      | Get from https://platform.minimaxi.com |

## Flow

```
git push
    │
    ▼
Ask: "Run AI Code Review? y/n"
    │
    ├── n ──▶ force push
    │
    └── y ──▶ Get diff of commits
                │
                ▼
            Call MiniMax API
                │
                ▼
            Display issues
            🔴 CRITICAL (X)
            🟠 MAJOR (X)
            🟡 MINOR (X)
            🔵 NIT (X)
                │
                ▼
            Ask: "Re-run review? y/n"
                │
                ├── y ──▶ Loop back to "Call MiniMax API"
                │
                └── n ──▶
                            │
                            ├── Issues > 0: Ask "Push anyways? y/n"
                            │       │
                            │       ├── n ──▶ block (exit 1)
                            │       │
                            │       └── y ──▶ force push
                            │
                            └── Issues = 0: force push
```

## Reuse in Other Projects

Simply copy the `nullar-ai/` folder to any repo:

```bash
cp -r /path/to/afspraaq/nullar-ai /path/to/other-repo/
cd /path/to/other-repo
export MINIMAX_API_KEY="your-key"
cp nullar-ai/hooks/pre-push .git/hooks/pre-push
```

## Files

```
nullar-ai/
├── package.json
├── README.md
├── hooks/
│   └── pre-push
└── src/
    ├── core/
    │   ├── state-machine.ts   # State transitions
    │   ├── minimax-client.ts  # MiniMax API
    │   ├── diff.ts            # Git diff collector
    │   ├── format.ts           # Output formatter
    │   └── index.ts
    ├── storage/
    │   └── file-store.ts       # Session state
    └── cli/
        └── run.mjs            # Main CLI
```
