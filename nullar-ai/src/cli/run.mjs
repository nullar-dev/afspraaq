#!/usr/bin/env node

import { execSync } from 'child_process';
import { getCommitInfo, getCommitRange, getPushDiff } from '../core/diff.js';
import { callMiniMaxReview } from '../core/minimax-client.js';
import { countIssues } from '../core/state-machine.js';
import {
  ReviewState,
  canTransitionTo,
  clearSession,
  createSession,
  getSession,
  saveSession,
} from '../storage/file-store.js';

const apiKey = process.env.MINIMAX_API_KEY;

function ok(data) {
  process.stdout.write(`${JSON.stringify({ ok: true, ...data }, null, 2)}\n`);
  process.exit(0);
}

function fail(code, message, details = {}) {
  process.stdout.write(`${JSON.stringify({ ok: false, code, message, ...details }, null, 2)}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const command = args[0] || 'next';
  const out = { command, choice: null };

  for (let i = 1; i < args.length; i += 1) {
    if (args[i] === '--choice' && args[i + 1]) {
      out.choice = args[i + 1].toLowerCase();
      i += 1;
    }
  }

  return out;
}

function normalizeChoice(choice) {
  if (choice === 'y' || choice === 'yes') return 'yes';
  if (choice === 'n' || choice === 'no') return 'no';
  return null;
}

function ensureSession() {
  let session = getSession();
  if (session) {
    if (session.state === 'awaiting_rerun_decision') {
      const issueCount = session.issueCount ?? countIssues(session.issues || emptyIssues());
      session.issueCount = issueCount;
      session.state =
        issueCount > 0
          ? ReviewState.AWAITING_PUSH_ANYWAY_DECISION
          : ReviewState.AWAITING_PUSH_DECISION;
      saveSession(session);
    }
    return session;
  }

  const diff = getPushDiff();
  const commitRange = getCommitRange();
  session = createSession(diff, commitRange);

  if (!diff.trim()) {
    session.state = ReviewState.AWAITING_PUSH_DECISION;
    session.noChanges = true;
    saveSession(session);
  }

  return session;
}

function getPromptForState(session) {
  if (session.state === ReviewState.AWAITING_RUN_DECISION) {
    return {
      state: session.state,
      question: 'Run AI code review before push?',
      options: ['yes', 'no'],
      allowedCommands: ['answer'],
    };
  }

  if (session.state === ReviewState.AWAITING_PUSH_DECISION) {
    return {
      state: session.state,
      question: session.noChanges
        ? 'No changes to review. Push now?'
        : 'No issues found. Push now?',
      options: ['yes', 'no'],
      allowedCommands: ['answer'],
    };
  }

  if (session.state === ReviewState.AWAITING_PUSH_ANYWAY_DECISION) {
    const total = session.issueCount ?? countIssues(session.issues || emptyIssues());
    return {
      state: session.state,
      question: `Found ${total} issue(s). Push anyway?`,
      options: ['yes', 'no'],
      allowedCommands: ['answer'],
      markers: ['VERIFY_ISSUES_REQUIRED'],
      verificationRequired: {
        marker: '>>> VERIFY_ISSUES_REQUIRED <<<',
        instruction:
          'Before deciding, verify every issue against current code. Classify each as real, stale, or unclear with file-line evidence. Summarize only real issues.',
        requiredChecklist: [
          'Check current file and line for each issue',
          'Classify each issue: real | stale | unclear',
          'Provide evidence for each classification',
          'Create a final summary with only real issues',
        ],
      },
      issues: session.issues,
      issueCount: total,
    };
  }

  if (session.state === ReviewState.READY_TO_PUSH) {
    return {
      state: session.state,
      question: 'Ready to push.',
      options: [],
      allowedCommands: ['push'],
    };
  }

  if (session.state === ReviewState.BLOCKED) {
    return {
      state: session.state,
      question: 'Push blocked by user decision.',
      options: [],
      allowedCommands: ['next'],
    };
  }

  if (session.state === ReviewState.FAILED) {
    return {
      state: session.state,
      question: 'Review failed. Fix issue and retry.',
      options: [],
      allowedCommands: ['next'],
      error: session.error || null,
    };
  }

  return {
    state: session.state,
    question: 'Unknown state.',
    options: [],
    allowedCommands: ['next'],
  };
}

function emptyIssues() {
  return { CRITICAL: [], MAJOR: [], MINOR: [], NIT: [] };
}

async function runReview(session) {
  if (!apiKey && process.env.MOCK_MODE !== 'true') {
    session.state = ReviewState.FAILED;
    session.error = 'MINIMAX_API_KEY not set';
    saveSession(session);
    return session;
  }

  if (!canTransitionTo(session.state, ReviewState.RUNNING_REVIEW)) {
    session.state = ReviewState.FAILED;
    session.error = `Invalid transition: ${session.state} -> ${ReviewState.RUNNING_REVIEW}`;
    saveSession(session);
    return session;
  }

  session.state = ReviewState.RUNNING_REVIEW;
  saveSession(session);

  try {
    const diff = getPushDiff();
    session.diff = diff;
    const result = await callMiniMaxReview(diff, apiKey);
    const issues = result.issues || emptyIssues();
    const issueCount = countIssues(issues);

    session.issues = issues;
    session.issueCount = issueCount;
    session.runCount = (session.runCount || 0) + 1;
    session.noChanges = false;
    session.state =
      issueCount > 0
        ? ReviewState.AWAITING_PUSH_ANYWAY_DECISION
        : ReviewState.AWAITING_PUSH_DECISION;
    session.review = {
      wasTruncated: Boolean(result.wasTruncated),
      reviewedAt: Date.now(),
      commitRange: getCommitRange(),
      head: execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim(),
    };

    saveSession(session);
    return session;
  } catch (error) {
    session.state = ReviewState.FAILED;
    session.error = String(error?.message || error);
    saveSession(session);
    return session;
  }
}

function doPush(session) {
  if (!session || session.state !== ReviewState.READY_TO_PUSH) {
    fail('NOT_READY_TO_PUSH', 'Session is not ready to push.', {
      state: session?.state || null,
      allowedCommands: ['next', 'answer'],
    });
  }

  const commitInfo = getCommitInfo();
  if (commitInfo.hasUpstream && commitInfo.aheadCount === 0) {
    clearSession();
    ok({
      action: 'push',
      result: 'already_up_to_date',
      message: 'Already up to date with remote.',
    });
  }

  try {
    const output = execSync('git push', {
      encoding: 'utf-8',
      stdio: 'pipe',
      env: { ...process.env, NULLAR_AI_APPROVED: '1' },
    });
    clearSession();
    ok({
      action: 'push',
      result: 'success',
      gitOutput: output,
    });
  } catch (error) {
    fail('PUSH_FAILED', 'Git push failed.', {
      action: 'push',
      result: 'failed',
      gitStdout: error.stdout?.toString() || '',
      gitStderr: error.stderr?.toString() || '',
    });
  }
}

async function doAnswer(choiceValue) {
  const choice = normalizeChoice(choiceValue);
  if (!choice) {
    fail('INVALID_CHOICE', 'Choice must be yes/no.', { allowedChoices: ['yes', 'no'] });
  }

  const session = ensureSession();

  if (session.state === ReviewState.AWAITING_RUN_DECISION) {
    if (choice === 'yes') {
      const updated = await runReview(session);
      ok({ action: 'answer', choice, ...getPromptForState(updated), sessionId: updated.id });
    }

    if (!canTransitionTo(session.state, ReviewState.READY_TO_PUSH)) {
      fail('INVALID_TRANSITION', 'Cannot transition to ready_to_push from current state.', {
        state: session.state,
      });
    }

    session.state = ReviewState.READY_TO_PUSH;
    saveSession(session);
    ok({ action: 'answer', choice, ...getPromptForState(session), sessionId: session.id });
  }

  if (session.state === ReviewState.AWAITING_PUSH_DECISION) {
    const target = choice === 'yes' ? ReviewState.READY_TO_PUSH : ReviewState.BLOCKED;
    if (!canTransitionTo(session.state, target)) {
      fail('INVALID_TRANSITION', `Cannot transition to ${target}.`, { state: session.state });
    }
    session.state = target;
    saveSession(session);
    ok({ action: 'answer', choice, ...getPromptForState(session), sessionId: session.id });
  }

  if (session.state === ReviewState.AWAITING_PUSH_ANYWAY_DECISION) {
    const target = choice === 'yes' ? ReviewState.READY_TO_PUSH : ReviewState.BLOCKED;
    if (!canTransitionTo(session.state, target)) {
      fail('INVALID_TRANSITION', `Cannot transition to ${target}.`, { state: session.state });
    }
    session.state = target;
    saveSession(session);
    ok({ action: 'answer', choice, ...getPromptForState(session), sessionId: session.id });
  }

  fail('NO_QUESTION_ACTIVE', 'There is no active yes/no question for this session.', {
    state: session.state,
    allowedCommands: getPromptForState(session).allowedCommands,
  });
}

async function main() {
  const { command, choice } = parseArgs(process.argv);

  if (command === 'next') {
    const session = ensureSession();
    ok({ action: 'next', sessionId: session.id, ...getPromptForState(session) });
  }

  if (command === 'answer') {
    await doAnswer(choice);
  }

  if (command === 'push') {
    doPush(getSession());
  }

  if (command === 'status') {
    const session = getSession();
    if (!session) {
      ok({ action: 'status', session: null });
    }

    const safeSession = {
      id: session.id,
      state: session.state,
      runCount: session.runCount ?? 0,
      issueCount: session.issueCount ?? countIssues(session.issues || emptyIssues()),
      noChanges: Boolean(session.noChanges),
      commitRange: session.commitRange ?? null,
      review: session.review ?? null,
      updatedAt: session.updatedAt,
      createdAt: session.createdAt,
    };

    ok({ action: 'status', session: safeSession });
  }

  if (command === 'reset') {
    clearSession();
    ok({ action: 'reset', result: 'cleared' });
  }

  fail('UNKNOWN_COMMAND', 'Unknown command.', {
    command,
    allowedCommands: ['next', 'answer', 'push', 'status', 'reset'],
  });
}

main().catch(error => {
  fail('UNHANDLED_ERROR', String(error?.message || error));
});
