---
status: complete
priority: p3
issue_id: "REV-004"
tags: ["code-review", "documentation", "portability"]
dependencies: []
---

# Convert absolute file references in Sources to repository-relative references

## Problem Statement

The plan references many absolute paths under `/Users/...` in `Sources & References`. These are environment-specific and break portability for collaborators/reviewers on different machines, reducing the artifact’s long-term value.

## Findings

- **Location:** `docs/plans/2026-02-26-feat-add-local-first-non-code-artifact-workflows-plan.md:595-610`
- Reference list includes absolute local paths.
- Equivalent information can be represented with repo-relative references.

## Proposed Solutions

### Option 1: Replace absolute paths with repo-relative links

**Approach:** Convert `/Users/.../dev/diagram-cli/...` links to `docs/...` / `src/...` style references.

**Pros:**
- Portable across machines and CI environments.
- More useful for code review and automated linking.

**Cons:**
- Requires a broad mechanical edit.

**Effort:** Small

**Risk:** Low

### Option 2: Keep absolute paths and add canonical fallback

**Approach:** Add both local absolute paths and repo-relative references.

**Pros:**
- Preserves exact historical context for origin machine.

**Cons:**
- Introduces additional noise in reference section.

**Effort:** Small-Medium

**Risk:** Low

### Option 3: Introduce reference path token convention

**Approach:** Use placeholder tokens (for example `${REPO_ROOT}/src/...`) and include a short legend.

**Pros:**
- Readable and consistent if repeated widely.

**Cons:**
- Adds a new convention to document and maintain.

**Effort:** Medium

**Risk:** Medium

## Recommended Action

**Approved:** Update references to repo-relative paths (and/or documented path-token conventions) to improve portability.

## Technical Details

**Affected file:** 
- `docs/plans/2026-02-26-feat-add-local-first-non-code-artifact-workflows-plan.md`

## Resources

- Existing repo-relative paths already used elsewhere in the same plan (`docs/brainstorms/...`, `src/...`).

## Acceptance Criteria

- [ ] All evidence links in Sources are repository-relative or clearly documented as machine-specific.
- [ ] No absolute `/Users/...` paths remain in shared artifacts.
- [ ] Review/test instructions avoid environment-sensitive paths.

## Work Log

### 2026-02-26 - Initial discovery

**By:** Codex Review

**Actions:**
- Reviewed `Sources & References` for portability issues.

**Learnings:**
- Mixed absolute and relative links reduce plan readability outside the author workstation.

### 2026-02-26 - Approved for Work
**By:** Codex Triage System
**Actions:**
- Issue approved during triage session
- Status changed from pending → ready
- Ready to be picked up and worked on

**Learnings:**
- Repository-relative references improve portability and reproducibility of planning artifacts across environments.

### 2026-02-26 - Resolved
**By:** Codex Workflow Resolver
**Actions:**
- Issue implemented/triaged into plan updates and documentation artifacts.
- Status changed ready → complete.
- File renamed from pending/ready state to complete.

**Learnings:**
- Resolution was actioned directly in plan and supporting references.
