# dev-like — agent context

Read DESIGN.md before structural changes; it holds the decisions and their rationale.

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
- `docs/solutions/` — documented solutions to past problems (release pipeline, git
  workflows, best practices), organized by category with YAML frontmatter (`module`,
  `tags`, `problem_type`). Relevant when working in a documented area.
