---
title: "Bun + Changesets release pipeline with OIDC trusted publishing and GitHub App version PRs"
date: 2026-07-11
category: best-practices
module: release-pipeline
problem_type: tooling_decision
component: development_workflow
severity: medium
applies_when:
  - "setting up a new npm package release pipeline"
  - "switching from token-based npm publish to OIDC trusted publishing"
  - "adding Changesets to a Bun-based package"
  - "debugging version-PR creation or npm publish failures in CI"
tags: [bun, changesets, oidc, trusted-publishing, github-actions, npm, provenance, version-prs]
---

# Bun + Changesets release pipeline with OIDC trusted publishing and GitHub App version PRs

## Context

House release pattern (mirrors fro-bot/space-bus): Bun for package management and scripts,
Changesets for versioning via bot-created version PRs, tokenless npm publishing through OIDC
trusted publishing with SLSA provenance. Set up for dev-like; verified end-to-end (0.1.1 and
0.2.0 published with `https://slsa.dev/provenance/v1` attestations).

## Guidance

- Bun and Changesets are devDeps only; the package itself stays zero-runtime-deps and
  plain-node runnable.
- Version PRs need PR-creation rights. Default `GITHUB_TOKEN` cannot create PRs unless the
  repo setting "Allow GitHub Actions to create and approve pull requests" is enabled. Instead:
  mint a per-run GitHub App token (mrbro-bot) via `actions/create-github-app-token` with
  `APPLICATION_ID` + `APPLICATION_PRIVATE_KEY` secrets and hand it to `changesets/action`.
- Configure the npm trusted publisher only after the release workflow filename is FINAL. The
  trust link matches the exact, case-sensitive workflow path — a `release.yml` → `release.yaml`
  rename silently invalidates it.
- Ordering for a brand-new package name with squatting risk: (1) claim the name with a manual
  `npm publish` (2FA), (2) retool/land the release workflow, (3) configure the trusted
  publisher against the final filename.
- Gate publishes with `prepublishOnly` running validate + tests.
- If the publishable npm package is the repository root and `package.json` also declares
  `workspaces`, include `"."` in that array. Otherwise @manypkg/Changesets only discovers
  child workspaces and rejects root-package changesets with `package <name> which is not in
  the workspace`. Prove `bun install --frozen-lockfile` produces zero `bun.lock` diff after
  the change.
- Root-as-workspace changes Changesets' tag convention: it now creates canonical
  `<package>@<version>` tags/releases instead of root-mode `v<version>` ones. If the project
  has an established `v<version>` public tag convention, decide explicitly whether to migrate
  or preserve it — don't let the tag shape change as a silent side effect.
- dev-like keeps both tag forms deliberately: stock `changesets/action` with
  `createGithubReleases: true` owns npm publish and the canonical `<package>@<version>`
  tag/release; a `always() && !cancelled()` step after it runs an alias reconciler that
  resolves the canonical remote tag (recursing through annotated tag objects to the commit),
  creates `v<version>` at that exact commit, and retargets the same GitHub release —
  ending in one release, two tags.
- The alias reconciler must fail closed: a conflicting alias SHA, a malformed API response, a
  non-HTTP-404 lookup failure, or a duplicate release are all hard errors, never silently
  resolved. Never derive the `v<version>` tag from ambient `HEAD` when the canonical package
  tag already exists — the canonical tag is the only trusted commit source.

## Why This Matters

- No long-lived npm tokens anywhere; provenance attestations come free with OIDC.
- Wrong ordering costs a redo of the trusted-publisher setup (2FA, manual).
- Insufficient token permissions produce dead-on-arrival release runs that look like workflow
  bugs.
- Residual risk with the dual-tag setup: `changesets/action` can publish to npm and then fail
  before pushing the canonical tag (network blip, API error). The alias reconciler has no safe
  way to infer intent without that tag — it will not guess. Recovery is manual, not automated,
  to avoid adding npm metadata/provenance fallback complexity for a rare failure: verify the
  published version's npm provenance/`gitHead`, create the canonical `<package>@<version>` tag
  at that verified commit, then rerun the workflow so the alias reconciler completes normally.

## When to Apply

- Any new npm package in this account: this is the default release shape.
- When a release workflow must be renamed: re-point the trusted publisher in the same change.

## Examples

```yaml
# .github/workflows/release.yaml (essentials)
permissions:
  contents: read

jobs:
  release:
    permissions:
      contents: write
      id-token: write        # OIDC publish
      pull-requests: write
    steps:
      - id: get-app-token
        uses: actions/create-github-app-token@bcd2ba49218906704ab6c1aa796996da409d3eb1 # v3.2.0
        with:
          app-id: ${{ secrets.APPLICATION_ID }}
          private-key: ${{ secrets.APPLICATION_PRIVATE_KEY }}

      - id: changesets
        uses: changesets/action@a45c4d594aa4e2c509dc14a9f2b3b67ba3780d0d # v1.9.0
        env:
          GITHUB_TOKEN: ${{ steps.get-app-token.outputs.token }}
        with:
          setupGitUser: false
          version: bun run version-changesets
          publish: bun run publish-changesets
          createGithubReleases: true

      - name: Reconcile alias release tag
        if: always() && !cancelled()
        env:
          GH_TOKEN: ${{ steps.get-app-token.outputs.token }}
          GITHUB_REPOSITORY: ${{ github.repository }}
        run: bun run alias-release
```

npm side: package Settings → Trusted Publisher → GitHub Actions → org, repo, workflow
`release.yaml` (exact, case-sensitive), require 2FA / disallow tokens.

### Known benign failure: "cannot publish over previously published versions"

Right after a manual publish, CI `changeset publish` can fail repeatedly with
`You cannot publish over the previously published versions: X.Y.Z`. Cause: the registry READ
path serves stale metadata (404/no versions) so Changesets believes X.Y.Z is unpublished and
re-attempts it; the WRITE path correctly rejects. No fix — propagation settles in ~30–60 min,
after which `changeset publish` sees the version and no-ops.

Diagnosis pattern: `npm info <pkg> version` locally vs CI behavior; compare rerun timestamps
against the manual publish time.

## Prevention

- Don't rerun a red publish blindly — check `npm info <pkg> version` and propagation first.
- Freeze the release workflow filename before enabling trusted publishing.
- Keep `prepublishOnly: validate + test` so a manual publish can never ship a broken artifact.
- After adding `"."` to `workspaces`, run `changeset status` to confirm the root package is
  discovered before relying on it in CI.
- After a release, verify the canonical `<package>@<version>` tag and the alias `v<version>`
  tag resolve to the same commit.

## Related

- DESIGN.md — Ecosystem constraints, Distribution & launch surface (provenance/OIDC rationale)
