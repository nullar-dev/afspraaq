/**
 * NullarAI - Parallel Multi-Agent Review System
 * Runs 3 specialized agents in parallel for Security, Logic, and Quality
 */

import { OpenAI } from 'openai';

const MODEL = process.env.MINIMAX_MODEL || 'MiniMax-M2.5';
const BASE_URL = process.env.MINIMAX_BASE_URL || 'https://api.minimax.io/v1';
const timeoutFromEnv = parseInt(process.env.MINIMAX_TIMEOUT_MS, 10);
const TIMEOUT_MS = Number.isFinite(timeoutFromEnv) && timeoutFromEnv > 0 ? timeoutFromEnv : null;
const MAX_RETRIES = parseInt(process.env.MINIMAX_MAX_RETRIES, 10) || 2;

const SHARED_CONTRACT = `OUTPUT CONTRACT (STRICT):
Return ONLY a valid JSON object that matches EXACTLY this schema:

{
  "issues": {
    "CRITICAL": string[],
    "MAJOR": string[],
    "MINOR": string[],
    "NIT": string[]
  }
}

Rules:
- Output must start with { and end with }.
- No markdown, no prose, no code fences, no commentary.
- No extra top-level keys. No extra keys inside "issues".
- Arrays must contain ONLY strings (no objects).
- DO NOT embed JSON inside strings. DO NOT double-encode.
- If there are zero findings, all arrays must be empty.

Issue string format (exact):
"filepath:LINE - description (what/why + risk)"
- LINE must be an integer; use 0 if unknown.
- One issue per line item. No duplicates.

Example (format only):
{"issues":{"CRITICAL":[],"MAJOR":["src/a.ts:12 - Missing auth check allows IDOR (data exposure)"],"MINOR":[],"NIT":[]}}`;

const AGENT_CONFIGS = {
  security: {
    name: 'Security',
    systemPrompt: `
${SHARED_CONTRACT}

ROLE:
You are a SECURITY code reviewer. Find exploitable or high-risk security issues introduced by the change.

PRIORITY FINDINGS:
1) AuthN/AuthZ: IDOR, privilege escalation, missing checks, tenant bypass
2) Injection: SQL/NoSQL/command/template, SSRF, request smuggling
3) Secrets: tokens/keys in code/logs, sensitive data exposure
4) Unsafe deserialization, path traversal, unsafe file ops
5) Crypto misuse (weak primitives, bad randomness, insecure modes)
6) CSRF/CORS misconfig for sensitive endpoints
7) Rate limiting missing on sensitive actions (only if relevant)

SEVERITY:
- CRITICAL: likely exploit, auth bypass, RCE, credential/data exfil
- MAJOR: meaningful risk with conditions/mitigations
- MINOR: defense-in-depth
- NIT: clarity/hardening polish

If you are about to output anything other than the JSON object, delete it and output only the JSON object.

Return JSON ONLY per contract.
`.trim(),
  },
  logic: {
    name: 'Logic',
    systemPrompt: `
${SHARED_CONTRACT}

ROLE:
You are a LOGIC/BUG reviewer. Find correctness issues and failure modes caused by the change.

CHECKS:
- Null/undefined guards, incorrect defaults, type mismatches
- Async: missing await, unhandled rejection, race, retry storms
- Error handling gaps: swallowed errors, wrong fallback, missing timeout usage
- Parsing/serialization edge cases, off-by-one, incorrect conditionals
- State bugs: mutation, cache invalidation, shared references

SEVERITY:
- CRITICAL: crash, data loss/corruption, infinite loop/retry, security-relevant bug
- MAJOR: wrong results, broken flow, common edge-case failures
- MINOR: rare edge cases, confusing behavior
- NIT: simplifications/readability

If you are about to output anything other than the JSON object, delete it and output only the JSON object.

Return JSON ONLY per contract.
`.trim(),
  },
  quality: {
    name: 'Quality',
    systemPrompt: `
${SHARED_CONTRACT}

ROLE:
You are a CODE QUALITY & PERFORMANCE reviewer. Focus on maintainability and efficiency.

CHECKS:
- Complexity, duplication, unclear responsibilities, hard-to-test design
- Perf: unnecessary work in hot paths, N+1, excessive allocations
- Resource leaks: timers/listeners/handles, missing cleanup
- Ergonomics: confusing naming, missing docs where behavior is non-obvious
- Consistency only when it reduces defect risk

SEVERITY:
- CRITICAL: severe perf regression or unmaintainable change likely to break
- MAJOR: clear design risk or meaningful perf concern
- MINOR: small refactors, clarity improvements
- NIT: optional polish

If you are about to output anything other than the JSON object, delete it and output only the JSON object.

Return JSON ONLY per contract.
`.trim(),
  },
};

