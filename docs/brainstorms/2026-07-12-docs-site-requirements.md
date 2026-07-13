---
date: 2026-07-12
topic: docs-site
---

# dev-like docs site (Phase 3)

## Summary

A Starlight docs site in `docs/`, published at mrbro.dev/dev-like from this repo's own
Pages deploy, scoped as a launch asset: landing page with the before/after demo, registry
pages generated from `registry/` data at build time, quickstart, and an ethics page.

---

## Problem Frame

Launch traffic (HN, X/Bluesky) needs a surface that isn't a GitHub README: something that
shows the before/after demo immediately, renders the registry's trust story (consent tiers,
receipts, opt-out) visibly, and unfurls properly when shared. The registry — the product's
core evidence — is currently invisible to anyone who won't read JSON and markdown on
GitHub. Phase 4's pre-launch checklist (proof-of-value side-by-sides, "profile your own
shop" CTA surface, opt-out visibility) has nowhere to live.

The infrastructure question that blocked this — where the site lives — is resolved: the
Pages re-home is complete and verified (user site now serves mrbro.dev, so every project
repo gets mrbro.dev/<repo> routing for free).

---

## Requirements

**Scaffold + deploy**

- R1. Astro Starlight site in `docs/`, copied from Systematic's proven config
  (marcusrbrown/systematic `docs/` — base path, OG tags, Mermaid, sidebar patterns), with
  an explicit audit of the copied config against the same-repo deploy shape: site/base URL,
  OG URL base, sitemap paths, redirects (Systematic's config was built for a cross-repo
  fro.bot deploy).
- R2. Site config uses `site: https://mrbro.dev`, `base: /dev-like`; all internal links
  and assets respect the base path.
- R3. Deploy via this repo's own GitHub Pages (workflow build → deploy-pages). Content
  deploys are independent of npm releases: trigger on push to main touching `docs/` or
  `registry/`, plus manual dispatch — the registry surface must not go stale between
  releases.
- R4. Site build does not affect the npm package: `docs/` stays out of `files` in
  package.json, and package CI (validate + test) remains independent of site CI.

**Content — launch cut**

- R5. Landing page: what dev-like does in one screen, install commands (three paths:
  npx skills add / plugin marketplace / npx dev-like), and the Every before/after demo
  (from docs/demo/every-dryrun-2026-07-11.md), abridged with a link to the full transcript.
- R6. Registry pages generated at build time from `registry/index.json` +
  `registry/<slug>/profile.md` + `entry.json`: an index page (table: name, kind, consent
  tier, updated) and a per-entry page rendering the profile with consent tier + source
  count surfaced near the title.
- R7. When a registry entry has a prebuilt skill (`registry/<slug>/skill/`), its page
  links the generated SKILL.md and shows the one-line install command for that entry.
- R8. Install and first-run guidance lives on the landing page (no separate quickstart
  page): install → first run → what lands on disk, with harness-family notes (Claude Code,
  `.agents/skills/` readers) in a compact secondary section.
- R9. Ethics page: consent tiers explained, the person-tier floor, opt-out process
  (48h promise) with a link to the opt-out issue form, provenance rules.
- R10. Per-entry OG cards generated at build time (title + three-phrase summary + consent
  tier), plus a default site OG card — the X/Bluesky unfurl surface.
- R11. Umami analytics via the self-hosted instance: script tag in the Starlight head,
  no cookies/PII, loaded only in production builds.
- R11a. Launch-metric events: install-CTA clicks (per install path), profile-request CTA
  clicks, and outbound opt-out/contact clicks are tracked as named Umami events — these
  feed Phase 4's pre-defined success metrics (installs from launch sources, profile
  requests, opt-outs).

**Registry data contract**

- R12. Registry pages consume registry data read-only; no site-side copies of profile
  content. `scripts/validate.mjs` remains the single source of registry invariants — the
  site build fails on malformed registry data rather than validating it independently.
  Deploy availability escape hatch: registry validation runs pre-merge in CI (existing
  `bun run validate`), so a malformed-registry state on main is already exceptional; if it
  occurs, the fix-forward path is a revert of the offending registry commit — the site
  build failing loud is correct, not a hazard to engineer around.
- R13. The landing page has one primary CTA with install commands immediately adjacent to
  the demo; registry browsing is secondary (below the fold or sidebar). Which install path
  is primary is a planning decision; the hierarchy itself is not.

---

## Acceptance Examples

- AE1. **Covers R2, R3.** Given the site is deployed, when visiting
  https://mrbro.dev/dev-like/, the landing page renders with working CSS/assets and
  internal links stay under /dev-like/.
