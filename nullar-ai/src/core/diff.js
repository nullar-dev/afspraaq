/**
 * NullarAI - Git Diff Collector
 */

import { execFileSync } from 'child_process';

const MAX_BUFFER = 50 * 1024 * 1024;

const errors = [];

function tryGitDiff(args) {
  try {
    return execFileSync('git', args, {
      encoding: 'utf-8',
      maxBuffer: MAX_BUFFER,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    errors.push({ args, error: err.message });
    return null;
  }
}

export function getGitDiff(commitRange) {
  errors.length = 0;

  if (commitRange) {
    const result = tryGitDiff(['diff', '--no-color', commitRange]);
    if (result !== null) return result;
  }

  const staged = tryGitDiff(['diff', '--no-color', '--staged']);
  if (staged !== null && staged.trim()) return staged;

  const unstaged = tryGitDiff(['diff', '--no-color']);
  if (unstaged !== null) return unstaged;

  reportErrors('getGitDiff');
  return '';
}

export function getCommitInfo() {
  errors.length = 0;
  const info = {
    upstream: null,
    branch: null,
    aheadCount: 0,
    hasUpstream: false,
    isClean: false,
    errors: [],
  };

  const upstreamResult = tryGitDiff(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  if (upstreamResult !== null) {
    info.upstream = upstreamResult.trim();
    info.hasUpstream = true;
  }

  const branchResult = tryGitDiff(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branchResult !== null) {
    info.branch = branchResult.trim();
  } else {
    info.branch = 'HEAD';
  }

  if (info.hasUpstream) {
    const aheadResult = tryGitDiff(['rev-list', '--count', `${info.upstream}..HEAD`]);
    if (aheadResult !== null) {
      info.aheadCount = parseInt(aheadResult.trim(), 10) || 0;
    }
  }

  const statusResult = tryGitDiff(['status', '--porcelain']);
  if (statusResult !== null) {
    info.isClean = !statusResult.trim();
  } else {
    info.isClean = true;
  }

  if (errors.length > 0) {
    info.errors = errors.map(e => ({ cmd: e.args.join(' '), error: e.error }));
  }

  return info;
}

export function getPushDiff() {
  errors.length = 0;
  const info = getCommitInfo();

  if (!info.hasUpstream) {
    let result = tryGitDiff(['diff', '--no-color', 'HEAD^..HEAD']);
    if (result !== null) return result;

    result = tryGitDiff(['show', '--format=', '--patch', 'HEAD']);
    if (result !== null) return result;

    reportErrors('getPushDiff (no upstream)');
    return '';
  }

  if (info.aheadCount === 0) {
    return '';
  }

  const result = tryGitDiff(['diff', '--no-color', `${info.upstream}...HEAD`]);
  if (result !== null) return result;

  reportErrors('getPushDiff');
  return '';
}

function reportErrors() {
  if (errors.length === 0) return;
}

export function getCommitRange() {
  const info = getCommitInfo();

  if (!info.hasUpstream) {
    return null;
  }

  return `${info.upstream}...HEAD`;
}

export function hasChanges() {
  const diff = getPushDiff();
  return diff.trim().length > 0;
}

export function isUpToDate() {
  const info = getCommitInfo();
  return info.hasUpstream && info.aheadCount === 0;
}

export function getLastErrors() {
  return [...errors];
}
