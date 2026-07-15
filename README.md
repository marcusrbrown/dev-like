# dev-like

[![npm](https://img.shields.io/npm/v/dev-like)](https://www.npmjs.com/package/dev-like)
[![CI](https://github.com/marcusrbrown/dev-like/actions/workflows/ci.yaml/badge.svg)](https://github.com/marcusrbrown/dev-like/actions/workflows/ci.yaml)
[![Link Check](https://github.com/marcusrbrown/dev-like/actions/workflows/link-check.yaml/badge.svg)](https://github.com/marcusrbrown/dev-like/actions/workflows/link-check.yaml)

> Steal the workflow, not the code. `/dev-like Every` and your agent develops like the
> shops you admire — with receipts.

`dev-like` profiles a tech company or developer's engineering culture from **public sources
only** (their shipped agent configs, linter configs, CI files, engineering blogs, talks) and
distills it into an installable, spec-compliant [Agent Skill](https://agentskills.io):
`develop-like-every`, `develop-like-theo`, `develop-like-<your-heroes>`.

Every claim in a generated skill links to the public source it came from. No source, no claim.

## Install

```bash
# Universal — symlinks into every detected harness (Claude Code, Codex, Cursor, Copilot, ...)
npx skills add marcusrbrown/dev-like

# Claude Code plugin (bare /dev-like command)
/plugin marketplace add marcusrbrown/dev-like
/plugin install dev-like

# CLI — install a cached profile's skill directly, no LLM needed
npx dev-like oxide
```

## Use

```
/dev-like Every        # cached: installs develop-like-every from the registry
/dev-like Theo         # aliases work: theo.gg, t3.gg, t3
/dev-like SomeNewShop  # uncached: live OSINT profile -> skill -> offers to PR it back
```

What changes? Same prompt, before and after — see the
[dry-run transcript](docs/demo/every-dryrun-2026-07-11.md): a generic senior-engineer review
becomes one that runs on the shop's actual operating model, every point traceable to a cited
source.

## Registry

| Slug | Kind | Consent tier | Skill |
|------|------|--------------|-------|
| [`every`](registry/every/) | org | self-published | [develop-like-every](registry/every/skill/develop-like-every/) |
| [`oxide`](registry/oxide/) | org | self-published | [develop-like-oxide](registry/oxide/skill/develop-like-oxide/) |
| [`theo`](registry/theo/) | person | stated | generated on demand |

Want a shop profiled? [Request it](https://github.com/marcusrbrown/dev-like/issues/new?template=profile-request.yml)
— or run `/dev-like <target>` and PR the result back.

## How it works

1. **Resolve** — target is matched against the [registry](registry/) (slugs + aliases).
2. **Cached** — the distilled `profile.md` becomes a `develop-like-<slug>` skill in your
   project (`.agents/skills/` + `.claude/skills/`).
3. **Uncached** — the agent runs the collection workflow across a ranked source taxonomy
   (revealed preference beats stated preference), builds a cited profile, generates the
   skill, and offers to contribute the profile back.

## Ethics, in one paragraph

Public professional sources only, official APIs over scraping, consent tiers on every profile
(`self-published` > `stated` > `observed` > `social`), a `stated`-tier floor for individuals,
[opt-out honored within 48h](registry/OPTOUT.md), and provenance links on every claim. We
extract principles and workflow shapes — never reproduce prose.

## Development

```bash
bun install
bun run validate   # frontmatter + registry schema + index sync
bun run test       # generator, CLI install, link-collection suites
```

Plain node works too (`node scripts/validate.mjs`, `node --test tests/`) — the package has
zero runtime dependencies. Provenance links are re-checked weekly in CI; trigger evals and the
paired workflow eval live in [evals/](evals/).

See [CONTRIBUTING.md](CONTRIBUTING.md) for adding registry profiles.

## License

MIT
