/**
 * NullarAI - MiniMax Client
 */

import { OpenAI } from 'openai';

const MODEL = process.env.MINIMAX_MODEL || 'MiniMax-M2.5';
const BASE_URL = process.env.MINIMAX_BASE_URL || 'https://api.minimax.io/v1';
const TIMEOUT_MS = parseInt(process.env.MINIMAX_TIMEOUT_MS, 10) || 30000;
const MAX_RETRIES = parseInt(process.env.MINIMAX_MAX_RETRIES, 10) || 2;
const MAX_DIFF_SIZE = parseInt(process.env.MINIMAX_MAX_DIFF_SIZE, 10) || 60000;

function mockReview() {
  return {
    raw: `## Issues Found

🔴 CRITICAL (1)
- src/cli/run.mjs:29: Missing API key validation before running review

🟠 MAJOR (1)
- src/cli/run.mjs:44: Async function without proper error handling

🟡 MINOR (1)
- Consider adding more detailed logging

🔵 NIT (1)
- Could use constants for color codes

## Summary
Total: 4 issues`,
    issues: {
      CRITICAL: ['src/cli/run.mjs:29: Missing API key validation before running review'],
      MAJOR: ['src/cli/run.mjs:44: Async function without proper error handling'],
      MINOR: ['Consider adding more detailed logging'],
      NIT: ['Could use constants for color codes'],
    },
  };
}

async function callWithRetry(fn, retries = MAX_RETRIES) {
  let lastError;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < retries) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      }
    }
  }
  throw lastError;
}

export async function callMiniMaxReview(diff, apiKey) {
  if (process.env.MOCK_MODE === 'true') {
    return mockReview();
  }

  let truncatedDiff = diff;
  let wasTruncated = false;

  if (diff.length > MAX_DIFF_SIZE) {
    truncatedDiff = diff.slice(0, MAX_DIFF_SIZE) + '\n\n[... diff truncated ...]';
    wasTruncated = true;
  }

  const systemPrompt = `You are an expert code reviewer reviewing code changes in a TypeScript/React/Next.js project.
Analyze the diff for:
1. Security vulnerabilities (injection, auth bypass, data leaks, etc.)
2. Bugs and logic errors
3. Missing error handling
4. Performance issues
5. Code quality and best practices
6. TypeScript type safety issues

Be strict about severity classification:
- CRITICAL: Security vulnerabilities, auth issues, data corruption risks
- MAJOR: Bugs, crashes, breaking changes, missing validations
- MINOR: Code smells, performance suggestions, style issues
- NIT: Minor suggestions, preferences

CRITICAL REQUIREMENT: You MUST respond with valid JSON in this exact format. Do not include any other text.
{
  "issues": {
    "CRITICAL": ["file:line: description"],
    "MAJOR": ["file:line: description"],
    "MINOR": ["file:line: description"],
    "NIT": ["file:line: description"]
  },
  "summary": "Brief summary of findings"
}`;

  const prompt = `${systemPrompt}

Here is the code diff to review:
\`\`\`diff
${truncatedDiff}
\`\`\``;

  const client = new OpenAI({
    apiKey,
    baseURL: BASE_URL,
    timeout: TIMEOUT_MS,
  });

  const response = await callWithRetry(async () => {
    return await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are an expert code reviewer. Output ONLY valid JSON - no explanations, no markdown, no text before or after. Start your response with { and end with }. Format: {"issues":{"CRITICAL":[],"MAJOR":[],"MINOR":[],"NIT":[]},"summary":"..."}',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
    });
  });

  const raw = response.choices[0].message.content || '';
  const parseResult = parseIssuesJson(raw);

  if (!parseResult.valid) {
    throw new Error(`Failed to parse review response: ${parseResult.error}`);
  }

  return { raw, issues: parseResult.issues, wasTruncated };
}

function parseIssuesJson(reviewText) {
  const result = {
    valid: false,
    issues: null,
    error: null,
  };

  let jsonStr = reviewText.trim();

  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1];
  }

  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  try {
    const parsed = JSON.parse(jsonStr);

    if (!parsed.issues || typeof parsed.issues !== 'object') {
      result.error = 'Missing issues object';
      return result;
    }

    const issues = {
      CRITICAL: Array.isArray(parsed.issues.CRITICAL) ? parsed.issues.CRITICAL : [],
      MAJOR: Array.isArray(parsed.issues.MAJOR) ? parsed.issues.MAJOR : [],
      MINOR: Array.isArray(parsed.issues.MINOR) ? parsed.issues.MINOR : [],
      NIT: Array.isArray(parsed.issues.NIT) ? parsed.issues.NIT : [],
    };

    for (const key of Object.keys(issues)) {
      issues[key] = issues[key].filter(item => typeof item === 'string' && item.includes(':'));
    }

    result.valid = true;
    result.issues = issues;
    return result;
  } catch {
    const fallback = parseIssuesLegacy(reviewText);
    if (fallback.valid) {
      return fallback;
    }
    result.error = 'Invalid JSON and fallback parser failed';
    return result;
  }
}

function parseIssuesLegacy(reviewText) {
  const result = {
    valid: false,
    issues: null,
    error: null,
  };

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
