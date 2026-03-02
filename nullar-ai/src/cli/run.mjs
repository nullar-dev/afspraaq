#!/usr/bin/env node

import { getGitDiff, getPushDiff } from '../core/diff.js';
import { formatIssues } from '../core/format.js';
import { runParallelAgents } from '../core/parallel-agents.js';
import { collectReviewContext } from '../core/context-collector.js';
import { countIssues } from '../core/state-machine.js';
import { runStaticAnalyzers } from '../core/static-analyzers.js';

const apiKey = process.env.MINIMAX_API_KEY;
const DEBUG = process.env.NULLAR_AI_DEBUG === '1';
const HEARTBEAT_MS = 3000;

function info(message) {
  process.stderr.write(`[NullarAI] ${message}\n`);
}

function debug(message) {
  if (!DEBUG) return;
  process.stderr.write(`[NullarAI][debug] ${message}\n`);
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

  info('Building expanded context (grep-based)...');
  const reviewContext = collectReviewContext(diff);
  info(
    `Context: ${reviewContext.summary.functionsFound} functions, ${reviewContext.summary.classesFound} classes, ${reviewContext.summary.usagesFound} usages found`
  );

  const skipLinters = process.env.NULLAR_SKIP_LINTERS === 'true';
  let linterResults = [];

  if (!skipLinters) {
    info('Running static analyzers in parallel...');
    linterResults = await runStaticAnalyzers(reviewContext.changedFiles);
    if (linterResults.length > 0) {
      info(`Static analyzers found ${linterResults.length} issues`);
    }
  }

  debug(
    `Configured timeout: ${process.env.MINIMAX_TIMEOUT_MS ? `${process.env.MINIMAX_TIMEOUT_MS}ms` : 'disabled (manual abort mode)'}`
  );
  debug(`Configured retries: ${process.env.MINIMAX_MAX_RETRIES || '2'}`);

  const startMs = Date.now();
  const heartbeat = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startMs) / 1000);
    info(`Still reviewing... ${elapsed}s elapsed`);
  }, HEARTBEAT_MS);

  let result;
  try {
    result = await runParallelAgents(reviewContext.context, apiKey, {
      onProgress: msg => info(msg),
      onAttempt: ({ attempt, maxAttempts, agent }) => {
        info(`[${agent}] Attempt ${attempt}/${maxAttempts}`);
      },
      onRetry: ({ delayMs, error, agent }) => {
        info(
          `[${agent}] Retrying in ${Math.floor(delayMs / 1000)}s due to error: ${String(error?.message || error)}`
        );
      },
      onError: errorData => {
        if (errorData.agents) {
          for (const a of errorData.agents) {
            info(`[${a.agent}] Agent failed: ${a.error}`);
          }
        } else if (errorData.agent) {
          info(`[${errorData.agent}] Agent error: ${errorData.error}`);
        }
      },
    });
  } catch (err) {
    clearInterval(heartbeat);
    fail(`Review failed: ${String(err?.message || err)}`);
  } finally {
    clearInterval(heartbeat);
  }

  const elapsedTotal = ((Date.now() - startMs) / 1000).toFixed(1);
  info(`Review completed in ${elapsedTotal}s`);

  const agentsRan = result.agentsRan || [];
  info(`Agents ran: ${agentsRan.join(', ')}`);

  let issues = result.issues || { CRITICAL: [], MAJOR: [], MINOR: [], NIT: [] };

  if (linterResults.length > 0) {
    for (const lint of linterResults) {
      const validSeverities = ['CRITICAL', 'MAJOR', 'MINOR', 'NIT'];
      const severity = validSeverities.includes(lint.severity) ? lint.severity : 'MAJOR';
      issues[severity].push(`[LINTER:${lint.tool}] ${lint.file}:${lint.line} - ${lint.message}`);
    }
  }

  const total = countIssues(issues);

  process.stdout.write(`${formatIssues(issues)}\n`);
  process.stdout.write(`\nReview mode: ${mode}\n`);
  process.stdout.write(`Agents: ${agentsRan.join(', ')}\n`);
  process.stdout.write(`Total issues: ${total}\n`);

  if (result.wasTruncated) {
    process.stdout.write('Warning: diff was truncated before review. Some issues may be missed.\n');
  }

  if (result.failedAgents && result.failedAgents.length > 0) {
    process.stdout.write(`Warning: Some agents failed: ${result.failedAgents.join(', ')}\n`);
  }
}

main().catch(error => {
  fail(`Review failed: ${String(error?.message || error)}`);
});