const USER_MESSAGE_TEMPLATE = `TASK:
Review ONLY the provided CODE_CHANGE_CONTEXT. Identify REAL issues only.

SCOPE:
- Prefer changed lines.
- Mention unchanged code ONLY if the change makes it newly risky or broken.

LINE NUMBERS:
- If diff line numbers exist (e.g., @@ ... +c,d @@), use them.
- Otherwise use LINE = 0.

INPUT:
<<<CODE_CHANGE_CONTEXT
{context}
CODE_CHANGE_CONTEXT>>>`;

function createClient(apiKey) {
  const options = { apiKey, baseURL: BASE_URL };
  if (TIMEOUT_MS) {
    options.timeout = TIMEOUT_MS;
  }
  return new OpenAI(options);
}

async function callWithRetry(client, messages, hooks = {}) {
  let lastError;
  const retries = MAX_RETRIES;

  for (let i = 0; i <= retries; i++) {
    hooks.onAttempt?.({ attempt: i + 1, maxAttempts: retries + 1 });
    try {
      const response = await client.chat.completions.create({
        model: MODEL,
        messages,
        temperature: 0,
        max_tokens: 4000,
      });
      return response;
    } catch (error) {
      lastError = error;
      if (i < retries) {
        const delayMs = 1000 * (i + 1);
        hooks.onRetry?.({ delayMs, error });
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }
  throw lastError;
}

function cleanNestedJsonIssues(issues) {
  const cleaned = {
    CRITICAL: [],
    MAJOR: [],
    MINOR: [],
    NIT: [],
  };

  for (const [key, items] of Object.entries(issues)) {
    if (!Array.isArray(items)) continue;

    for (const item of items) {
      if (typeof item !== 'string') {
        continue;
      }

      if (item.startsWith('{') && item.includes('"issues"')) {
        try {
          const nested = JSON.parse(item);
          if (nested.issues) {
            for (const [nKey, nItems] of Object.entries(nested.issues)) {
              if (Array.isArray(nItems)) {
                for (const nItem of nItems) {
                  if (typeof nItem === 'string' && (nItem.includes(':') || nItem.includes(' - '))) {
                    cleaned[nKey]?.push(nItem);
                  }
                }
              }
            }
          }
        } catch {
          cleaned[key].push(item);
        }
      } else {
        cleaned[key].push(item);
      }
    }
  }

  return cleaned;
}

function convertNonStandardFormat(issues) {
  const converted = {
    CRITICAL: [],
    MAJOR: [],
    MINOR: [],
    NIT: [],
  };

  for (const [key, items] of Object.entries(issues)) {
    if (!Array.isArray(items)) continue;

    for (const item of items) {
      if (typeof item === 'object' && item !== null) {
        const desc = item.description || item.message || JSON.stringify(item);
        const file = item.file || item.filename || 'unknown';
        const line = item.line || item.lineNumber || 0;
        const severity = (item.severity || item.type || 'MINOR').toUpperCase();

        let formatted = `${file}:${line} - ${desc}`;
        if (line === 0) {
          formatted = `${file} - ${desc}`;
        }

        if (severity === 'CRITICAL' || severity === 'HIGH') {
          converted.CRITICAL.push(formatted);
        } else if (severity === 'MAJOR' || severity === 'MEDIUM') {
          converted.MAJOR.push(formatted);
        } else if (severity === 'MINOR' || severity === 'LOW') {
          converted.MINOR.push(formatted);
        } else {
          converted.NIT.push(formatted);
        }
      } else if (typeof item === 'string') {
        const cleanedItem = item.replace(/\\"/g, '"').replace(/^"+|"+$/g, '');
        if (cleanedItem.startsWith('{') && cleanedItem.includes('issues')) {
          try {
            const nested = JSON.parse(cleanedItem);
            if (nested.issues) {
              const nestedConverted = convertNonStandardFormat(nested.issues);
              for (const [nKey, nItems] of Object.entries(nestedConverted)) {
                converted[nKey].push(...nItems);
              }
            } else {
              converted[key].push(item);
            }
          } catch {
            converted[key].push(item);
          }
        } else if (item.includes(':') || item.includes(' - ')) {
          converted[key].push(item);
        }
      }
    }
  }

  return converted;
}

function convertArrayToIssues(items) {
  const issues = {
    CRITICAL: [],
    MAJOR: [],
    MINOR: [],
    NIT: [],
  };

  for (const item of items) {
    if (typeof item === 'object' && item !== null) {
      const desc = item.description || item.message || item.issue || JSON.stringify(item);
      const file = item.file || item.filename || 'unknown';
      const line = item.line || item.lineNumber || 0;
      const severity = (item.severity || item.type || item.level || 'MINOR').toUpperCase();

      let formatted = `${file}:${line} - ${desc}`;
      if (line === 0) {
        formatted = `${file} - ${desc}`;
      }

      if (severity.includes('CRITICAL') || severity.includes('HIGH')) {
        issues.CRITICAL.push(formatted);
      } else if (severity.includes('MAJOR') || severity.includes('MEDIUM')) {
        issues.MAJOR.push(formatted);
      } else if (severity.includes('MINOR') || severity.includes('LOW')) {
        issues.MINOR.push(formatted);
      } else {
        issues.NIT.push(formatted);
      }
    } else if (typeof item === 'string' && (item.includes(':') || item.includes(' - '))) {
      issues.MINOR.push(item);
    }
  }

  return issues;
}

function parseIssuesJson(reviewText) {
  const result = { valid: false, issues: null, error: null };

  if (!reviewText || typeof reviewText !== 'string') {
    result.error = 'No response text';
    return result;
  }

  let jsonStr = reviewText.trim();

  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  const objMatch = jsonStr.match(/\{[\s\S]*\}/);
  const arrMatch = jsonStr.match(/\[[\s\S]*\]/);

  if (objMatch) {
    jsonStr = objMatch[0];
  } else if (arrMatch) {
    jsonStr = arrMatch[0];
  }

  if (!jsonStr.startsWith('{') && !jsonStr.startsWith('[')) {
    const fallback = parseIssuesLegacy(reviewText);
    if (fallback.valid) {
      return fallback;
    }
    const rawFallback = parseIssuesRaw(reviewText);
    if (rawFallback.valid) {
      return rawFallback;
    }
    result.error = 'Response does not start with JSON object or array';
    return result;
  }

  try {
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      const fallback = parseIssuesLegacy(reviewText);
      if (fallback.valid) return fallback;
      const rawFallback = parseIssuesRaw(reviewText);
      if (rawFallback.valid) return rawFallback;
      throw new Error('Could not parse JSON');
    }

    let issuesData =
      parsed.issues ||
      parsed.findings ||
      parsed.vulnerabilities ||
      parsed.bugs ||
      parsed.results ||
      (Array.isArray(parsed) ? { CRITICAL: parsed } : {});

    if (typeof issuesData === 'string') {
      try {
        issuesData = JSON.parse(issuesData);
      } catch {
        issuesData = {};
      }
    }

    if (!issuesData || typeof issuesData !== 'object') {
      if (parsed.summary && !issuesData) {
        return {
          valid: true,
          issues: { CRITICAL: [], MAJOR: [], MINOR: [], NIT: [] },
        };
      }
      result.error = 'Missing issues object';
      return result;
    }

    let issues;

    if (Array.isArray(issuesData)) {
      issues = convertArrayToIssues(issuesData);
    } else {
      issues = {
        CRITICAL: Array.isArray(issuesData.CRITICAL) ? issuesData.CRITICAL : [],
        MAJOR: Array.isArray(issuesData.MAJOR) ? issuesData.MAJOR : [],
        MINOR: Array.isArray(issuesData.MINOR) ? issuesData.MINOR : [],
        NIT: Array.isArray(issuesData.NIT) ? issuesData.NIT : [],
      };
    }

    if (
      issues.CRITICAL.length === 0 &&
      issues.MAJOR.length === 0 &&
      issues.MINOR.length === 0 &&
      issues.NIT.length === 0
    ) {
      if (Array.isArray(issuesData)) {
        for (const item of issuesData) {
          const sev = (item.severity || item.type || item.level || 'MINOR').toUpperCase();
          const desc = item.description || item.message || item.issue || JSON.stringify(item);
          const file = item.file || item.filename || 'unknown';
          const line = item.line || item.lineNumber || 0;
          const formatted = line > 0 ? `${file}:${line} - ${desc}` : `${file} - ${desc}`;

          if (sev.includes('CRITICAL') || sev.includes('HIGH')) {
            issues.CRITICAL.push(formatted);
          } else if (sev.includes('MAJOR') || sev.includes('MEDIUM')) {
            issues.MAJOR.push(formatted);
          } else if (sev.includes('MINOR') || sev.includes('LOW')) {
            issues.MINOR.push(formatted);
          } else {
            issues.NIT.push(formatted);
          }
        }
      }
    }

    for (const key of Object.keys(issues)) {
      if (!Array.isArray(issues[key])) {
        issues[key] = [];
      } else {
        issues[key] = issues[key].filter(item => {
          if (typeof item !== 'string') return false;
          return item.includes(':') || item.includes(' - ');
        });
      }
    }

    let cleaned = cleanNestedJsonIssues(issues);

    const hasObjectsOrJson = Object.values(cleaned).some(arr =>
      arr.some(
        item => typeof item === 'object' || (typeof item === 'string' && item.startsWith('{'))
      )
    );

    if (hasObjectsOrJson) {
      cleaned = convertNonStandardFormat(cleaned);
    }

    result.valid = true;
    result.issues = cleaned;
    return result;
  } catch (e) {
    const fallback = parseIssuesLegacy(reviewText);
    if (fallback.valid) {
      return fallback;
    }
    const rawFallback = parseIssuesRaw(reviewText);
    if (rawFallback.valid) {
      return rawFallback;
    }
    result.error = `Invalid JSON: ${e.message}`;
    return result;
  }
}

function parseIssuesRaw(reviewText) {
  const result = { valid: false, issues: null, error: null };

  const issues = {
    CRITICAL: [],
    MAJOR: [],
    MINOR: [],
    NIT: [],
  };

  const lines = reviewText.split('\n');
  let currentSeverity = null;

  const severityKeywords = {
    critical: 'CRITICAL',
    high: 'CRITICAL',
    major: 'MAJOR',
    medium: 'MAJOR',
    minor: 'MINOR',
    low: 'MINOR',
    nit: 'NIT',
    info: 'NIT',
    warning: 'MINOR',
    error: 'MAJOR',
  };

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    for (const [keyword, severity] of Object.entries(severityKeywords)) {
      if (
        lowerLine.includes(keyword) &&
        (lowerLine.includes('issue') ||
          lowerLine.includes('problem') ||
          lowerLine.includes('bug') ||
          lowerLine.includes('vulnerability') ||
          lowerLine.includes('error'))
      ) {
        currentSeverity = severity;
        break;
      }
    }

    if (currentSeverity && line.match(/^[\s\-*]+/) && line.includes(':')) {
      const issueText = line.replace(/^[\s\-*]+/, '').trim();
      if (issueText && issueText.length > 5) {
        issues[currentSeverity].push(issueText);
      }
    }

    const fileLineMatch = line.match(/^[\s\-*]*([a-zA-Z0-9_\-./]+:\d+)/);
    if (fileLineMatch && currentSeverity) {
      issues[currentSeverity].push(fileLineMatch[1]);
    }
  }

  const total =
    issues.CRITICAL.length + issues.MAJOR.length + issues.MINOR.length + issues.NIT.length;

  if (total > 0) {
    result.valid = true;
    result.issues = issues;
  } else {
    result.error = 'No issues found in raw text';
  }

  return result;
}

function parseIssuesLegacy(reviewText) {
  const result = { valid: false, issues: null, error: null };

  const issues = {
    CRITICAL: [],
    MAJOR: [],
    MINOR: [],
    NIT: [],
  };

  const categoryMap = {
    '🔴 CRITICAL': 'CRITICAL',
    '🟠 MAJOR': 'MAJOR',
    '🟡 MINOR': 'MINOR',
    '🔵 NIT': 'NIT',
    CRITICAL: 'CRITICAL',
    MAJOR: 'MAJOR',
    MINOR: 'MINOR',
    NIT: 'NIT',
  };

  const lines = reviewText.split('\n');
  let currentCategory = null;

  for (const line of lines) {
    for (const [emoji, category] of Object.entries(categoryMap)) {
      if (line.includes(emoji)) {
        currentCategory = category;
        break;
      }
    }

    if (currentCategory && line.includes('- ')) {
      const issueText = line.replace(/^-\s*/, '').trim();
      if (issueText && issueText.includes(':')) {
        issues[currentCategory].push(issueText);
      }
    }
  }

  const total =
    issues.CRITICAL.length + issues.MAJOR.length + issues.MINOR.length + issues.NIT.length;

  if (total > 0) {
    result.valid = true;
    result.issues = issues;
  } else {
    result.error = 'No issues found in legacy parse';
  }

  return result;
}

async function runAgent(client, agentKey, context, hooks = {}) {
  const config = AGENT_CONFIGS[agentKey];

  const userMessage = USER_MESSAGE_TEMPLATE.replace('{context}', context);

  const messages = [
    { role: 'system', content: config.systemPrompt },
    {
      role: 'user',
      content: userMessage,
    },
  ];

  const response = await callWithRetry(client, messages, {
    onAttempt: opts => hooks.onAttempt?.({ ...opts, agent: config.name }),
    onRetry: opts => hooks.onRetry?.({ ...opts, agent: config.name }),
  });

  const raw = response.choices[0].message.content || '';

  if (process.env.NULLAR_AI_DEBUG !== '0') {
    console.error(`[DEBUG][${config.name}] Raw response:`, raw.substring(0, 500));
  }

  const parseResult = parseIssuesJson(raw);

  if (!parseResult.valid) {
    hooks.onError?.({ agent: config.name, error: parseResult.error });
    return { agent: config.name, issues: null, error: parseResult.error };
  }

  return { agent: config.name, issues: parseResult.issues, raw };
}

function mergeIssues(results) {
  const merged = {
    CRITICAL: [],
    MAJOR: [],
    MINOR: [],
    NIT: [],
  };

  const seen = new Set();

  for (const result of results) {
    if (!result.issues) continue;

    for (const [severity, issues] of Object.entries(result.issues)) {
      for (const issue of issues) {
        const key = issue.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          merged[severity].push(`[${result.agent}] ${issue}`);
        }
      }
    }
  }

  return merged;
}