- AE2. **Covers R6, R7.** Given `registry/oxide/` exists with a prebuilt skill, when the
  site builds, /dev-like/registry/oxide/ shows the profile with consent tier
  `self-published`, 17 sources, and an `npx dev-like oxide` install line.
- AE3. **Covers R4.** Given a change touching only `docs/`, when package CI runs,
  validate + test results are unchanged and the npm package contents are unaffected.
- AE4. **Covers R10.** Given a registry entry page URL pasted into an unfurl debugger,
  the per-entry OG card renders (not the GitHub default).
- AE5. **Covers R11.** Given a production build, the Umami script is present; given a dev
  build, it is absent.
- AE6. **Covers R6, R7.** Given `registry/theo/` (no prebuilt skill directory), when the
  site builds, /dev-like/registry/theo/ renders the profile and shows the `/dev-like theo`
  live-generation instruction in place of an npx install line.

---

## Success Criteria

- Launch-day traffic can land on mrbro.dev/dev-like and understand the product, see the
  demo, and reach an install command without visiting GitHub.
- Shared registry/entry links unfurl with product-specific OG cards.
- A new registry entry appears on the site with zero site-side content edits (build-time
  generation holds).
- Planning can start from this doc without inventing content scope or deploy mechanics.

---

## Scope Boundaries

- Harness matrix page and CLI reference — post-launch (landing page carries the compact
  harness-family notes per R8; the full matrix stays in the repo's HARNESSES reference).
- Separate quickstart page — collapsed into the landing page (R8): a second page
  duplicating install commands splits launch traffic for no gain.
- "Profile your own shop" pitch page — Phase 4 flywheel; the landing page reserves a CTA
  slot linking to the profile-request issue form as a placeholder.
- Lighthouse/perf budget beyond Starlight defaults — verify once, don't build tooling.
- Blog/essay hosting — the launch essay lives on mrbro.dev (gist pipeline), not this site.
- Search — Starlight's built-in Pagefind is fine; no custom search work.

---

## Key Decisions

- Starlight over a bespoke one-pager: docs chrome costs some landing polish, but the
  registry browser compounds instead of being rebuilt post-launch (approach A from the
  brainstorm).
- mrbro.dev/dev-like via the completed Pages re-home rather than a subdomain: one-time
  migration already executed; every future repo inherits the pattern.
- Umami and OG cards stay in the launch cut (confirmed at synthesis): OG cards are the
  unfurl surface Phase 4 depends on; Umami is the consent-clean metrics source for the
  pre-defined launch success numbers.
- Site deploys from dev-like's own repo (not the Systematic cross-repo push): fewer moving
  parts, no second repo's pipeline in the blast radius.
- Per-entry registry pages stay in the launch cut (scope-guardian challenged; product-lens
  affirmed): the rendered profiles ARE the proof-of-value evidence Phase 4's trust rails
  depend on — a bare table would reduce the receipts story to a claim.
- Umami stays, deepened with launch-metric events (R11a): Phase 4 defines success metrics
  that are unmeasurable without event-level data; a script tag alone was the worst of both
  worlds.
- Registry freshness beats release-gating (R3): the site mirrors main for docs/registry
  changes; npm releases remain the package's cadence, not the site's.

---

## Dependencies / Assumptions

- Pages re-home is done and verified for the ROOT domains (mrbro.dev 200, marcusrbrown.com
  200, github.io 301); domain verification confirmed by Marcus via settings screenshots.
  Subpath routing VERIFIED 2026-07-12 via stub Pages deploy (commit 490e816, run
  29227517823): mrbro.dev/dev-like/ 200 + nested paths resolve, github.io/dev-like 301s to
  canonical, non-existent paths return the project 404 (portfolio SPA does not intercept
  /dev-like/*), portfolio root unaffected. The stub (docs/site-stub/ + site.yaml) is the
  placeholder the real Starlight build replaces.
- Systematic's `docs/` config is available locally to copy
  (marcusrbrown/systematic/docs/astro.config.mjs).
- Self-hosted Umami instance exists and can accept a new site registration.
- Enabling Pages on this public repo makes the site URL live as soon as the first deploy
  runs — acceptable pre-launch (content is already public in the repo).

---

## Outstanding Questions

### Deferred to Planning

- [Affects R6][Technical] Profile markdown → Starlight rendering: reuse the profile's own
  section structure or map into a content-collection schema.
- [Affects R10][Needs research] OG card generation approach inside Starlight (satori vs
  astro-og-canvas vs prebuilt images) — pick whatever Systematic-adjacent prior art proves
  out fastest; fallback when per-entry generation fails is the default site card.
- [Affects R5][Design] Demo excerpt treatment: what's quoted vs summarized, and how the
  before/after halves are visually separated (long blockquotes don't scan).
- [Affects R11][Technical] Umami fallback behavior when the website ID is unset in a
  production build.
