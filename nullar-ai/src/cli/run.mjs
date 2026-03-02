#!/usr/bin/env node

import { getGitDiff, getPushDiff } from '../core/diff.js';
import { formatIssues } from '../core/format.js';
import { callMiniMaxReview } from '../core/minimax-client.js';
import { countIssues } from '../core/state-machine.js';

const apiKey = process.env.MINIMAX_API_KEY;

function info(message) {
  process.stderr.write(`[NullarAI] ${message}\n`);
}

function fail(message) {
  process.stderr.write(`[NullarAI] ${message}\n`);
  process.exit(1);
}

function collectReviewDiff() {
  const pushDiff = getPushDiff();
  const localDiff = getGitDiff();

  const hasPushDiff = pushDiff.trim().length > 0;
  const hasLocalDiff = localDiff.trim().length > 0;

  if (hasPushDiff && hasLocalDiff) {
    const merged = [
      '### COMMITS_TO_PUSH_DIFF',
      pushDiff,
      '',
      '### LOCAL_UNCOMMITTED_DIFF',
      localDiff,
    ].join('\n');

    return {
      mode: 'combined_push_and_local',
      diff: merged,
    };
  }

  if (hasPushDiff) {
    return {
      mode: 'commits_to_push',
      diff: pushDiff,
    };
  }

  if (hasLocalDiff) {
    return {
      mode: 'local_uncommitted_changes',
      diff: localDiff,
    };
  }

  return {
    mode: 'none',
    diff: '',
  };
}

async function main() {
  if (!apiKey && process.env.MOCK_MODE !== 'true') {
    fail('MINIMAX_API_KEY is not set. Export it before running the reviewer.');
  }

  const { mode, diff } = collectReviewDiff();

  if (mode === 'none') {
    info('No changes found to review.');
    process.stdout.write('No changes found. Nothing to review.\n');
    process.exit(0);
  }

  info(`Review mode: ${mode}`);
  info(`Collected diff: ${diff.length} chars`);
  info('Running MiniMax review...');

  const result = await callMiniMaxReview(diff, apiKey);
  const issues = result.issues;
  const total = countIssues(issues);

  process.stdout.write(`${formatIssues(issues)}\n`);
  process.stdout.write(`\nReview mode: ${mode}\n`);
  process.stdout.write(`Total issues: ${total}\n`);

  if (result.wasTruncated) {
    process.stdout.write('Warning: diff was truncated before review. Some issues may be missed.\n');
  }
}

main().catch(error => {
  fail(`Review failed: ${String(error?.message || error)}`);
});
