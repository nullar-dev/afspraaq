#!/usr/bin/env node

/**
 * AI Code Reviewer using MiniMax M2.5
 *
 * USAGE:
 *   node scripts/ai-code-reviewer.js [commit-range]
 *
 * ENVIRONMENT VARIABLES:
 *   MINIMAX_API_KEY   - Your MiniMax API key (required)
 *
 * SETUP (permanent):
 *
 *   1. Get your API key from:
 *      https://platform.minimaxi.com/user-center/basic-information/interface-key
 *
 *   2. Add to your shell profile (~/.bashrc or ~/.zshrc):
 *      export MINIMAX_API_KEY="your-api-key-here"
 *
 *   3. Reload your shell:
 *      source ~/.bashrc    # or source ~/.zshrc
 *
 *   4. Verify:
 *      echo $MINIMAX_API_KEY
 *
 *   5. Test:
 *      node scripts/ai-code-reviewer.js
 *
 * RUNNING WITH PRE-PUSH HOOK:
 *   The hook (.githooks/pre-push) will automatically run this script
 *   when you git push. It will prompt you to run the review.
 *
 * OUTPUT FORMAT:
 *   Issues are sorted by severity:
 *   🔴 CRITICAL - Security vulnerabilities, auth bypass, data leaks
 *   🟠 MAJOR     - Bugs, crashes, breaking changes
 *   🟡 MINOR     - Code smells, performance issues
 *   🔵 NIT       - Style preferences, minor suggestions
 */

import { execSync } from 'child_process';
import { OpenAI } from 'openai';

const OPENAI_MINIMAX_KEY = process.env.MINIMAX_API_KEY;
const MODEL = 'MiniMax-M2.5';
const BASE_URL = 'https://api.minimax.io/v1';

function getGitDiff(commitRange) {
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
      return execSync('git diff --no-color', { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
    } catch {
      return '';
    }
  }
}

async function callMiniMaxAI(diff, systemPrompt) {
  const client = new OpenAI({
    apiKey: OPENAI_MINIMAX_KEY,
    baseURL: BASE_URL,
  });

  const truncatedDiff =
    diff.length > 60000 ? diff.slice(0, 60000) + '\n\n[... diff truncated ...]' : diff;

  const prompt = `${systemPrompt}

Here is the code diff to review:
\`\`\`diff
${truncatedDiff}
\`\`\`

Provide your review in EXACTLY this format (no extra text):

## Issues Found

🔴 CRITICAL (X)
[Only list actual security vulnerabilities, data leaks, auth bypasses, injection vulnerabilities, etc.]
- FILE_PATH:LINE: Description of issue

🟠 MAJOR (X)
[Only list bugs, crashes, data corruption, breaking changes, missing error handling]
- FILE_PATH:LINE: Description of issue

🟡 MINOR (X)
[Code smells, minor performance issues, inconsistent patterns]
- FILE_PATH:LINE: Description of issue

🔵 NIT (X)
[Style preferences, minor suggestions]
- FILE_PATH:LINE: Description of issue

## Summary
Total: X issues

If no issues found in a category, write:
🔴 CRITICAL (0)
[No critical issues found]

etc.`;

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You are an expert code reviewer. Always output in the exact format specified. Do not add any preamble or postamble. Be strict about severity levels.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.3,
  });

  return response.choices[0].message.content;
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

function countIssues(issues) {
  return issues.CRITICAL.length + issues.MAJOR.length + issues.MINOR.length + issues.NIT.length;
}

function displayIssues(issues) {
  console.log('\n');
  console.log('='.repeat(80));
  console.log('🔴 CRITICAL (' + issues.CRITICAL.length + ')');
  console.log('='.repeat(80));
  if (issues.CRITICAL.length === 0) {
    console.log('[No critical issues found]');
  } else {
    for (const issue of issues.CRITICAL) {
      console.log(issue);
    }
  }

  console.log('\n');
  console.log('='.repeat(80));
  console.log('🟠 MAJOR (' + issues.MAJOR.length + ')');
  console.log('='.repeat(80));
  if (issues.MAJOR.length === 0) {
    console.log('[No major issues found]');
  } else {
    for (const issue of issues.MAJOR) {
      console.log(issue);
    }
  }

  console.log('\n');
  console.log('='.repeat(80));
  console.log('🟡 MINOR (' + issues.MINOR.length + ')');
  console.log('='.repeat(80));
  if (issues.MINOR.length === 0) {
    console.log('[No minor issues found]');
  } else {
    for (const issue of issues.MINOR) {
      console.log(issue);
    }
  }

  console.log('\n');
  console.log('='.repeat(80));
  console.log('🔵 NIT (' + issues.NIT.length + ')');
  console.log('='.repeat(80));
  if (issues.NIT.length === 0) {
    console.log('[No nit issues found]');
  } else {
    for (const issue of issues.NIT) {
      console.log(issue);
    }
  }

  console.log('\n');
  console.log('='.repeat(80));
  const total = countIssues(issues);
  console.log('## Total: ' + total + ' issues');
  console.log('='.repeat(80));
}

async function main() {
  const args = process.argv.slice(2);
  const commitRange = args[0] || null;

  if (!OPENAI_MINIMAX_KEY) {
    console.error('MINIMAX_API_KEY environment variable is not set');
    console.error('');
    console.error('To set up:');
    console.error(
      '  1. Get your API key from: https://platform.minimaxi.com/user-center/basic-information/interface-key'
    );
    console.error('  2. Add to ~/.bashrc or ~/.zshrc:');
    console.error('     export MINIMAX_API_KEY="your-api-key-here"');
    console.error('  3. Reload: source ~/.bashrc');
    process.exit(1);
  }

  const diff = getGitDiff(commitRange);

  if (!diff || diff.trim() === '') {
    console.log('No changes to review.');
    process.exit(0);
  }

  const systemPrompt = `You are an expert code reviewer reviewing code changes in a TypeScript/React/Next.js project.
Analyze the diff for:
1. Security vulnerabilities (injection, auth bypass, data leaks, etc.)
2. Bugs and logic errors
3. Missing error handling
4. Performance issues
5. Code quality and best practices
6. TypeScript type safety issues

For each issue, provide:
- The file path
- The approximate line number (from the diff hunk)
- A brief description

Be strict about severity classification:
- CRITICAL: Security vulnerabilities, auth issues, data corruption risks
- MAJOR: Bugs, crashes, breaking changes, missing validations
- MINOR: Code smells, performance suggestions, style issues
- NIT: Minor suggestions, preferences`;

  const review = await callMiniMaxAI(diff, systemPrompt);
  const issues = parseIssues(review);

  console.log(review);

  displayIssues(issues);

  const total = countIssues(issues);
  process.exit(total > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(2);
});
