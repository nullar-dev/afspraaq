/**
 * NullarAI - State Machine
 */

export function countIssues(issues) {
  return issues.CRITICAL.length + issues.MAJOR.length + issues.MINOR.length + issues.NIT.length;
}
