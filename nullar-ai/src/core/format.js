/**
 * NullarAI - Output Formatter
 */

import { countIssues as count } from './issue-utils.js';

export function formatIssues(issues) {
  const lines = [];

  lines.push('\n' + '='.repeat(80));
  lines.push('🔴 CRITICAL (' + issues.CRITICAL.length + ')');
  lines.push('='.repeat(80));
  if (issues.CRITICAL.length === 0) {
    lines.push('[No critical issues found]');
  } else {
    for (const issue of issues.CRITICAL) {
      lines.push(issue);
    }
  }

  lines.push('\n' + '='.repeat(80));
  lines.push('🟠 MAJOR (' + issues.MAJOR.length + ')');
  lines.push('='.repeat(80));
  if (issues.MAJOR.length === 0) {
    lines.push('[No major issues found]');
  } else {
    for (const issue of issues.MAJOR) {
      lines.push(issue);
    }
  }

  lines.push('\n' + '='.repeat(80));
  lines.push('🟡 MINOR (' + issues.MINOR.length + ')');
  lines.push('='.repeat(80));
  if (issues.MINOR.length === 0) {
    lines.push('[No minor issues found]');
  } else {
    for (const issue of issues.MINOR) {
      lines.push(issue);
    }
  }

  lines.push('\n' + '='.repeat(80));
  lines.push('🔵 NIT (' + issues.NIT.length + ')');
  lines.push('='.repeat(80));
  if (issues.NIT.length === 0) {
    lines.push('[No nit issues found]');
  } else {
    for (const issue of issues.NIT) {
      lines.push(issue);
    }
  }

  const total = count(issues);

  lines.push('\n' + '='.repeat(80));
  lines.push('## Total: ' + total + ' issues');
  lines.push('='.repeat(80));

  return lines.join('\n');
}
