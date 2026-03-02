/**
 * NullarAI - MiniMax Client
 */

import { OpenAI } from 'openai';

const MODEL = 'MiniMax-M2.5';
const BASE_URL = 'https://api.minimax.io/v1';

export async function callMiniMaxReview(diff, apiKey) {
  const client = new OpenAI({
    apiKey,
    baseURL: BASE_URL,
  });

  const truncatedDiff =
    diff.length > 60000 ? diff.slice(0, 60000) + '\n\n[... diff truncated ...]' : diff;

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
- NIT: Minor suggestions, preferences`;

  const prompt = `${systemPrompt}

Here is the code diff to review:
\`\`\`diff
${truncatedDiff}
\`\`\`

Provide your review in EXACTLY this format (no extra text):

## Issues Found

🔴 CRITICAL (X)
- FILE_PATH:LINE: Description of issue

🟠 MAJOR (X)
- FILE_PATH:LINE: Description of issue

🟡 MINOR (X)
- FILE_PATH:LINE: Description of issue

🔵 NIT (X)
- FILE_PATH:LINE: Description of issue

## Summary
Total: X issues`;

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are an expert code reviewer. Always output in the exact format specified.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.3,
  });

  const raw = response.choices[0].message.content || '';
  const issues = parseIssues(raw);

  return { raw, issues };
}

function parseIssues(reviewText) {
  const issues = {
    CRITICAL: [],
    MAJOR: [],
    MINOR: [],
    NIT: [],
  };

  const lines = reviewText.split('\n');
  let currentCategory = null;

  for (const line of lines) {
    if (line.startsWith('🔴 CRITICAL')) {
      currentCategory = 'CRITICAL';
      continue;
    } else if (line.startsWith('🟠 MAJOR')) {
      currentCategory = 'MAJOR';
      continue;
    } else if (line.startsWith('🟡 MINOR')) {
      currentCategory = 'MINOR';
      continue;
    } else if (line.startsWith('🔵 NIT')) {
      currentCategory = 'NIT';
      continue;
    }

    if (currentCategory && line.startsWith('- ')) {
      const issueText = line.slice(2).trim();
      if (issueText && issueText.includes(':')) {
        issues[currentCategory].push(issueText);
      }
    }
  }

  return issues;
}
