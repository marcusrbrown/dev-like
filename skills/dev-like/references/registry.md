# Registry: format + PR-back flow

## Entry layout

```
registry/<slug>/
├── entry.json     # metadata (schema: registry/schema/entry.schema.json)
├── profile.md     # distilled culture doc, every claim cited
└── skill/         # optional prebuilt develop-like-<slug>/ for zero-LLM install
```

`registry/index.json` maps slugs → aliases, kind, tier, updated. Keep it in sync (CI checks).

## entry.json shape

```json
{
  "slug": "every",
  "name": "Every",
  "kind": "org",
  "aliases": ["every.to", "everyinc"],
  "consentTier": "self-published",
  "updated": "2026-07-11",
  "homepage": "https://every.to",
  "sources": [
    { "url": "https://github.com/EveryInc/compound-engineering-plugin",
      "fetched": "2026-07-11", "tier": "self-published" }
  ]
}
```

## PR-back flow (after a cache-miss profile)

1. Ask the user; never PR automatically.
2. Validate locally: `node scripts/validate.mjs` (schema + provenance + index sync).
3. Fork/branch `marcusrbrown/dev-like`, add `registry/<slug>/`, update `index.json`.
4. PR body: target, consent tier, source count by tier, anything in the tensions section.
   Persons: confirm `stated`-tier floor and OPTOUT.md check in the PR checklist.
5. Contributors get credited in the profile (`entry.json` may include `contributors`).

## Removal

Opt-out requests land in `registry/OPTOUT.md`; entry deletion is a single `git rm` and an
index edit. Design for deletion — no other file may reference a slug directly.
