---
title: Harness Support
description: Which agent harnesses can install and run dev-like-generated skills, and how each was verified.
---

`dev-like` generates skills that follow the shared `.agents/skills/` convention, so any harness
that reads from that path — or from its own symlinked/copied location — can use them. The table
below lists what has actually been verified end-to-end versus what is staged-but-unverified.

**Verified** means we ran the install and invocation ourselves and observed the result. **Staged**
means the skill files land in the right place but live invocation wasn't confirmed.

| Harness | Install path | Skill discovery location | Status | Evidence |
|---|---|---|---|---|
| Claude Code (plugin marketplace) | `claude plugin install dev-like@dev-like` | `.agents/skills/develop-like-<target>/` | **Verified** (e2e) | `/dev-like Oxide` resolved from registry, installed skill, and summarized cited principles |
| Claude Code (via `npx skills add`) | `npx skills add marcusrbrown/dev-like --agent claude-code` | `.agents/skills/dev-like/` (symlinked at `.claude/skills/dev-like`) | **Verified** | Installer reported `symlinked: Claude Code`; `SKILL.md` frontmatter confirmed intact at the real path |
| GitHub Copilot CLI | `npx skills add marcusrbrown/dev-like --agent github-copilot` | `.agents/skills/dev-like/` (copied, not symlinked) | **Verified** | Live `copilot -p` run enumerated the skill and quoted verbatim `SKILL.md` body content back, confirming a real file read rather than a metadata guess |
| Codex | Skill files staged via `.agents/skills/` (same generator output as other harnesses) | `.agents/skills/` | **Staged, not verified** | Codex was not installed in the verification environment; live invocation has not been confirmed |

## Source

Full command transcripts and quoted CLI output for each verification are in
[`docs/demo/cross-harness-verification-2026-07-11.md`](https://github.com/marcusrbrown/dev-like/blob/main/docs/demo/cross-harness-verification-2026-07-11.md)
in the repository.
