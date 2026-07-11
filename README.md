# dev-like

> Steal the workflow, not the code. `/dev-like Every` and your agent develops like the
> shops you admire — with receipts.

`dev-like` profiles a tech company or developer's engineering culture from **public sources
only** (their shipped agent configs, linter configs, CI files, engineering blogs, talks) and
distills it into an installable, spec-compliant [Agent Skill](https://agentskills.io):
`develop-like-every`, `develop-like-theo`, `develop-like-<your-heroes>`.

Every claim in a generated skill links to the public source it came from. No source, no claim.

## Install

```bash
# Universal (55 harnesses — Claude Code, Codex, Cursor, Copilot, Gemini CLI, ...)
npx skills add marcusrbrown/dev-like

# Claude Code plugin (bare /dev-like command)
/plugin marketplace add marcusrbrown/dev-like
/plugin install dev-like

# CLI (cached registry installs)
npx dev-like every
```

## Use

```
/dev-like Every        # cached: installs develop-like-every from the registry
/dev-like Theo         # aliases work: theo.gg, t3.gg, t3
/dev-like SomeNewShop  # uncached: live OSINT profile -> skill -> offers to PR it back
```

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
node scripts/validate.mjs   # frontmatter + registry schema + index sync
node --test tests/
```

See [DESIGN.md](DESIGN.md) for architecture and [CONTRIBUTING.md](CONTRIBUTING.md) for
adding registry profiles.

## License

MIT
