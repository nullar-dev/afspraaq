/**
 * NullarAI - Static Analyzers Integration
 * Runs linters in parallel for deterministic security/quality checks
 */

import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const TOOL_CONFIGS = [
  {
    name: 'ESLint',
    cmd: 'npx',
    args: files => ['eslint', '--no-error-on-unmatched-pattern', '-f', 'unix', ...files],
    severity: 'MAJOR',
    check: output => output.includes(':') && !output.includes('Warning:'),
  },
  {
    name: 'Ruff',
    cmd: 'ruff',
    args: files => ['check', '--output-format=unix', ...files],
    severity: 'MAJOR',
    check: () => true,
  },
  {
    name: 'ShellCheck',
    cmd: 'shellcheck',
    args: files => files.filter(f => f.endsWith('.sh')),
    severity: 'MAJOR',
    check: () => true,
  },
];

async function runTool(tool, files) {
  if (files.length === 0) return [];

  const args = tool.args(files);
  if (!args || args.length === 0) return [];

  try {
    const { stdout, stderr } = await execFileAsync(tool.cmd, args, {
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
    });

    const output = stdout + stderr;
    if (!output.trim()) return [];

    const issues = [];
    const lines = output.split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;
      if (!tool.check(line)) continue;

      const match = line.match(/^(.+?):(\d+):(\d+)?[:\s]+(.+)/);
      if (match) {
        const [, file, lineNum, , message] = match;
        issues.push({
          tool: tool.name,
          file: file.includes('/') ? file.split('/').pop() : file,
          line: parseInt(lineNum, 10),
          message: message.trim(),
          severity: tool.severity,
        });
      } else if (line.includes(':') && !line.includes('Warning')) {
        const parts = line.split(':');
        const file = parts[0] || 'unknown';
        const lineNum = parseInt(parts[1], 10) || 1;
        const message = parts.slice(2).join(':').trim();
        if (message) {
          issues.push({
            tool: tool.name,
            file: file.includes('/') ? file.split('/').pop() : file,
            line: lineNum,
            message,
            severity: tool.severity,
          });
        }
      }
    }

    return issues.slice(0, 20);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    if (error.stdout) {
      const issues = [];
      const lines = error.stdout.split('\n');
      for (const line of lines) {
        const match = line.match(/^(.+?):(\d+):(.+)/);
        if (match) {
          issues.push({
            tool: tool.name,
            file: match[1],
            line: parseInt(match[2], 10),
            message: match[3].trim(),
            severity: tool.severity,
          });
        }
      }
      return issues.slice(0, 20);
    }
    return [];
  }
}

function categorizeFiles(files) {
  const categories = {
    js: files.filter(f => f.endsWith('.js') || f.endsWith('.mjs')),
    ts: files.filter(f => f.endsWith('.ts')),
    tsx: files.filter(f => f.endsWith('.tsx')),
    py: files.filter(f => f.endsWith('.py')),
    sh: files.filter(f => f.endsWith('.sh')),
  };
  return categories;
}

export async function runStaticAnalyzers(changedFiles = []) {
  if (changedFiles.length === 0) {
    return [];
  }

  const categories = categorizeFiles(changedFiles);
  const tools = [];

  if (categories.js.length > 0 || categories.ts.length > 0 || categories.tsx.length > 0) {
    tools.push(runTool(TOOL_CONFIGS[0], [...categories.js, ...categories.ts, ...categories.tsx]));
  }

  if (categories.py.length > 0) {
    tools.push(runTool(TOOL_CONFIGS[1], categories.py));
  }

  if (categories.sh.length > 0) {
    tools.push(runTool(TOOL_CONFIGS[2], categories.sh));
  }

  const results = await Promise.all(tools);
  return results.flat();
}
