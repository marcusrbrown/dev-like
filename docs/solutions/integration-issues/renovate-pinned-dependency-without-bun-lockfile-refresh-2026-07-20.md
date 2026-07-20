---
title: "Renovate pinned a dependency without refreshing the Bun lockfile"
date: 2026-07-20
category: integration-issues
module: dev-like
problem_type: integration_issue
component: tooling
severity: medium
symptoms:
  - "Renovate PR pinned @changesets/cli in package.json only, leaving bun.lock stale"
  - "CI validate job failed: bun install --frozen-lockfile → 'lockfile had changes, but lockfile is frozen'"
  - "The failing validate check blocked the PR from auto-merging under strict branch protection"
  - "Other Renovate PRs with matching lockfiles auto-merged fine, masking the config gap"
root_cause: incomplete_setup
resolution_type: dependency_update
tags: [renovate, bun, lockfile, frozen-lockfile, ci, automation]
related_components: [renovate, bun, ci]
---

# Renovate pinned a dependency without refreshing the Bun lockfile

## Problem

Self-hosted Renovate updated `package.json` for this Bun project without regenerating
`bun.lock`, creating package/lock drift. The CI `validate` job runs
`bun install --frozen-lockfile`, so the drift hard-failed the Renovate PR and — under strict
branch protection — blocked it from auto-merging.

## Symptoms

The `validate` check failed with:

```text
bun install v1.3.14
error: lockfile had changes, but lockfile is frozen
note: try re-running without --frozen-lockfile and commit the updated lockfile
##[error]Process completed with exit code 1.
```

- The failure was on a Renovate "pin dependencies" PR that changed **only** `package.json`
  (`@changesets/cli` `^2.29.7` → `2.31.1`), with no `bun.lock` change.
- Because `validate` is a required status check, strict branch protection correctly refused to
  auto-merge the PR.
- **Misleading signal:** other Renovate PRs in the same batch (non-major updates) had matching
  lockfiles and auto-merged cleanly — making this look like a one-off PR problem rather than a
  Bun-manager config gap.

## What Didn't Work

Re-running CI as-is does nothing: the lockfile mismatch is real, so `--frozen-lockfile` keeps
failing. There is no transient/flaky element to retry away.

## Solution

Hand-sync the lockfile on the Renovate branch so `package.json` and `bun.lock` agree again:

```bash
git checkout -B renovate/pin-dependencies origin/renovate/pin-dependencies
bun install                 # → "Saved lockfile" (regenerates bun.lock to match package.json)
bun install --frozen-lockfile   # verify → "Checked N installs ... (no changes)"
git add bun.lock
git commit -m "chore: update bun.lock for pinned @changesets/cli"
git push origin renovate/pin-dependencies
```

The `validate` check then re-ran green. This is a **per-PR hand-fix**; the durable fix belongs
upstream in the shared Renovate config (see Prevention).

## Why This Works

`bun install --frozen-lockfile` is designed to fail on *any* `package.json` ↔ lockfile drift —
that's the point in CI (reproducible installs). Running plain `bun install` regenerates
`bun.lock` to match the pinned `package.json`, removing the drift; Bun then confirms a clean
install under frozen mode ("no changes").

## Prevention

- **Durable fix lives in the shared Renovate infra, not in this repo.** For Bun-manager repos,
  Renovate must refresh the lockfile after a version bump — enable Bun lockfile updating /
  `lockFileMaintenance`, or run `bun install` as a post-upgrade step. This belongs in
  `bfra-me/.github`'s reusable Renovate workflow or the `marcusrbrown/renovate-config` preset,
  which drive Renovate for every repo — fixing it there prevents the drift for all of them.
- **Keep the guardrail.** Strict `--frozen-lockfile` CI plus required-check branch protection is
  exactly what caught the drift before it merged. Do not relax frozen-install to "just make the
  PR pass" — that would let inconsistent lockfiles land on `main`.

## Related Issues

- `docs/solutions/best-practices/bun-changesets-oidc-release-pipeline-2026-07-11.md` — the
  release-pipeline learning that already documents the `bun install --frozen-lockfile` invariant
  (prove zero `bun.lock` diff). This doc is the Renovate-automation angle of the same invariant.
- Issue #41 (Renovate "Dependency Dashboard") — the self-hosted Renovate surface for this repo.
