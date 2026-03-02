/**
 * NullarAI - File Storage
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';

const STORAGE_DIR = '.nullar-ai';
const SESSION_FILE = 'session.json';

function getStoragePath() {
  return join(process.cwd(), STORAGE_DIR, SESSION_FILE);
}

function ensureStorageDir() {
  const dir = dirname(getStoragePath());
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function createSession(diff, commitRange) {
  ensureStorageDir();

  const session = {
    id: generateId(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    state: 'awaiting_run_decision',
    diff,
    commitRange,
    issues: null,
    runCount: 0,
  };

  saveSession(session);
  return session;
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
  session.updatedAt = Date.now();
  writeFileSync(getStoragePath(), JSON.stringify(session, null, 2));
}

export function updateIssues(issues) {
  const session = getSession();
  if (!session) return null;

  session.issues = issues;
  session.runCount += 1;
  session.state = 'awaiting_rerun_decision';
  saveSession(session);
  return session;
}

export function setReadyToPush() {
  const session = getSession();
  if (!session) return null;

  session.state = 'ready_to_push';
  saveSession(session);
  return session;
}

export function setBlocked() {
  const session = getSession();
  if (!session) return null;

  session.state = 'blocked';
  saveSession(session);
  return session;
}

export function setFailed() {
  const session = getSession();
  if (!session) return null;

  session.state = 'failed';
  saveSession(session);
  return session;
}

export function clearSession() {
  const path = getStoragePath();
  if (existsSync(path)) {
    rmSync(path);
  }
}

function generateId() {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
