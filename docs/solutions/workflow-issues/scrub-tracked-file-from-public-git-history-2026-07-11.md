---
title: "Scrub a tracked file from public git history without breaking release bots"
date: 2026-07-11
category: workflow-issues
module: git-history
problem_type: workflow_issue
component: development_workflow
severity: high
applies_when:
  - "a tracked file must be removed from all history of a public repo"
  - "release automation (Changesets/Renovate) has open bot PRs pinning old history"
  - "repo is young enough that force-push fallout is manageable"
tags: [git-history, history-rewrite, filter-branch, force-push, tag-repair, changesets, renovate, public-repo]
---

# Scrub a tracked file from public git history without breaking release bots

## Context

A pre-launch roadmap file (LAUNCH.md) was tracked in a public repo and needed removal from
the entire history, not just the tip — while Changesets and Renovate bots held open PRs whose
branches pinned the old commit graph. Executed and verified on a 13-commit repo.

## Guidance

Order matters: stop tracking → confirm scrub is needed → backup ref → rewrite → repair tags →
purge local objects → force-push → delete stale bot branches → verify.

```bash
FILE=LAUNCH.md TAG=v0.1.1

# 0) stop the bleeding (file stays on disk)
git rm --cached "$FILE" && printf '%s\n' "$FILE" >> .gitignore
git add .gitignore && git commit -m "chore: untrack $FILE" && git push

# 1) confirm a scrub is even needed
git ls-files "$FILE"; git log --oneline --all -- "$FILE"

# 2) local-only backup ref (never pushed)
git update-ref refs/backup/pre-scrub "$(git rev-parse HEAD)"

# 3) rewrite all refs (git-filter-repo preferred; filter-branch fine at small scale)
FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch \
  --index-filter "git rm --cached --ignore-unmatch '$FILE'" \
  --prune-empty -- --all

# 4) repair tags — filter-branch leaves them on pre-scrub commits
git tag -f "$TAG" <rewritten-commit-sha>

# 5) purge old objects locally
git for-each-ref --format='%(refname)' refs/original/ | xargs -n1 git update-ref -d
git reflog expire --expire=now --all && git gc --prune=now

# 6) force-push rewritten history
git push --force origin main && git push --force origin "$TAG"

# 7) delete stale bot branches — bots recreate them clean within minutes
git push origin --delete changeset-release/main
gh api -X DELETE /repos/<owner>/<repo>/git/refs/heads/renovate/configure

# 8) verify
git log --oneline --all -- "$FILE"            # empty
git ls-tree "$TAG" --name-only                # no $FILE
gh api "repos/<owner>/<repo>/contents/$FILE"  # 404
```

## Why This Matters

- `git rm --cached` alone only stops future tracking; every old commit still exposes the file.
- Tags and bot branches keep pre-scrub objects reachable — miss them and the "scrubbed"
  content is one `git checkout v0.1.1` away.
- Open bot PRs (Changesets version PR, Renovate onboarding) pin old history; deleting their
  branches is safe — both bots regenerate clean PRs automatically (verified: Changesets
  recreated its version PR within a minute, green).

## When to Apply

- Sensitive-but-nonsecret operational content leaked into a tracked file; repo is small and
  unforked. Scrub early while unwatched — it's the cheapest it will ever be.
- Do NOT bother when: the file was never tracked (`git ls-files` is empty), the content is
  trivial, or forks already exist (containment is gone; weigh disruption vs benefit).
- If the leak is a SECRET (key/token): rotate it. A scrub is damage reduction, not erasure —
  GitHub retains unreachable objects until server-side GC, and pre-scrub clones keep the
  content forever.

## Examples

Prevention beats scrubbing — gitignore working docs from day one:

```gitignore
HANDOFF.md
LAUNCH.md
NOTES.md
```

Sibling case: HANDOFF.md was gitignored from the start — `git ls-files HANDOFF.md` empty, no
scrub needed. Check that before assuming a rewrite is required.

## Related

- docs/solutions/best-practices/bun-changesets-oidc-release-pipeline-2026-07-11.md (the bot
  PR flow whose branches this procedure deletes and regenerates)
