# Conventional Commits Hook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reject local Git commit messages that do not follow Conventional Commits while preserving the existing staged-file checks.

**Architecture:** Keep `.husky/pre-commit` responsible for `lint-staged`. Add Commitlint as a development dependency, an ESM configuration extending the conventional preset, and a separate `.husky/commit-msg` hook that validates Git's commit-message file.

**Tech Stack:** Husky 9, Commitlint, npm, Node.js ESM

**Spec:** User request from 2026-09-20 and repository conventions in `AGENTS.md`

## Global Constraints

- Preserve `.husky/pre-commit` and its `npx lint-staged` command.
- Use Conventional Commits types supplied by `@commitlint/config-conventional`, including `feat`, `fix`, `docs`, `test`, `refactor`, and `ci`.
- Do not modify unrelated repository files.
- Update both `package.json` and `package-lock.json` through npm.

## Review Focus

- A valid message such as `feat: add interview timer` exits successfully.
- A message without a type, such as `add interview timer`, is rejected.
- An unsupported type, such as `feature: add timer`, is rejected.
- A scoped message, such as `fix(auth): handle expired token`, is accepted.
- The hook forwards Git's message-file path safely, including paths containing spaces.

---

### Task 1: Enforce Conventional Commit Messages

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `commitlint.config.js`
- Create: `.husky/commit-msg`
- Preserve: `.husky/pre-commit`
- Test: Commitlint CLI checks against temporary message files

**Interfaces:**
- Consumes: Git's commit-message filepath as `.husky/commit-msg` argument `$1`
- Produces: exit code `0` for conventional messages and a nonzero exit code for invalid messages

- [ ] **Step 1: Record the baseline failure**

Run:

```bash
npx --no -- commitlint --version
```

Expected: FAIL because Commitlint is not installed locally.

- [ ] **Step 2: Install Commitlint dependencies**

Run:

```bash
npm install --save-dev @commitlint/cli @commitlint/config-conventional
```

Expected: `package.json` and `package-lock.json` include both packages under `devDependencies`.

- [ ] **Step 3: Add the ESM Commitlint configuration**

Create `commitlint.config.js` with:

```js
export default {
  extends: ['@commitlint/config-conventional'],
}
```

- [ ] **Step 4: Add the commit-message hook**

Create `.husky/commit-msg` with:

```sh
npx --no -- commitlint --edit "$1"
```

- [ ] **Step 5: Make the hook executable**

Run:

```bash
chmod +x .husky/commit-msg
```

Expected: `test -x .husky/commit-msg` exits `0`.

- [ ] **Step 6: Verify valid messages pass**

Run:

```bash
printf '%s\n' 'feat: add interview timer' | npx --no -- commitlint
printf '%s\n' 'fix(auth): handle expired token' | npx --no -- commitlint
```

Expected: both commands exit `0` with no errors.

- [ ] **Step 7: Verify invalid messages fail**

Run each command and confirm a nonzero exit code:

```bash
printf '%s\n' 'add interview timer' | npx --no -- commitlint
printf '%s\n' 'feature: add timer' | npx --no -- commitlint
```

Expected: Commitlint reports missing or invalid `type`/`subject` rules.

- [ ] **Step 8: Verify hook filepath handling**

Run:

```bash
message_file="$(mktemp --suffix=' commit message')"
printf '%s\n' 'docs: explain commit rules' > "$message_file"
.husky/commit-msg "$message_file"
```

Expected: the hook exits `0`, proving `"$1"` is quoted correctly.

- [ ] **Step 9: Run repository quality gates**

Run:

```bash
npm run lint
npm run format:check
npm run typecheck
npm run build
```

Expected: every command exits `0`.

- [ ] **Step 10: Review the final diff**

Run:

```bash
git diff -- package.json package-lock.json commitlint.config.js .husky/commit-msg .husky/pre-commit
```

Expected: only dependency metadata, Commitlint configuration, and the new hook changed; `.husky/pre-commit` remains unchanged.

- [ ] **Step 11: Commit the setup**

```bash
git add package.json package-lock.json commitlint.config.js .husky/commit-msg
git commit -m "chore: enforce conventional commits"
```
