# Contributing Guide
```
Before creating a Pull Request, it's crucial to ensure your branch is in sync with the latest changes from the main `master` branch. This is critical.
```

This document describes the basic GitFlow and Pull Request (PR) process for this repository.

## Branching Model

- `master` is the main, protected branch.
- All work starts from `master` and goes into short‑lived feature branches.
- Name feature branches using the prefix `feature_`:
  - Examples: `feature_login-form`, `feature_perf-optimizations`, `feature_123-user-onboarding`.
- If you must fix production urgently, use `hotfix_` branches from `master` (e.g., `hotfix_crash-on-start`).

## Local Setup and Sync

1. Ensure your local `master` is up to date:
   ```bash
   git checkout master
   git pull --ff-only origin master
   ```
2. Create a new branch from `master`:
   ```bash
   git checkout -b feature_short-description
   ```

## Commit Guidelines

- Make small, focused commits; write clear messages (present tense, imperative mood).
- Reference related issues or tickets when applicable (e.g., `Refs #123`).
- Example formats:
  - `feat: add login form validation`
  - `fix: prevent crash on empty payload`
  - `chore: bump dependency versions`

## Keeping Your Branch Up To Date

- Regularly sync with `master` to minimize merge conflicts:
  ```bash
  git fetch origin
  git rebase origin/master
  # or, if you prefer merges in your local workflow:
  # git merge origin/master
  ```
- Resolve conflicts locally, and push updates:
  ```bash
  git push -f origin feature_short-description  # only if you rebased
  ```

## Pull Request (PR) Process

1. Update your branch with the latest `master` before opening a PR:
   ```bash
   git fetch origin
   git rebase origin/master
   # or, if you prefer merges in your local workflow:
   # git merge origin/master
   # push updates (force only if you rebased)
   git push -f origin feature_short-description
   ```
2. Push your branch to the remote (if not already pushed):
   ```bash
   git push origin feature_short-description
   ```
3. Open a PR with base = `master` and compare = your feature branch.
4. PR title: concise and descriptive (e.g., `Add login form validation`).
5. PR description should include:
   - What and why: a brief summary of the change and its motivation.
   - How: key implementation notes or trade‑offs.
   - Screenshots or GIFs for UI changes.
   - Links to related issues/tickets (e.g., `Closes #123`).
   - Risk/Impact and rollout notes (migrations, environment changes, etc.).
6. Checklist before requesting review:
   - [ ] Code builds and runs locally
   - [ ] No console errors or obvious regressions
   - [ ] Docs/README updated if needed
   - [ ] Feature flags/config updated if applicable
7. Request at least one reviewer. Address feedback with follow‑up commits.
8. Keep the history clean. Prefer squash on merge unless discussed otherwise.

## CI, Reviews, and Merging

- All CI checks must pass before merge.
- Reviews: address comments, resolve discussions, and re‑request review if needed.
- Merge strategy: **Squash and merge** into `master`.
- After merge:
  - Delete the source branch from the remote.
  - Sync local `master`:
    ```bash
    git checkout master
    git pull --ff-only origin master
    ```

## Hotfix Workflow (Optional)

For urgent production issues:

1. Branch from `master` using `hotfix_` prefix:
   ```bash
   git checkout master && git pull --ff-only
   git checkout -b hotfix_short-description
   ```
2. Implement the fix, add tests if applicable, and open a PR into `master`.
3. Use the same review and CI requirements. Squash and merge.

## Style and Documentation

- Follow the repository's existing code style and conventions.
- Update documentation or comments where it improves clarity.

## PR Size and Scope

- Keep PRs small and scoped to a single concern. Large PRs should be split.
- If a change is mechanical (e.g., renaming or formatting), separate it from behavior changes.

## Security and Secrets

- Never commit secrets, keys, or credentials. Use environment variables or secrets management.
- Rotate any leaked credentials immediately and notify maintainers.

---

Questions? Open an issue or start a discussion.


