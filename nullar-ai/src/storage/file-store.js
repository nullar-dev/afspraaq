/**
 * NullarAI - File Storage
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, renameSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STORAGE_DIR = '.nullar-ai';
const SESSION_FILE = 'session.json';
const LOCK_FILE = 'session.lock';
const LOCK_TIMEOUT_MS = 5000;
const MAX_DIFF_LENGTH = 10000;

function getStorageDir() {
  const projectRoot = findProjectRoot();
  return join(projectRoot, STORAGE_DIR);
}

function findProjectRoot() {
  let current = __dirname;
  const root = '/';
  while (current !== root) {
    try {
      if (existsSync(join(current, 'package.json'))) {
        return current;
      }
    } catch {}
    current = dirname(current);
  }
  return process.cwd();
}

function getStoragePath() {
  return join(getStorageDir(), SESSION_FILE);
}

function getLockPath() {
  return join(getStorageDir(), LOCK_FILE);
}

function ensureStorageDir() {
  const dir = getStorageDir();
  if (!existsSync(dir)) {
    try {
      mkdirSync(dir, { recursive: true });
    } catch (err) {
      throw new Error('Failed to create storage directory: ' + err.message);
    }
  }
}

function acquireLock() {
  const lockPath = getLockPath();
  const startTime = Date.now();

  while (existsSync(lockPath)) {
    if (Date.now() - startTime > LOCK_TIMEOUT_MS) {
      try {
        rmSync(lockPath);
      } catch {
        throw new Error('Could not acquire lock: timeout');
      }
    }
    try {
      readFileSync(lockPath, 'utf-8');
    } catch {
      break;
    }
    const pid = process.pid;
    writeFileSync(lockPath, JSON.stringify({ pid, startTime: Date.now() }));
    return true;
  }

  const pid = process.pid;
  writeFileSync(lockPath, JSON.stringify({ pid, startTime: Date.now() }));
  return true;
}

function releaseLock() {
  const lockPath = getLockPath();
  if (existsSync(lockPath)) {
    try {
      rmSync(lockPath);
    } catch {}
  }
}

function truncateDiffForStorage(diff) {
  if (!diff) return '';
  if (diff.length <= MAX_DIFF_LENGTH) return diff;
  return diff.slice(0, MAX_DIFF_LENGTH) + '\n\n[... diff truncated for storage ...]';
}

export const ReviewState = {
  AWAITING_RUN_DECISION: 'awaiting_run_decision',
  RUNNING_REVIEW: 'running_review',
  AWAITING_PUSH_DECISION: 'awaiting_push_decision',
  AWAITING_PUSH_ANYWAY_DECISION: 'awaiting_push_anyway_decision',
  READY_TO_PUSH: 'ready_to_push',
  BLOCKED: 'blocked',
  FAILED: 'failed',
};

export function createSession(diff, commitRange) {
  ensureStorageDir();
  acquireLock();

  try {
    const session = {
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      state: ReviewState.AWAITING_RUN_DECISION,
      diff: truncateDiffForStorage(diff),
      commitRange,
      issues: null,
      runCount: 0,
    };

    saveSession(session);
    return session;
  } finally {
    releaseLock();
  }
}

export function getSession() {
  const path = getStoragePath();
  if (!existsSync(path)) {
    return null;
  }

  try {
    const data = readFileSync(path, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function saveSession(session) {
  ensureStorageDir();
  const tempPath = getStoragePath() + '.tmp';
  session.updatedAt = Date.now();
  try {
    writeFileSync(tempPath, JSON.stringify(session, null, 2));
    renameSync(tempPath, getStoragePath());
  } catch (err) {
    try {
      rmSync(tempPath);
    } catch {}
    throw new Error('Failed to save session: ' + err.message);
  }
}

export function updateIssues(issues) {
  acquireLock();

  try {
    const session = getSession();
    if (!session) return null;

    session.issues = issues;
    session.runCount += 1;
    session.state = ReviewState.AWAITING_PUSH_ANYWAY_DECISION;
    saveSession(session);
    return session;
  } finally {
    releaseLock();
  }
}

export function setReadyToPush() {
  acquireLock();

  try {
    const session = getSession();
    if (!session) return null;

    session.state = ReviewState.READY_TO_PUSH;
    saveSession(session);
    return session;
  } finally {
    releaseLock();
  }
}

export function setBlocked() {
  acquireLock();

  try {
    const session = getSession();
    if (!session) return null;

    session.state = ReviewState.BLOCKED;
    saveSession(session);
    return session;
  } finally {
    releaseLock();
  }
}

export function setFailed() {
  acquireLock();

  try {
    const session = getSession();
    if (!session) return null;

    session.state = ReviewState.FAILED;
    saveSession(session);
    return session;
  } finally {
    releaseLock();
  }
}

export function clearSession() {
  acquireLock();

  try {
    const path = getStoragePath();
    if (existsSync(path)) {
      rmSync(path);
    }
  } finally {
    releaseLock();
  }
}

export function getValidStates() {
  return {
    [ReviewState.AWAITING_RUN_DECISION]: [
      ReviewState.RUNNING_REVIEW,
      ReviewState.READY_TO_PUSH,
      ReviewState.BLOCKED,
    ],
    [ReviewState.RUNNING_REVIEW]: [
      ReviewState.AWAITING_PUSH_DECISION,
      ReviewState.AWAITING_PUSH_ANYWAY_DECISION,
      ReviewState.FAILED,
    ],
    [ReviewState.AWAITING_PUSH_DECISION]: [ReviewState.READY_TO_PUSH, ReviewState.BLOCKED],
    [ReviewState.AWAITING_PUSH_ANYWAY_DECISION]: [ReviewState.READY_TO_PUSH, ReviewState.BLOCKED],
    [ReviewState.READY_TO_PUSH]: [],
    [ReviewState.BLOCKED]: [],
    [ReviewState.FAILED]: [],
  };
}

export function canTransitionTo(currentState, targetState) {
  const validStates = getValidStates();
  const allowed = validStates[currentState] || [];
  return allowed.includes(targetState);
}

function generateId() {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
