/**
 * NullarAI - Context Collector
 * Grep-based context expansion for deep code review
 */

import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const CONTEXT_LINES = 12;
const USAGE_CONTEXT_LINES = 8;
const MAX_CONTEXT_CHARS = parseInt(process.env.NULLAR_MAX_CONTEXT_CHARS, 10) || 150000;
const MAX_USAGES = 50;
const MAX_BUFFER = 50 * 1024 * 1024;

function execGitGrep(pattern, options = {}) {
  try {
    const args = ['grep', '-n', '-I', pattern, '--'];
    if (options.files) {
      args.push(...options.files);
    } else {
      args.push('.');
    }
    return execFileSync('git', args, {
      encoding: 'utf-8',
      maxBuffer: MAX_BUFFER,
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: options.cwd || process.cwd(),
    });
  } catch {
    return null;
  }
}

function extractSymbolsFromDiff(diff) {
  const symbols = {
    functions: new Set(),
    classes: new Set(),
    imports: new Set(),
    exports: new Set(),
  };

  const functionPattern =
    /^[+-]\s*(?:async\s+)?(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?(?:\(|=>)|(\w+)\s*\([^)]*\)\s*(?:\{|=>))/gm;
  const classPattern = /^[+-]\s*class\s+(\w+)(?:\s+extends\s+\w+)?\s*\{/g;
  const importPattern = /^[+-]\s*import\s+(?:{[^}]+}|[\w]+)\s+from\s+['"]([^'"]+)['"]/g;
  const exportPattern = /^[+-]\s*export\s+(?:default\s+)?(?:function|const|let|var|class)\s+(\w+)/g;

  let match;
  while ((match = functionPattern.exec(diff)) !== null) {
    const name = match[1] || match[2] || match[3];
    if (name && name.length > 2) {
      symbols.functions.add(name);
    }
  }

  while ((match = classPattern.exec(diff)) !== null) {
    if (match[1]) symbols.classes.add(match[1]);
  }

  while ((match = importPattern.exec(diff)) !== null) {
    if (match[1]) symbols.imports.add(match[1]);
  }

  while ((match = exportPattern.exec(diff)) !== null) {
    if (match[1]) symbols.exports.add(match[1]);
  }

  return {
    functions: [...symbols.functions],
    classes: [...symbols.classes],
    imports: [...symbols.imports],
    exports: [...symbols.exports],
  };
}

function getChangedFiles(diff) {
  const files = new Set();
  const filePattern = /^[+-]{3}\s+[ab]\/(.+)/gm;
  let match;

  while ((match = filePattern.exec(diff)) !== null) {
    files.add(match[1]);
  }

  return [...files];
}

function getFileContext(filePath, lineNumbers, contextLines = CONTEXT_LINES) {
  try {
    const fullPath = resolve(process.cwd(), filePath);
    const content = readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');

    const relevantLines = [];
    const neededLines = new Set();

    for (const lineNum of lineNumbers) {
      const start = Math.max(0, lineNum - contextLines - 1);
      const end = Math.min(lines.length, lineNum + contextLines);
      for (let i = start; i < end; i++) {
        neededLines.add(i);
      }
    }

    const sortedLines = [...neededLines].sort((a, b) => a - b);

    for (const lineIdx of sortedLines) {
      relevantLines.push(`${lineIdx + 1}: ${lines[lineIdx]}`);
    }

    return relevantLines.join('\n');
  } catch {
    return '';
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findUsages(symbols) {
  const usages = {};

  for (const func of symbols.functions) {
    if (func.length < 3) continue;
    const escaped = escapeRegex(func);
    const result = execGitGrep(`\\b${escaped}\\b`);
    if (result) {
      const lines = result.split('\n').filter(l => l.trim());
      const fileLines = {};
      for (const line of lines) {
        const match = line.match(/^(.+?):(\d+):/);
        if (match) {
          const file = match[1];
          const lineNum = parseInt(match[2], 10);
          if (!fileLines[file]) fileLines[file] = [];
          fileLines[file].push(lineNum);
        }
      }
      usages[func] = fileLines;
    }
  }

  for (const cls of symbols.classes) {
    if (cls.length < 3) continue;
    const escaped = escapeRegex(cls);
    const result = execGitGrep(`\\b${escaped}\\b`);
    if (result) {
      const lines = result.split('\n').filter(l => l.trim());
      const fileLines = {};
      for (const line of lines) {
        const match = line.match(/^(.+?):(\d+):/);
        if (match) {
          const file = match[1];
          const lineNum = parseInt(match[2], 10);
          if (!fileLines[file]) fileLines[file] = [];
          fileLines[file].push(lineNum);
        }
      }
      usages[cls] = fileLines;
    }
  }

  return usages;
}

function buildExpandedContext(diff, maxContextChars = MAX_CONTEXT_CHARS) {
  const symbols = extractSymbolsFromDiff(diff);
  const changedFiles = getChangedFiles(diff);

  let context = `## DIFF (Original)\n${diff}\n\n`;

  if (symbols.functions.length === 0 && symbols.classes.length === 0) {
    return { context, symbols, changedFiles, usages: {} };
  }

  const usages = findUsages(symbols);
  let contextChars = context.length;

  context += `## EXPANDED CONTEXT\n`;
  context += `Symbols found in diff: functions: ${symbols.functions.join(', ')}, classes: ${symbols.classes.join(', ')}\n\n`;

  let usageCount = 0;
  for (const [symbol, files] of Object.entries(usages)) {
    if (contextChars > maxContextChars) break;

    for (const [file, lines] of Object.entries(files)) {
      if (contextChars > maxContextChars) break;
      if (usageCount > MAX_USAGES) break;

      const fileContext = getFileContext(file, lines, USAGE_CONTEXT_LINES);
      if (fileContext) {
        const addedContent = `### ${symbol} used in ${file}\n\`\`\`\n${fileContext}\n\`\`\`\n\n`;
        context += addedContent;
        contextChars += addedContent.length;
        usageCount++;
      }
    }
  }

  if (usageCount === 0) {
    context += `(No usages found or context limit reached)\n`;
  }

  return { context, symbols, changedFiles, usages };
}

export function collectReviewContext(diff) {
  const { context, symbols, changedFiles, usages } = buildExpandedContext(diff);

  return {
    diff,
    context,
    symbols,
    changedFiles,
    usages,
    summary: {
      functionsFound: symbols.functions.length,
      classesFound: symbols.classes.length,
      filesChanged: changedFiles.length,
      usagesFound: Object.keys(usages).length,
    },
  };
}
