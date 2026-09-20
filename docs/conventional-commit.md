# Conventional Commits Guide

This repository uses Commitlint and Husky to validate commit messages automatically. The `pre-commit` hook runs `lint-staged`, while the `commit-msg` hook rejects messages that do not follow Conventional Commits.

## Message Format

```text
<type>(<scope>): <subject>

[body]

[footer]
```

The `scope` is optional. Keep the `subject` concise, describe the intent of the change, and keep the complete header within 100 characters.

Examples:

```text
feat(interview): add countdown timer
fix(auth): clear session after unauthorized response
docs: explain frontend architecture
ci: run format check on pull requests
```

## Accepted Commit Types

| Type       | Use it for                                                 |
| ---------- | ---------------------------------------------------------- |
| `feat`     | A user-visible feature.                                    |
| `fix`      | A bug fix.                                                 |
| `refactor` | A structural change that adds no feature and fixes no bug. |
| `perf`     | A performance improvement.                                 |
| `docs`     | Documentation-only changes.                                |
| `test`     | Adding or updating tests.                                  |
| `style`    | Formatting changes that do not affect behavior.            |
| `build`    | Build-system or dependency changes.                        |
| `ci`       | CI/CD workflow changes.                                    |
| `chore`    | Maintenance work that does not fit another category.       |
| `revert`   | Reverting an earlier commit.                               |

Prefer scopes that identify the affected domain or area, such as `auth`, `interview`, `ui`, `routing`, or `deps`.

## Breaking Changes

Add `!` after the type or scope and explain the impact in the footer:

```text
feat(api)!: rename interview response fields

BREAKING CHANGE: clients must read `questionList` instead of `questions`.
```

## Invalid Messages

```text
add login page
feature: add login page
feat:
```

These messages respectively omit the type, use an unsupported type, or omit the subject.

## Validation and Troubleshooting

Commit normally and let Husky run the checks:

```bash
git commit -m "feat(profile): add avatar upload"
```

To validate a message manually, run:

```bash
printf '%s\n' 'fix(auth): handle expired token' | npx commitlint
```

If hooks do not run after cloning the repository, install dependencies and initialize Husky again:

```bash
npm ci
npm run prepare
```

Do not use `--no-verify` to bypass hooks during normal development. Correct the message according to the Commitlint error and commit again.
