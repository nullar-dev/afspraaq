# NullarAI - LLM-First Push Review Gate

NullarAI is a strict, JSON-only review workflow for autonomous coding agents.

It is designed for this flow:

1. User says "commit and push"
2. `git push` is blocked by pre-push hook
3. LLM runs NullarAI loop (`next` -> `answer` -> `push`)
4. User decisions are captured explicitly
5. Push is allowed only after a valid terminal state

## Quick Setup

```bash
# 1) Copy the tool
cp -r nullar-ai /path/to/your-repo/

# 2) API key
export MINIMAX_API_KEY="your-minimax-api-key"

# 3) Install dependencies
cd nullar-ai && npm install

# 4) Install hook
cp nullar-ai/hooks/pre-push .git/hooks/pre-push
chmod +x .git/hooks/pre-push

# 5) Smoke test
node nullar-ai/src/cli/run.mjs next
```

## Core Commands

| Command                                                                                        | Purpose                                    |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `node nullar-ai/src/cli/run.mjs next`                                                          | Get current state + next question          |
| `node nullar-ai/src/cli/run.mjs answer --question-id <id> --choice yes --user-confirmed "..."` | Answer current question with user evidence |
| `node nullar-ai/src/cli/run.mjs answer yes --question-id <id> --user-confirmed "..."`          | Shorthand answer form (also valid)         |
| `node nullar-ai/src/cli/run.mjs push`                                                          | Push only when state is `ready_to_push`    |
| `node nullar-ai/src/cli/run.mjs status`                                                        | Show structured session snapshot           |
| `node nullar-ai/src/cli/run.mjs reset`                                                         | Clear session                              |

Notes:

- No force-push command exists in normal flow.
- Output is always structured JSON.
- Unknown/out-of-order actions return structured errors.
- `answer` requires `--user-confirmed` text in strict mode.

## LLM Loop (Recommended)

The LLM should never improvise commands. It should follow this loop:

1. Run `next`
2. Read JSON fields: `question`, `options`, `allowedCommands`, `state`
3. Ask user exactly the returned question/options
4. Run `answer --question-id <id> --choice yes|no --user-confirmed "<verbatim user answer>"`
5. If state is `awaiting_push_anyway_decision` and user says yes, also pass `--verification-summary "<what was verified>"`
6. Repeat until `state` is `ready_to_push` or `blocked`
7. If `ready_to_push`, run `push`

## JSON Contract

Every response includes:

- `ok`: boolean
- `action`: command handled (`next`, `answer`, `push`, `status`, `reset`)

Common workflow fields:

- `state`: current finite state
- `question`: exact prompt for user
- `options`: valid user options (`yes`, `no`)
- `allowedCommands`: commands currently valid for LLM
- `sessionId`: current session id (when available)
- `questionId`: current question token; required for `answer`
- `mustAskUser`: when true, LLM must ask user and cannot auto-decide
- `forbiddenAutoDecision`: explicit strict-mode flag
- `requiredAnswerFields`: fields required for `answer`

Issue-validation fields (when issues exist):

- `markers`: includes `VERIFY_ISSUES_REQUIRED`
- `verificationRequired.marker`: `>>> VERIFY_ISSUES_REQUIRED <<<`
- `verificationRequired.instruction`: strict validation directive for the LLM
- `verificationRequired.requiredChecklist`: required validation steps

On failure:

- `ok: false`
- `code`: machine-readable error code
- `message`: human-readable reason

Strict-mode failure codes:

- `QUESTION_ID_REQUIRED`
- `QUESTION_ID_MISMATCH`
- `NO_PENDING_QUESTION`
- `USER_CONFIRMATION_REQUIRED`
- `VERIFICATION_SUMMARY_REQUIRED`
- `MISSING_USER_DECISION_AUDIT`
- `MISSING_USER_CONFIRMATION`
- `MISSING_VERIFICATION_SUMMARY`
- `REVIEW_OUTDATED`

Example `next`:

```json
{
  "ok": true,
  "action": "next",
  "sessionId": "session_...",
  "state": "awaiting_run_decision",
  "question": "Run AI code review before push?",
  "options": ["yes", "no"],
  "allowedCommands": ["answer"]
}
```

Example invalid push:

```json
{
  "ok": false,
  "code": "NOT_READY_TO_PUSH",
  "message": "Session is not ready to push.",
  "state": "awaiting_push_anyway_decision",
  "allowedCommands": ["next", "answer"]
}
```

Example issue-validation marker payload:

```json
{
  "ok": true,
  "state": "awaiting_push_anyway_decision",
  "markers": ["VERIFY_ISSUES_REQUIRED"],
  "verificationRequired": {
    "marker": ">>> VERIFY_ISSUES_REQUIRED <<<",
    "instruction": "Before deciding, verify every issue against current code. Classify each as real, stale, or unclear with file-line evidence. Summarize only real issues."
  }
}
```

## State Model

- `awaiting_run_decision`
- `running_review`
- `awaiting_push_decision`
- `awaiting_push_anyway_decision`
- `ready_to_push`
- `blocked`
- `failed`

## What Gets Reviewed

Primary target: commits that are about to be pushed.

- If upstream exists: diff is `upstream...HEAD`
- If no upstream: fallback to last commit diff

This matches pre-push protection intent (review what is leaving your machine).

## Environment Variables

| Variable                | Required          | Description                                           |
| ----------------------- | ----------------- | ----------------------------------------------------- |
| `MINIMAX_API_KEY`       | Yes (unless mock) | MiniMax API key                                       |
| `MINIMAX_BASE_URL`      | No                | Custom endpoint (default `https://api.minimax.io/v1`) |
| `MINIMAX_MODEL`         | No                | Model override                                        |
| `MINIMAX_TIMEOUT_MS`    | No                | API timeout (default `30000`)                         |
| `MINIMAX_MAX_RETRIES`   | No                | Retry count (default `2`)                             |
| `MINIMAX_MAX_DIFF_SIZE` | No                | Max diff chars sent to model (default `60000`)        |
| `MOCK_MODE`             | No                | Set `true` for local testing without API              |

## Important Hook Behavior

The pre-push hook blocks direct pushes.

When NullarAI reaches a valid approved state and runs `push`, it sets an internal env var (`NULLAR_AI_APPROVED=1`) for that command so hook check passes only for that approved attempt.

This keeps normal `git push` blocked while allowing the reviewed flow to complete.
