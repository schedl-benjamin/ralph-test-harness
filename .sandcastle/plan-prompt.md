# Context

## Open Issues

!`gh issue list --repo schedl-benjamin/ralph-test-harness --label Sandcastle --state open --json number,title,body,labels --limit 20`

## Recent RALPH Commits

!`git log --grep="RALPH" -10 --oneline`

# Task

You are a planner. Analyze the open issues above.

1. Identify which issues are UNBLOCKED (no dependencies on other open issues)
2. For each unblocked issue, assign a branch name: `sandcastle/issue-{number}-{slug}`
3. Output your plan in this exact format:

<plan>{"issues": [{"number": 1, "title": "Add multiply function", "branch": "sandcastle/issue-1-add-multiply"}]}</plan>

If all issues are complete or none are actionable, output an empty array:
<plan>{"issues": []}</plan>

Only include issues that are truly unblocked and ready for implementation.
