#!/usr/bin/env node

/**
 * NullarAI - CLI Runner
 * Main entry point for the review flow
 */

import { getGitDiff, getCommitRange, hasChanges } from '../core/diff.js';
import { callMiniMaxReview } from '../core/minimax-client.js';
import { formatIssues } from '../core/format.js';
import { countIssues } from '../core/state-machine.js';
import {
  createSession,
  updateIssues,
  setReadyToPush,
  setBlocked,
  setFailed,
  clearSession,
} from '../storage/file-store.js';

import { execSync } from 'child_process';

// Colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const NC = '\x1b[0m';

const apiKey = process.env.MINIMAX_API_KEY;

if (!apiKey) {
  console.error(RED + '❌ MINIMAX_API_KEY not set' + NC);
  console.error('Add to ~/.bashrc: export MINIMAX_API_KEY=your-key');
  process.exit(1);
}

function push() {
  console.log(GREEN + 'Force pushing...' + NC);
  try {
    execSync('git push --force-with-lease --no-verify', { stdio: 'inherit' });
    console.log(GREEN + '✅ Push successful' + NC);
    clearSession();
    process.exit(0);
  } catch {
    console.log(RED + '❌ Push failed' + NC);
    process.exit(1);
  }
}

async function runReview() {
  try {
    console.log(BLUE + '🔍 Running review...' + NC);
    const diff = getGitDiff();
    getCommitRange(); // Initialize commit range for session
    const result = await callMiniMaxReview(diff, apiKey);
    const issues = result.issues;
    const total = countIssues(issues);

    console.log(formatIssues(issues));
    updateIssues(issues);

    if (total > 0) {
      console.log('');
      console.log('>>> ASK_USER_PUSH_ANYWAY <<<');
      console.log('');
      console.log('⚠️  LLM: USE THE QUESTION TOOL TO ASK USER!');
      console.log("    Question: 'Push anyways?'");
      console.log("    Options: 'Yes' / 'No'");
      console.log('    After user answers → run: node nullar-ai/src/cli/run.mjs push');
      console.log('');
      console.log('Found ' + total + ' issues. Push anyways?');
    } else {
      console.log('');
      console.log('>>> ASK_USER_RERUN <<<');
      console.log('');
      console.log('⚠️  LLM: USE THE QUESTION TOOL TO ASK USER!');
      console.log("    Question: 'Re-run review?'");
      console.log("    Options: 'Yes' / 'No'");
      console.log('    After user answers → run: node nullar-ai/src/cli/run.mjs run');
      console.log('');
      console.log('Re-run review?');
    }
  } catch (error) {
    console.error(RED + '❌ Review failed: ' + error + NC);
    setFailed();
    process.exit(1);
  }
}

// CLI handler
const args = process.argv.slice(2);
const command = args[0];

// Check for changes first
if (!hasChanges()) {
  console.log(GREEN + '✅ No changes to review' + NC);
  console.log(BLUE + 'Force pushing...' + NC);
  push();
}

if (command === 'run') {
  // Create session and run review
  const diff = getGitDiff();
  const commitRange = getCommitRange();
  createSession(diff, commitRange);
  runReview();
} else if (command === 'push') {
  setReadyToPush();
  push();
} else if (command === 'block') {
  setBlocked();
  console.log(RED + '❌ Push blocked' + NC);
  process.exit(1);
} else {
  // Initial run - show question
  console.log('');
  console.log('============================================');
  console.log(BLUE + '🤖 NullarAI Code Review' + NC);
  console.log('============================================');
  console.log('');
  console.log('>>> ASK_USER_RUN_REVIEW <<<');
  console.log('');
  console.log('⚠️  LLM: USE THE QUESTION TOOL TO ASK USER!');
  console.log("    Question: 'Do you want to run an AI Code Review before pushing?'");
  console.log("    Options: 'Yes' / 'No'");
  console.log('    After user answers → run: node nullar-ai/src/cli/run.mjs run');
  console.log('');
  console.log('Run AI Code Review?');
}
