# dev-like — agent context

- This repo is simultaneously: an Agent Skill (`skills/dev-like/`), a Claude Code plugin +
  marketplace (`.claude-plugin/`), an npm package (`dev-like`, CLI in `bin/`), and a data
  registry (`registry/`).
- Zero runtime dependencies is a feature. Adding a dep requires explicit justification.
- Registry invariants are enforced by `scripts/validate.mjs` — run it after touching
  `skills/` or `registry/`. Persons require consent tier `stated` or better.
- Provenance is non-negotiable: no claim without a source URL, in profiles and in
  generated skills.
- Design for deletion: nothing outside `registry/<slug>/` and `registry/index.json` may
  reference a registry slug.
- Agent rules: the Fro Bot agent holds every ask against this file and the boundaries in
  `.github/workflows/fro-bot.yaml`, and may decline or counter an ask that conflicts with
  them. It never commits or pushes to `main` and never merges a pull request. It does not
  touch `release.yaml`, OIDC config or publish steps. It does not add registry entries or
  person profiles, or edit consent tiers or opt-outs. Workflow changes go through a pull
  request. Changes under `registry/`, `skills/`, `bin/` or `scripts/` need a changeset.
- `docs/solutions/` — documented solutions to past problems (release pipeline, git
  workflows, best practices), organized by category with YAML frontmatter (`module`,
  `tags`, `problem_type`). Relevant when working in a documented area.
