# Distilling: profile → develop-like-<slug> skill

Generation is deterministic templating over `profile.md`. Keep it boring; the intelligence
already happened during collection.

## Output layout

```
develop-like-<slug>/
├── SKILL.md                 # < 150 lines: principles + workflow rules
├── references/
│   ├── stack.md             # stack + rationale, cited
│   ├── workflow.md          # how work moves, cited
│   └── sources.md           # full bibliography: URL, fetch date, tier
└── personas/
    └── <slug>-developer.md  # optional reviewer/pair persona (reference material;
                              # Claude Code users may copy it to .claude/agents/)
```

## SKILL.md frontmatter template

```yaml
---
name: develop-like-<slug>
description: >-
  Develop the way <Name> does: <three-phrase culture summary>. Use when the user wants
  <Name>-style engineering decisions, code review in <Name>'s voice, or asks to
  "develop like <Name>". Profiled <YYYY-MM-DD> from public sources.
license: MIT
metadata:
  author: marcusrbrown
  generator: dev-like
  profiled: "<YYYY-MM-DD>"
  consent-tier: "<tier>"
  source: https://github.com/marcusrbrown/dev-like/tree/main/registry/<slug>
---
```

## Body rules

- Principles as imperatives the agent can act on ("Plan 80/20 — most effort before code"),
  each with a `[source]` link. No source, no claim.
- Capture workflow *shape*, not prompt-pile trivia. Fidelity that degrades utility loses:
  distilled principles beat verbatim mimicry.
- Include a "Profiled as of <date>" line and a staleness warning if entry.json `updated`
  is > 6 months old.
- Include the tensions section from the profile verbatim — honesty is the brand.
- Name the directory exactly `develop-like-<slug>` (spec: name must match directory).

## Agent persona (optional, offer, don't force)

`<slug>-developer.md`: a reviewer/pair persona that critiques diffs against the profile's
principles ("Every-Developer: this PR skipped the plan step; compound your learnings into
docs/solutions/"). Keep it under 60 lines.
