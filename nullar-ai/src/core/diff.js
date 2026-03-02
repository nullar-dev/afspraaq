/**
 * NullarAI - Git Diff Collector
 */

import { execSync } from 'child_process';

export function getGitDiff(commitRange) {
  try {
    if (commitRange) {
      return execSync(`git diff --no-color ${commitRange}`, {
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024,
      });
    }
    return execSync('git diff --no-color HEAD~20..HEAD', {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024,
    });
  } catch {
    try {
      return execSync('git diff --no-color', {
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024,
      });
    } catch {
      return '';
    }
  }
}

export function getCommitRange() {
  try {
    const remote = execSync(
      "git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null | cut -d'/' -f1",
      { encoding: 'utf-8' }
    ).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf-8',
    }).trim();
    return `${remote}/${branch}..HEAD`;
  } catch {
    return 'HEAD~1..HEAD';
  }
}

export function hasChanges() {
  const diff = getGitDiff();
  return diff.trim().length > 0;
}