export async function runParallelAgents(context, apiKey, hooks = {}) {
  if (process.env.MOCK_MODE === 'true') {
    return {
      issues: {
        CRITICAL: ['[Security] src/auth.js:42 - Hardcoded API key found'],
        MAJOR: ['[Logic] src/utils.js:15 - Missing null check on user object'],
        MINOR: ['[Quality] src/components/Button.jsx:8 - Consider extracting magic number'],
        NIT: ['[Quality] Consider adding JSDoc to function'],
      },
      agentsRan: ['Security', 'Logic', 'Quality'],
      wasTruncated: false,
    };
  }

  const client = createClient(apiKey);
  const agentKeys = ['security', 'logic', 'quality'];

  const agentPromises = agentKeys.map(agentKey =>
    runAgent(client, agentKey, context, hooks).catch(error => ({
      agent: AGENT_CONFIGS[agentKey].name,
      issues: null,
      error: String(error?.message ?? error),
    }))
  );

  hooks.onProgress?.('Starting 3 parallel agents...');

  const results = await Promise.all(agentPromises);

  const successful = results.filter(r => r.issues !== null);
  const failed = results.filter(r => r.issues === null);

  if (failed.length > 0) {
    hooks.onError?.({
      agents: failed.map(f => ({ agent: f.agent, error: f.error })),
    });
  }

  const merged = mergeIssues(results);

  return {
    issues: merged,
    agentsRan: successful.map(r => r.agent),
    failedAgents: failed.map(r => r.agent),
    wasTruncated: false,
  };
}
