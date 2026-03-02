/**
 * NullarAI - State Machine
 */

export const ReviewState = {
  AWAITING_RUN_DECISION: 'awaiting_run_decision',
  RUNNING_REVIEW: 'running_review',
  AWAITING_RERUN_DECISION: 'awaiting_rerun_decision',
  AWAITING_PUSH_ANYWAY_DECISION: 'awaiting_push_anyway_decision',
  READY_TO_PUSH: 'ready_to_push',
  BLOCKED: 'blocked',
  FAILED: 'failed',
};

export function countIssues(issues) {
  return issues.CRITICAL.length + issues.MAJOR.length + issues.MINOR.length + issues.NIT.length;
}
