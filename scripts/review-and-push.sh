#!/bin/bash

# =============================================================================
# AI CODE REVIEW PUSH SCRIPT
# =============================================================================
# PURPOSE: This script must be run INSTEAD of 'git push' to push code.
#          It runs an AI code review before pushing.
#
# FOR LLMs (including opencode): FOLLOW THESE INSTRUCTIONS EXACTLY
# =============================================================================
#
# USAGE:
#   ./scripts/review-and-push.sh              # Start fresh
#   ./scripts/review-and-push.sh run_review   # After user says "yes" to run
#   ./scripts/review-and-push.sh skip_review  # After user says "no" to skip
#   ./scripts/review-and-push.sh rerun        # After user says "yes" to rerun
#   ./scripts/review-and-push.sh continue     # After user says "no" to rerun (check issues)
#   ./scripts/review-and-push.sh push_anyway   # After user says "yes" to push anyway
#   ./scripts/review-and-push.sh block_push    # After user says "no" to push anyway
#
# OUTPUT MARKERS - The script outputs special markers that LLMs should detect:
#
# >>> ASK_USER_RUN_REVIEW <<<
#   - LLM must ask user: "Run AI Code Review? [y/n]"
#   - Use question tool with options: "Yes, run review" / "No, skip"
#   - If user says NO → run: ./scripts/review-and-push.sh skip_review
#   - If user says YES → run: ./scripts/review-and-push.sh run_review
#
# >>> REVIEW_COMPLETE <<<
#   - Review has finished, output follows
#   - LLM extracts issue count from output
#
# >>> ASK_USER_RERUN <<<
#   - LLM must ask user: "Re-run review? [y/n]"  
#   - Use question tool with options: "Yes, re-run" / "No, continue"
#   - If user says YES → run: ./scripts/review-and-push.sh rerun
#   - If user says NO → run: ./scripts/review-and-push.sh continue
#
# >>> ASK_USER_PUSH_ANYWAY <<<
#   - Issues were found (total > 0)
#   - LLM must ask user: "Push anyways? [y/n]"
#   - Use question tool with options: "Yes, push anyway" / "No, block"
#   - If user says NO → run: ./scripts/review-and-push.sh block_push
#   - If user says YES → run: ./scripts/review-and-push.sh push_anyway
#
# >>> PUSH_SUCCESS <<<
#   - Push was successful
#
# >>> PUSH_BLOCKED <<<
#   - Push was blocked (user said no)
#
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get remote and branch
get_remote_branch() {
    remote=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null | cut -d'/' -f1)
    branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
    if [ -z "$remote" ] || [ -z "$branch" ]; then
        remote="origin"
        branch=$(git rev-parse --abbrev-ref HEAD)
    fi
    commit_range="${remote}/${branch}..HEAD"
}

# Check for changes
check_changes() {
    get_remote_branch
    changes=$(git diff --name-only $commit_range 2>/dev/null)
    if [ -z "$changes" ]; then
        echo -e "${GREEN}✅ No changes to review${NC}"
        git push --force-with-lease
        echo ">>> PUSH_SUCCESS <<<"
        exit 0
    fi
}

# Check prerequisites
check_prereqs() {
    if [ -z "$MINIMAX_API_KEY" ]; then
        echo -e "${RED}❌ MINIMAX_API_KEY not set${NC}"
        exit 1
    fi
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js not found${NC}"
        exit 1
    fi
}

# ============================================
# COMMAND: run_review (user said YES to run)
# ============================================
cmd_run_review() {
    check_prereqs
    get_remote_branch
    
    echo ""
    echo "============================================"
    echo -e "${BLUE}🤖 NullarAI Code Review${NC}"
    echo "============================================"
    echo ""
    echo -e "${BLUE}🔍 Running review on ${commit_range}...${NC}"
    echo ""
    
    review_output=$(node scripts/ai-code-reviewer.js "$commit_range" 2>&1)
    
    echo "$review_output"
    
    # Extract issue count
    total_issues=0
    if echo "$review_output" | grep -qE "Total:[[:space:]]+[0-9]+"; then
        parsed=$(echo "$review_output" | grep -oE "Total:[[:space:]]+[0-9]+" | grep -oE "[0-9]+" | head -1)
        if [[ "$parsed" =~ ^[0-9]+$ ]]; then
            total_issues=$parsed
        fi
    fi
    
    echo ""
    echo ">>> REVIEW_COMPLETE <<<"
    echo ""
    echo ">>> ASK_USER_RERUN <<<"
    echo ""
    echo "Re-run review?"
}

# ============================================
# COMMAND: continue (user said NO to rerun)
# ============================================
cmd_continue() {
    get_remote_branch
    
    # Re-run review to get issue count (we need it)
    review_output=$(node scripts/ai-code-reviewer.js "$commit_range" 2>&1)
    
    # Extract issue count
    total_issues=0
    if echo "$review_output" | grep -qE "Total:[[:space:]]+[0-9]+"; then
        parsed=$(echo "$review_output" | grep -oE "Total:[[:space:]]+[0-9]+" | grep -oE "[0-9]+" | head -1)
        if [[ "$parsed" =~ ^[0-9]+$ ]]; then
            total_issues=$parsed
        fi
    fi
    
    if [ "$total_issues" -gt 0 ]; then
        echo ""
        echo -e "${YELLOW}⚠️  Found ${total_issues} issue(s)${NC}"
        echo ""
        echo ">>> ASK_USER_PUSH_ANYWAY <<<"
        echo ""
        echo "Push anyways?"
    else
        echo ""
        echo -e "${GREEN}✅ No issues found, pushing...${NC}"
        git push --force-with-lease
        echo ">>> PUSH_SUCCESS <<<"
    fi
}

# ============================================
# COMMAND: push_anyway (user said YES to push)
# ============================================
cmd_push_anyway() {
    echo -e "${YELLOW}⚠️  Pushing despite issues (user override)${NC}"
    git push --force-with-lease
    echo ">>> PUSH_SUCCESS <<<"
}

# ============================================
# COMMAND: block_push (user said NO)
# ============================================
cmd_block_push() {
    echo -e "${RED}❌ Push blocked by user${NC}"
    echo ">>> PUSH_BLOCKED <<<"
    exit 1
}

# ============================================
# COMMAND: skip_review (user said NO)
# ============================================
cmd_skip_review() {
    echo -e "${BLUE}⏭️  Skipping review, pushing now...${NC}"
    git push --force-with-lease
    echo ">>> PUSH_SUCCESS <<<"
}

# ============================================
# DEFAULT: Ask user to run review
# ============================================
check_prereqs
check_changes

echo ""
echo "============================================"
echo -e "${BLUE}🤖 NullarAI Code Review${NC}"
echo "============================================"

echo ""
echo ">>> ASK_USER_RUN_REVIEW <<<"
echo ""
echo "Run AI Code Review?"
