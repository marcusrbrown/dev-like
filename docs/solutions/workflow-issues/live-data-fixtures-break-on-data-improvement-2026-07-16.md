---
title: "Tests that use live data as fixtures break when the data improves"
date: 2026-07-16
category: workflow-issues
module: docs-site
problem_type: test_design_flaw
component: testing
severity: medium
applies_when:
  - "a test asserts on a property of the live/production dataset (e.g. \"at least one entry lacks X\")"
  - "the dataset is expected to improve over time (registry entries gaining coverage, hardening, etc.)"
  - "a fixture is a copy or subset of live data rather than a synthetic minimal case"
tags: [testing, fixtures, test-isolation, registry, ci, data-coupling]
---

# Tests that use live data as fixtures break when the data improves

## Context

`docs/tests/generate-registry-pages.test.ts` asserted "at least one registry entry missing
optional sections" and "at least one entry without a prebuilt skill" — using the live
`registry/` as the fixture for deviant-entry behavior. PR #16 made all 5 entries conform
(theo hardened + prebuilt tree added), so both tests lost their fixture and the Site workflow
on main went red. The tests failed because the product got better, not because anything
broke.

A related case the same day: a drift-regression test copied one registry entry into a temp
fixture but reused the full 5-entry `index.json`. `validate()` then failed for unrelated
missing-directory reasons, so the test passed regardless of the behavior it claimed to cover.

## Guidance

- Fixtures must be synthetic and minimal — a single-entry `index.json` for a single-entry
  fixture, not a slice of the live registry.
- The generator already accepted `registryDir`/`validateFn` params; use them to point at a
  temp fixture instead of asserting on live-data properties.
- A test must fail ONLY via the code path it claims to cover. Prove isolation: run the
  fixture with the tamper/deviance removed and confirm the test passes for the right reason.
- When a data-quality bar rises (an entry gets hardened, a section gets filled in), audit
  existing tests for live-data coupling — anything asserting "at least one X lacks Y" against
  live data is a landmine.

## Why This Matters

- CI going red because the product improved erodes trust in the signal; the next real
  regression gets dismissed as "probably another false failure."
- The `index.json`-copy case is worse: the test passes for an unrelated reason (missing dir)
  and provides zero actual coverage of the behavior under test, silently.

## When to Apply

- Any test whose assertion depends on the current shape/count/completeness of a live,
  evolving dataset.
- Fixture: PR #18 (docs/tests/generate-registry-pages.test.ts).

## Examples

```ts
// Bad: asserts on live data
const missing = registryEntries.filter(e => !e.skill)
expect(missing.length).toBeGreaterThan(0)

// Good: synthetic single-entry fixture, generator accepts registryDir override
const tmpDir = makeTempRegistry({ entries: [{ slug: 'x', skill: undefined }] })
generateRegistryPages({ registryDir: tmpDir })
```

## Prevention

- Build fixtures as synthetic, minimal, single-purpose data — never a copy of live data.
- For every test, ask: "does this pass for the reason I think it does?" — run it against the
  fixture with the deviance removed and confirm it fails/passes as expected.
- Treat a rising data-quality bar (more complete registry entries, more hardened profiles) as
  a trigger to re-audit tests for live-data coupling.

## Related

- PR #16 (registry hardening that exposed the coupling)
- PR #18 (synthetic fixture fix)
