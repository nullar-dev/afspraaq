#!/bin/bash

# =============================================================================
# 🚨 FOR LLM: READ THIS FIRST!
# =============================================================================
# When you run this script:
#   1. It will output markers like ">>> ASK_USER_RUN_REVIEW <<<"
#   2. When you see ANY marker starting with ">>> ASK_USER_":
#      - STOP - Do NOT try to pipe input
#      - Use the QUESTION TOOL to ask the user
#      - After user answers, re-run this script
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
        echo "Add to ~/.bashrc: export MINIMAX_API_KEY=your-key"
        exit 1
    fi
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js not found${NC}"
        exit 1
    fi
}

# Run the review
run_review() {
    get_remote_branch
    
    echo ""
    echo "============================================"
    echo -e "${BLUE}🤖 NullarAI Code Review${NC}"
    echo "============================================"
    echo ""
    echo -e "${BLUE}🔍 Running review on ${commit_range}...${NC}"
    echo ""
    echo ">>> REVIEW_IN_PROGRESS_DO_NOTHING <<<"
    echo "       >>> ⚠️ LLM: READ EVERYTHING:<<<"
    echo "████████████████████████████████████████"
    echo "   >>> 🚨 LLM: THE REVIEW IS RUNNING! <<<"
    echo "                                         "
    echo " >>> DO NOT RUN THIS SCRIPT AGAIN! <<<"
    echo "     >>> DO NOT RUN ANY COMMAND! <<<"
    echo " >>> JUST WAIT FOR OUTPUT TO APPEAR! <<<"
    echo ">>> YOU MUST DO NOTHING EVEN IF IT TAKES 1 HOUR! <<<"
    echo "                                         "
    echo " >>> WHEN REVIEW FINISHES YOU'LL SEE: <<<"
    echo "          '>>> REVIEW_DONE <<<'"
    echo "████████████████████████████████████████"
    
    review_output=$(node scripts/ai-code-reviewer.js "$commit_range" 2>&1)
    
    echo ""
    echo ">>> REVIEW_DONE <<<"
    echo ""
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
    
    if [ "$total_issues" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Found ${total_issues} issue(s)${NC}"
        echo ""
        echo ">>> ASK_USER_PUSH_ANYWAY <<<"
        echo ""
        echo "⚠️  LLM: USE THE QUESTION TOOL TO ASK USER!"
        echo "    Command: question tool"
        echo "    Question: 'Push anyways?'"
        echo "    Options: 'Yes' / 'No'"
        echo "    After user answers → re-run: ./scripts/review-and-push.sh"
        echo ""
        echo "Push anyways?"
    else
        echo ""
        echo ">>> ASK_USER_RERUN <<<"
        echo ""
        echo "⚠️  LLM: USE THE QUESTION TOOL TO ASK USER!"
        echo "    Command: question tool"
        echo "    Question: 'Re-run review?'"
        echo "    Options: 'Yes' / 'No'"
        echo "    After user answers → re-run: ./scripts/review-and-push.sh"
        echo ""
        echo "Re-run review?"
    fi
}

# Main
check_prereqs
check_changes

echo ""
echo "============================================"
echo -e "${BLUE}🤖 NullarAI Code Review${NC}"
echo "============================================"
echo ""
echo ">>> ASK_USER_RUN_REVIEW <<<"
echo ""
echo "⚠️  LLM: USE THE QUESTION TOOL TO ASK USER!"
echo "    Command: question tool"
echo "    Question: 'Do you want to run an AI Code Review before pushing?'"
echo "    Options: 'Yes' / 'No'"
echo "    After user answers → re-run: ./scripts/review-and-push.sh"
echo ""
echo "Run AI Code Review?"
