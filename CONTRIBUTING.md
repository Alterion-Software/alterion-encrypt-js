# Contributing to alterion-encrypt (JS)

Thanks for your interest in contributing. This is a security-critical package — the bar is high and the rules are firm. Read this in full before opening anything.

---

## Before you start

Open an issue first. Describe the problem or the change you want to make and wait for a maintainer to respond before writing any code. PRs opened without a linked issue will be closed without review.

---

## What we want

- Genuine bug fixes with a clear root cause identified
- Security improvements with a well-reasoned rationale
- Performance improvements that are measurable and don't compromise correctness
- Missing test coverage for existing documented behaviour
- Platform compatibility fixes (Node version support, bundler compatibility, etc.)

---

## What we do not want

**Do not open a PR for:**

- Fixing a typo, adding a full stop, or rewording a sentence in the README or docs — these are not contributions
- Adding your name, handle, or social link anywhere in the repo
- Reformatting code you did not otherwise change
- Bumping dependency versions without an accompanying security advisory or breakage reason
- Renaming things for personal preference
- Anything described as "cleaning up" or "improving readability" without a functional change

PRs of this kind waste reviewer time and will be closed immediately. Repeat offenders will be blocked.

---

## No slop

Do not submit AI-generated code.

This means: if you used an AI assistant to write or refactor any part of your submission, you are responsible for having read every line, understood what it does, verified it is correct, and being able to explain it in review. Submitting output you do not understand is not a contribution — it is noise that creates security risk in a package that handles cryptographic material.

If a reviewer asks you to explain a change and you cannot, the PR will be closed.

---

## Standards

- All code must compile with `tsc --noEmit` and pass `npm run build` with no errors
- Every exported function you add or modify must have a JSDoc comment
- Do not introduce new dependencies without a strong justification discussed in the issue first
- Wire format and public API changes must stay in sync with [alterion-encrypt (Rust)](https://github.com/Alterion-Software/alterion-encrypt) — breaking changes require a discussion before any PR is raised

---

## Pull request process

1. Fork the repository and create a branch from `main`
2. Name your branch clearly: `fix/hmac-verify`, `feat/node-compat`, etc.
3. Fill out every section of [PR_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md) — incomplete templates will be closed
4. Link the issue your PR resolves in the template header
5. Complete the checklist at the bottom of the template before requesting review

Maintainers review on their own schedule. Do not ping, bump, or reopen closed PRs.

---

## Security vulnerabilities

Do not open a public issue or PR for a security vulnerability. Email the maintainers directly. You will receive a response within 72 hours.

---

## License

By submitting a pull request you agree that your contribution will be licensed under the GNU General Public License v3.0 and that you have the right to make that contribution.
