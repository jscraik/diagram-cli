# Pull request checklist

## Summary

- What changed (brief):
- Why this change was needed:
- Risk and rollback plan:

## Checklist

- [ ] I did not push directly to `main`; this PR is from a dedicated branch.
- [ ] Branch name follows policy (`codex/*` for agent-created branches).
- [ ] Required local gates run: `npm test`, `npm run test:deep`, `npm run harness:check`.
- [ ] Greptile review completed and findings handled (or explicitly waived).
- [ ] Greptile review was performed by an independent reviewer (not the coding agent).
- [ ] Greptile confidence score is `>= 4/5` for merge eligibility.
- [ ] Codex review completed and findings handled (or explicitly waived).
- [ ] Merge is blocked until all required checks pass.
- [ ] I will delete branch/worktree after merge.

## Testing

- verification_commands: list exact commands run here
- verification_outcomes: record pass/fail/blocked for each command here
- blocked_steps_reason: none if all planned steps ran
- Command: `npm test` -> pass/fail
- Command: `npm run test:deep` -> pass/fail
- Command: `npm run harness:check` -> pass/fail
- Any other command(s):

## Review artifacts

- Greptile: <link / artifact path / comment ID>
- Greptile confidence score: <0-5>
- Independent reviewer evidence: <reviewer + link>
- Codex: <link / artifact path / comment ID>
- Additional evidence (if any):

## Notes

Add one-paragraph merge rationale here.
