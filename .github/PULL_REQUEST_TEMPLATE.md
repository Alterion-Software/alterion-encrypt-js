# Pull Request: [PR Title / Feature Name]

**Branch:** `feature/your-branch` → `main`
**Date:** DD Month YYYY
**Author:** Your Name
**Reviewer:** <!-- leave blank -->
**Ticket:** [#000](https://link-to-issue)
**Labels:** `bug` `enhancement` `docs` `security`

---

## Summary

<!-- 2–4 sentences. What does this PR do and why? What problem does it solve? -->

---

## Changes

| File / Module | Summary of Changes |
|---|---|
| `src/example.ts` | Describe what changed and why |

---

## Detailed Change Notes

### `src/example.ts`

<!-- Describe what this file does and what changed. Include before/after snippets where helpful. -->

**Before:**
```ts
// old code
```

**After:**
```ts
// new code
```

---

## Bug / Failure Cascade *(if applicable)*

<!-- Use this table when the PR fixes a chain of related bugs. Delete if not applicable. -->

| # | Root Cause | File | Symptom / Impact |
|---|---|---|---|
| 1 | Describe the root cause | `file.ts` | What symptom it caused |

---

## Testing

### What was tested
- [ ] Manual test scenario
- [ ] Automated tests added or updated

### How to test this PR
1. `npm install && npm run build`
2. Describe the steps to verify the change

---

## Public API changes *(if applicable)*

<!-- Delete this section if no API changes were made. -->

| Function | Before | After | Notes |
|---|---|---|---|
| `buildRequestPacket` | old signature | new signature | reason |

---

## Wire format compatibility

<!-- Does this change affect the wire format? If yes, is it in sync with alterion-encrypt (Rust)? -->

- [ ] No wire format changes
- [ ] Wire format change — confirmed in sync with [alterion-encrypt (Rust)](https://github.com/Alterion-Software/alterion-encrypt)

---

## Notes & Risks

<!-- Any risks, edge cases, or follow-up work to be aware of. -->

---

## Checklist

- [ ] Branch targets `main` (not a personal or stale branch)
- [ ] `npm run build` passes with no errors
- [ ] All exported additions/changes have JSDoc comments
- [ ] No new dependencies added without issue discussion
- [ ] Wire format stays in sync with the Rust crate (if applicable)
- [ ] PR description is complete — no placeholder sections left unfilled

---

## Sign-off

I have read [CONTRIBUTING.md](../CONTRIBUTING.md), understand the change I am submitting, and can explain every line of code in this PR if asked.
