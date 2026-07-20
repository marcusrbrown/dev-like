# Contributing

The main contribution is **registry profiles** — usually the natural endpoint of running
`/dev-like <uncached-target>` and letting the skill walk you through the PR.

## Adding a profile

1. `registry/<slug>/entry.json` — must pass `registry/schema/entry.schema.json`.
2. `registry/<slug>/profile.md` — every claim carries a source link. No source, no claim.
3. Update `registry/index.json` (CI checks index/entry sync).
4. `bun run validate` must pass (registry checks plus plugin/skill release-version lockstep).

## Hard rules

- Public, logged-out sources only; official APIs over scraping; respect robots.txt.
- Consent tiers: `self-published` > `stated` > `observed` > `social`. **Persons require
  `stated` or better** — no profiles of individuals built from social exhaust.
- Check [registry/OPTOUT.md](registry/OPTOUT.md) first. Listed targets are a hard stop.
- Extract principles/workflow/stack facts. Never reproduce prose beyond quotation scale.
- Document tensions (where practice contradicts stated belief). Honesty is the brand.

## Skill changes

Changes to `skills/dev-like/` need: validate passing, and — for behavior changes — an eval
note in the PR (baseline vs with-change on at least one fixture task). Eval harness lands
in v0.2; until then describe your manual verification.
