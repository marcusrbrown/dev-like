# dev-like — MVP → publish → docs → launch checklist

Ordered by dependency. Each phase gates the next; items within a phase are parallelizable
unless noted. Verification criteria inline — nothing checks off on vibes.

## Phase 0 — Claims (do immediately, ~30 min)

- [x] Push this scaffold to `marcusrbrown/dev-like` (public), CI green on first push
- [x] Claim `dev-like` on npm: manual `npm publish` of 0.1.0 with 2FA (trusted publishing
      config requires the package to exist first)
- [x] Repo topics: `agent-skills`, `claude-code`, `codex`, `cursor`, `ai-agents` +
      description matching package.json
- [x] Verify `/dev-like` doesn't collide with a bundled Claude Code command

## Phase 0.5 — Retool (before any Phase 1 work)

Match house tooling (Space Bus is the closest template; Systematic uses semantic-release —
don't copy that):

- [x] Bun for package management + scripts (`bun.lock`, `bunfig.toml` if needed); CLI stays
      plain-node runnable (`npx dev-like`), zero runtime deps invariant holds — Bun/Changesets
      are devDeps only
- [x] Changesets for versioning/publishing: `.changeset/config.json`, changesets/action-based
      `release.yaml` (version PR flow) replacing the tag-triggered `release.yml`
- [x] CI converted to Bun (`oven-sh/setup-bun`), validate + test scripts unchanged in behavior
- [ ] npm trusted publisher configured only AFTER this lands, pointing at the final workflow
      filename (moved here from Phase 2 to avoid redoing OIDC setup)

## Phase 1 — MVP (v0.2)

**Skill (the product):**
- [ ] Harden both seed profiles: re-fetch every source, real fetch dates, expand
      principles with citations — treat `every` as the reference-quality bar
- [ ] Prebuilt `registry/every/skill/develop-like-every/` (zero-LLM install path);
      snapshot test: profile.md → skill generation is deterministic
- [ ] Skill-generation template extracted from `references/distilling.md` into
      `skills/dev-like/assets/` (templates are assets, not prose)
- [ ] End-to-end dry run: `/dev-like Every` in Claude Code on a scratch project — cache-hit
      path produces a working `develop-like-every` skill; record transcript for docs
- [ ] End-to-end cache-miss run against a shop NOT in the registry; verify the PR-back
      offer produces a valid `registry/<slug>/` (this becomes registry entry #3)

**CLI:**
- [ ] Implement install path: resolve → fetch prebuilt skill or generate from profile →
      write `.agents/skills/` → symlink `.claude/skills/` (copy fallback) → print actions
- [ ] `--dry-run` flag (print, don't write) — default for anything destructive
- [ ] Tests: resolve (done), install to tmpdir, idempotent re-install

**Quality gates:**
- [ ] Description-trigger evals: 10 should-trigger / 10 near-miss prompts, 3 reps each,
      skill-creator methodology; record trigger rate in `evals/`
- [ ] One paired LLM eval: fixture task with/without `develop-like-every`, grader asserts
      workflow shape changed (plan-first, compound step) — assert on tool traces, not prose
- [ ] Scheduled CI: provenance link-rot check (weekly, not per-PR)
- [ ] Issue templates: `optout`, `profile-request`, PR template with consent-tier checklist

**Cross-harness verification (minimum matrix):**
- [ ] Claude Code: `/plugin marketplace add marcusrbrown/dev-like` → `/dev-like Every`
- [ ] `npx skills add marcusrbrown/dev-like` → verify symlinks land in detected agents
- [ ] Codex: `$dev-like` invocation from `.agents/skills/`
- [ ] One more (Cursor or Copilot) — then stop; HARNESSES.md documents the rest

## Phase 2 — Publish (v0.2.0 tag)

- [ ] npm trusted publisher config on the package page: org `marcusrbrown`, repo `dev-like`,
      workflow `release.yml` (exact, case-sensitive), allowed action `npm publish`
- [ ] Verify `package.json` `repository.url` exactly matches the GitHub repo (OIDC gotcha)
- [ ] Package settings → "Require 2FA and disallow tokens"; revoke any granular tokens
- [ ] Tag `v0.2.0` → release.yml publishes; **verify provenance badge on the npm page**
- [ ] `claude plugin validate` passes (same check as the community-marketplace pipeline)
- [ ] Seed skills.sh listing: `npx skills add marcusrbrown/dev-like` from a couple machines;
      add the install badge to README

## Phase 3 — Docs site

- [ ] `site/`: Astro Starlight, base path `/dev-like`, matching Systematic's setup
      (marcusrbrown/systematic → fro.bot/systematic)
- [ ] Decide final home: mrbro.dev/dev-like (default) vs marcusrbrown.com/dev-like; wire
      deploy — build here, publish into the domain repo via CI (workflow_dispatch or
      deploy artifact; ask-first item: touches another repo's pipeline)
- [ ] Umami: add dev-like site to the self-hosted instance; script tag in the Starlight
      head; optional public share URL in footer
- [ ] Content: quickstart (3 install paths), registry browser generated from
      `registry/index.json` at build time, per-profile pages rendering profile.md with
      consent tier + receipts, HARNESSES matrix, ethics page (consent tiers, opt-out, the
      one-paragraph version from README)
- [ ] The demo: before/after transcript from the Phase 1 dry run, side by side
- [ ] OG cards per registry entry (generated at build; "develop like Every — Rails,
      compound engineering, 80/20") — this is the X/Bluesky unfurl surface
- [ ] Verify: Lighthouse pass, links resolve, Umami events arrive, OG cards render in
      an unfurl debugger

## Phase 4 — Launch + marketing

**Pre-launch (order matters):**
- [ ] Registry at 4–5 entries (every, theo, + cache-miss run outputs; candidates:
      Oxide, Linear, 37signals — shops with loud public engineering cultures)
- [ ] Courtesy ping Kieran Klaassen / Every: their profile is `self-published` tier and CEP
      is credited as the design prior — likely amplification, zero downside
- [ ] Launch essay: "I taught my agent to develop like Every" — the cache-miss walkthrough
      with receipts; publish on mrbro.dev, canonical
- [ ] The Theo paradox piece (short): the skill that violates its subject's own principles,
      and why shipping the tension is the honest move

**Launch day:**
- [ ] Show HN: "Show HN: dev-like – give your agent another shop's engineering culture,
      with receipts"
- [ ] X + Bluesky thread anchored on the Every before/after and the Theo paradox
- [ ] r/ClaudeAI, r/ChatGPTCoding posts
- [ ] Submit to awesome lists: travisvn/awesome-claude-skills, ComposioHQ/awesome-claude-skills,
      hesreallyhim/awesome-claude-code
- [ ] Submit plugin to `anthropics/claude-plugins-community`

**Post-launch flywheel:**
- [ ] "Profile your own shop" CTA live on the docs site (self-published tier pitch:
      Key Values dynamics, but the artifact is executable)
- [ ] First external registry PR merged + contributor credited = milestone post
- [ ] Watch: skills.sh installs, npm downloads, GH stars, Umami — weekly, in one place
- [ ] Per-harness manifests (.codex-plugin, .cursor-plugin) only if install data demands it

## Standing rules

- Persons: `stated`-tier floor, OPTOUT.md checked, 48h removal honored — before launch, not after
- No release without: validate + tests green, provenance links live, `claude plugin validate` pass
- No CLI telemetry. Ever, without an explicit opt-in design pass.
