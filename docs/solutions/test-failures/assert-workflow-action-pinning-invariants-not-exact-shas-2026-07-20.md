---
title: "Assert workflow action-pinning invariants, not exact SHAs"
date: 2026-07-20
category: test-failures
module: docs-site
problem_type: test_failure
component: testing_framework
symptoms:
  - "The Site workflow failed on main after Renovate updated actions/checkout from v6.0.3 to v6.1.0"
  - "The workflow remained securely pinned, but its contract test expected the previous commit SHA"
  - "The failed post-merge test skipped deployment and left the live site on the prior commit"
root_cause: logic_error
resolution_type: test_fix
severity: medium
tags: [site-workflow, renovate, github-actions, sha-pinning, test-invariants, deployment]
---

# Assert workflow action-pinning invariants, not exact SHAs

## Problem

The docs-site workflow contract test hardcoded the exact commit SHA expected for each GitHub
Action. Renovate PR [#44](https://github.com/marcusrbrown/dev-like/pull/44) correctly updated
`actions/checkout` from v6.0.3 to v6.1.0, so `.github/workflows/site.yaml` remained pinned to a
full commit SHA but `docs/tests/site-workflow.test.ts` rejected the new value.

The test ran in the post-merge Site workflow rather than a required pull-request check. PR #44
therefore merged with its required checks green, then the Site build failed and deployment was
skipped. The live site stayed healthy but frozen on the previous deployment.

## Symptoms

- The workflow used `actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803 # v6.1.0`.
- The test still expected `df4cb1c069e1874edd31b4311f1884172cec0e10` from v6.0.3.
- The docs suite reported 88 passing tests and one failure.
- Site deployment did not run because its build job failed first.

## What Didn't Work

Updating the expected SHA would only move the failure to the next Renovate action bump. Re-running
the workflow could not help because the assertion was deterministically wrong.

The test encoded a dependency value that Renovate owns instead of the security property the
repository actually requires.

## Solution

PR [#47](https://github.com/marcusrbrown/dev-like/pull/47) replaced the per-action SHA constants
with one convention check over every `uses:` line:

```ts
const usesLines = text.match(/^\s*uses:\s*.*$/gm) ?? []
const pinnedUsesLine = /^\s*uses:\s*[\w./-]+@[0-9a-f]{40}\s+#\s*v\d[\w.-]*\s*$/

expect(usesLines.length).toBeGreaterThan(0)
for (const line of usesLines) {
  expect(line).toMatch(pinnedUsesLine)
}
```

This accepts a Renovate-managed version bump only when the action still uses a full 40-character
commit SHA and carries a human-readable version comment. Mutable references such as `@v4`,
`@main`, branches, and short hashes still fail.

The docs suite then passed 89/89 tests. The Site workflow rebuilt and deployed successfully, and
the expected new registry content was verified on the live site.

## Why This Works

The test now asserts the stable security invariant rather than the current values satisfying it.
Renovate can change a dependency's version and pinned SHA without weakening the guarantee, while
any change to a mutable reference remains a regression.

This follows the same design principle as synthetic test fixtures: tests should model the
behavioral boundary they protect, not couple themselves to evolving production values.

## Prevention

- Test dependency-management invariants—full SHA pinning, version comments, allowed ranges—not
  the exact dependency values an updater is expected to change.
- Include a non-empty guard when parsing source text so a broken parser cannot pass vacuously.
- Treat tests that run only after merge as detection, not prevention. Strict branch protection
  can block only the checks configured as required; PR #47 restored deployment but did not add the
  docs suite to required checks.
- Keep post-deploy verification for rendered docs and live generated content. A green build alone
  does not prove the expected site reached production.

## Related Issues

- [Tests that use live data as fixtures break when the data improves](../workflow-issues/live-data-fixtures-break-on-data-improvement-2026-07-16.md)
- [Renovate pinned a dependency without refreshing the Bun lockfile](../integration-issues/renovate-pinned-dependency-without-bun-lockfile-refresh-2026-07-20.md)
- [PR #44: Renovate action update that exposed the brittle assertion](https://github.com/marcusrbrown/dev-like/pull/44)
- [PR #47: invariant-based test fix](https://github.com/marcusrbrown/dev-like/pull/47)
