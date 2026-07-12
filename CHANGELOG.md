# dev-like

## 0.2.0

### Minor Changes

- 8b64634: CLI install path: `npx dev-like <target>` resolves against the packaged registry (remote fallback), installs the prebuilt skill into `.agents/skills/` with a `.claude/skills/` symlink (copy fallback), idempotent re-install, `--dry-run`/`--force`/`--dir`/`--registry` flags. Generated skill descriptions disambiguate org vs person ("Every (the company)").
- 201c24f: Deterministic skill generation: `scripts/generate-skill.mjs` (zero-dep CLI with `--out`/`--check`/`--registry`), generation templates in `skills/dev-like/assets/`, prebuilt `registry/every/skill/develop-like-every/` artifact, and a 9-test suite covering determinism, provenance closure, and snapshot drift.

### Patch Changes

- c7defd9: Harden `every` and `theo` seed profiles: verify every source against live pages, correct the CEP loop (six-step plugin vs four-step core), reground unverifiable claims, add first-party sources and cited principles.

## 0.1.1

### Patch Changes

- 4e02d58: Retool to Bun for package management and Changesets for versioning/publishing. CLI and skill content unchanged.
