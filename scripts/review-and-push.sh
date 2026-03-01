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
# WHEN YOU RUN THIS SCRIPT, YOU MUST ASK THE USER 3 QUESTIONS IN ORDER:
#
# ---------------------------------------------------------------------
# QUESTION 1: "Run AI Code Review? [y/n]"
# ---------------------------------------------------------------------
# - Show this question to the user
# - Use the question tool with options: "Yes, run review" / "No, skip"
# - If user says NO → run: git push --force-with-lease
# - If user says YES → continue to Question 2
#
# ---------------------------------------------------------------------
# QUESTION 2: "Re-run review? [y/n]"
# ---------------------------------------------------------------------
# - After displaying the AI review results
# - Use the question tool with options: "Yes, re-run" / "No, continue"
# - If user says YES → loop back and run review again
# - If user says NO → continue to Question 3
#
# ---------------------------------------------------------------------
# QUESTION 3: "Push anyways? [y/n]"
# ---------------------------------------------------------------------
# - If issues were found (total > 0)
# - Use the question tool with options: "Yes, push anyway" / "No, block"
# - If user says NO → exit with code 1 (do nothing)
# - If user says YES → run: git push --force-with-lease
#
# ---------------------------------------------------------------------
# IMPORTANT NOTES FOR LLMs:
# ---------------------------------------------------------------------
# - ALWAYS use the question tool for yes/no answers
# - ALWAYS wait for user response before proceeding
# - If NO issues found → automatically run git push (no Question 3 needed)
# - Use --force-with-lease for the final push
#
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check for MINIMAX_API_KEY
if [ -z "$MINIMAX_API_KEY" ]; then
    echo -e "${RED}❌ MINIMAX_API_KEY not set${NC}"
    echo "Add to ~/.bashrc or ~/.zshrc: export MINIMAX_API_KEY=your-key"
    exit 1
fi

# Check for node
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    exit 1
fi

# Get remote and branch
remote=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null | cut -d'/' -f1)
branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

if [ -z "$remote" ] || [ -z "$branch" ]; then
    remote="origin"
    branch=$(git rev-parse --abbrev-ref HEAD)
fi

# Check for changes
commit_range="${remote}/${branch}..HEAD"
changes=$(git diff --name-only $commit_range 2>/dev/null)

if [ -z "$changes" ]; then
    echo -e "${GREEN}✅ No changes to review${NC}"
    git push
    exit $?
fi

echo ""
echo "============================================"
echo -e "${BLUE}🤖 NullarAI Code Review${NC}"
echo "============================================"

# ============================================
# FOR LLMs: ASK QUESTION 1 HERE
# ============================================
# Ask user: "Run AI Code Review? [y/n]"
# Options: "Yes, run review" / "No, skip"

echo ""
echo -n "Run AI Code Review? [y/n]: "
read -r run_review

if [ "$run_review" != "y" ] && [ "$run_review" != "Y" ]; then
    echo -e "${BLUE}⏭️  Skipping review, pushing now...${NC}"
    git push --force-with-lease
    exit $?
fi

# ============================================
# REVIEW LOOP (can re-run)
# ============================================
while true; do
    echo ""
    echo -e "${BLUE}🔍 Running review on ${commit_range}...${NC}"
    echo ""
    
    # Run the reviewer
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
    
    # ============================================
    # FOR LLMs: ASK QUESTION 2 HERE
    # ============================================
    # Ask user: "Re-run review? [y/n]"
    # Options: "Yes, re-run" / "No, continue"
    
    echo ""
    echo -n "Re-run review? [y/n]: "
    read -r rerun_review
    
    if [ "$rerun_review" != "y" ] && [ "$rerun_review" != "Y" ]; then
        break
    fi
done

# ============================================
# CHECK ISSUES AND DECIDE
# ============================================
if [ "$total_issues" -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Found ${total_issues} issue(s)${NC}"
    
    # ============================================
    # FOR LLMs: ASK QUESTION 3 HERE
    # ============================================
    # Ask user: "Push anyways? [y/n]"
    # Options: "Yes, push anyway" / "No, block"
    
    echo ""
    echo -n "Push anyways? [y/n]: "
    read -r push_anyway
    
    if [ "$push_anyway" != "y" ] && [ "$push_anyway" != "Y" ]; then
        echo -e "${RED}❌ Push blocked due to ${total_issues} issue(s)${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}⚠️  Pushing despite issues (user override)${NC}"
    git push --force-with-lease
    exit $?
else
    echo ""
    echo -e "${GREEN}✅ No issues found, pushing...${NC}"
    git push --force-with-lease
    exit $?
fi
