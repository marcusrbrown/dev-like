# dev-like

## 0.4.1

### Patch Changes

- 6601cc2: Rewrite generated skill Workflow sections as imperative, checkpointed steps so workflow discipline transfers (#23).
- 01d7a34: Generated workflows now name a concrete pre-code artifact when a profiled culture expects one. The Oxide skill's workflow step now requires a short RFD-style decision record (problem, options considered, chosen approach with tradeoffs, failure modes/validation) for a meaningful design choice, before implementation (#23).
- f25e596: Claude plugin and skill metadata now stay synchronized with package releases: `.claude-plugin/plugin.json` and the `dev-like` skill's frontmatter version are automatically kept in lockstep with `package.json`, and `bun run validate` catches drift before it ships.

## 0.4.0

### Minor Changes

- 8f5e30a: Add 37signals and Linear registry entries; harness support matrix, oxide demo, Copilot verification addendum.

### Patch Changes

- 1a2f5fc: Fix theo profile generation and validate that every registry entry generates cleanly
- f5d3c5f: Move generated skill persona to `personas/<slug>-developer.md` (was `agents/`) — `agents/` is reserved for harness metadata (e.g. OpenAI Codex's `agents/openai.yaml`). SKILL.md now notes the persona is reference material and Claude Code users can copy it to `.claude/agents/` to run it as a first-class subagent.

## 0.3.1

### Patch Changes

- e7fab3a: Make published CLI and harness guidance self-contained.

## 0.3.0

### Minor Changes

- 3f7aa98: Registry entry #3: `oxide` (Oxide Computer Company) — RFD-driven decisions, Rust-heavy co-design, rigor with urgency. Profile, entry, and prebuilt `develop-like-oxide` skill, 17 first-party sources.

### Patch Changes

- 90e5786: Quality gates: provenance link-rot checker (`scripts/check-links.mjs` + weekly Link Check CI with auto-filed issues), opt-out/profile-request issue forms, PR template with consent-tier checklist, description-trigger evals (60/60 stable), paired LLM eval harness (`bun run eval:paired`).

## 0.2.0

### Minor Changes

- 6a6fb7c: CLI install path: `npx dev-like <target>` resolves against the packaged registry (remote fallback), installs the prebuilt skill into `.agents/skills/` with a `.claude/skills/` symlink (copy fallback), idempotent re-install, `--dry-run`/`--force`/`--dir`/`--registry` flags. Generated skill descriptions disambiguate org vs person ("Every (the company)").
- cae781f: Deterministic skill generation: `scripts/generate-skill.mjs` (zero-dep CLI with `--out`/`--check`/`--registry`), generation templates in `skills/dev-like/assets/`, prebuilt `registry/every/skill/develop-like-every/` artifact, and a 9-test suite covering determinism, provenance closure, and snapshot drift.

### Patch Changes

- 270e77e: Harden `every` and `theo` seed profiles: verify every source against live pages, correct the CEP loop (six-step plugin vs four-step core), reground unverifiable claims, add first-party sources and cited principles.

## 0.1.1

### Patch Changes

- 4e02d58: Retool to Bun for package management and Changesets for versioning/publishing. CLI and skill content unchanged.
