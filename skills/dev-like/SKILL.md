---
name: dev-like
description: >-
  Profile a tech company or developer's engineering culture from public sources and
  generate a develop-like-<target> skill that makes the agent work the way they do.
  Use when the user invokes /dev-like <target>, asks to "develop like <company>",
  "code like <person>", "adopt <shop>'s engineering practices", or wants a dev-culture
  profile of a company, team, or individual developer.
license: MIT
argument-hint: "<company | person | alias> (e.g. Every, Theo, theo.gg)"
metadata:
  author: marcusrbrown
  version: "0.1.0"
  repository: https://github.com/marcusrbrown/dev-like
---

# dev-like

Turn a shop's public engineering exhaust into an installable `develop-like-<slug>` skill,
with a source citation for every claim.

Target: `$ARGUMENTS` (if empty, ask the user who they want to develop like).

## Workflow

### 1. Resolve

Fetch the registry index and resolve the target against slugs and aliases (case-insensitive):

```
https://raw.githubusercontent.com/marcusrbrown/dev-like/main/registry/index.json
```

`Every` → `every`; `theo.gg`, `t3.gg`, `Theo Browne` → `theo`. If ambiguous, ask.

### 2a. Cache hit → install

1. Fetch `registry/<slug>/profile.md` and `registry/<slug>/entry.json` (same raw URL base).
2. Tell the user the profile date, consent tier, and top sources before applying anything.
3. Generate the `develop-like-<slug>` skill from the profile — follow
   [references/distilling.md](references/distilling.md).
4. Write it to `.agents/skills/develop-like-<slug>/` and mirror into `.claude/skills/` if the
   project uses Claude Code (symlink preferred, copy fallback). See
   [references/harnesses.md](references/harnesses.md) for other harnesses.
5. Offer the optional `<slug>-developer` reviewer/pair agent persona.

### 2b. Cache miss → collect, distill, contribute

1. Tell the user this target is uncached and a live profile takes a few minutes. Confirm.
2. Run the collection workflow — follow [references/profiling.md](references/profiling.md).
   Public sources only, official APIs preferred, every claim gets a source URL.
3. Distill into `profile.md` + `entry.json` per [references/distilling.md](references/distilling.md).
4. Generate and install the skill as in 2a.
5. Offer to PR the new profile back to the registry — follow
   [references/registry.md](references/registry.md). This is opt-in, never automatic.

## Hard rules

- Every claim in a profile or generated skill carries a provenance link. No source, no claim.
- Individuals (kind: person) require `stated`-tier sources or better — never build a person's
  profile purely from social posts. Orgs may use the full source taxonomy.
- Extract principles, workflows, and stack facts. Never reproduce prose beyond quotation scale.
- Check `registry/OPTOUT.md` before profiling anyone; a listed target is a hard stop.
- State the profile date in the generated skill: cultures drift, receipts age.
