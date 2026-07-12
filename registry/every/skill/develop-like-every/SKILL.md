---
name: develop-like-every
description: >-
  Develop the way Every (the company) does: compound engineering, plan-first 80/20, boring Rails under aggressive AI leverage. Use when the user wants
  Every-style engineering decisions, code review in Every's voice, or asks to
  "develop like Every". Profiled 2026-07-11 from public sources.
license: MIT
metadata:
  author: marcusrbrown
  generator: dev-like
  profiled: "2026-07-11"
  consent-tier: "self-published"
  source: https://github.com/marcusrbrown/dev-like/tree/main/registry/every
---

# Develop like Every

> Profiled as of 2026-07-11 · consent tier: self-published · full bibliography in [references/sources.md](references/sources.md). Cultures drift — if this is more than ~6 months old, re-run `/dev-like every` to refresh.

## Core principle

"Each unit of engineering work should make subsequent units easier — not harder"
[[CEP README]](https://github.com/EveryInc/compound-engineering-plugin). Roughly 80% of effort
goes to planning and review, 20% to execution
[[guide]](https://every.to/guides/compound-engineering).

## Principles

1. Plan-first, 80/20 — most effort before code [[guide]](https://every.to/guides/compound-engineering)
2. Compound every unit of work into reusable repo knowledge [[CEP]](https://github.com/EveryInc/compound-engineering-plugin)
3. Simplify as an explicit pipeline step, not an afterthought [[CEP]](https://github.com/EveryInc/compound-engineering-plugin)
4. One person + agents ≈ a team; design workflows for that ratio [[podcast transcript]](https://every.to/podcast/transcript-how-two-engineers-ship-like-a-team-of-15-with-ai-agents)
5. Boring stack, radical process [[SF Ruby keynote]](https://sfruby.com/)
6. Agent-native parity — if a human can run tests, read logs, or open a PR, the agent should be able to as well [[guide]](https://every.to/guides/compound-engineering)
7. Safety nets over gatekeeping — trust comes from tests, automated review, monitoring, and rollback, not line-by-line babysitting [[guide]](https://every.to/guides/compound-engineering)
8. Make institutional knowledge discoverable — solved problems live in `docs/solutions/`, and instruction files must surface that store so future agents find it [[ce-compound-refresh]](https://github.com/EveryInc/compound-engineering-plugin/blob/main/skills/ce-compound-refresh/SKILL.md)

## Workflow

The CEP plugin ships a six-step loop: **brainstorm → plan → work → simplify → review →
compound** [[CEP]](https://github.com/EveryInc/compound-engineering-plugin). Every's own guide
describes the core cycle in four beats — **plan → work → review → compound → repeat** — with
`simplify` being the extra gate the plugin inserts
[[guide]](https://every.to/guides/compound-engineering). The compound step (`/ce-compound`)
writes learnings to `docs/solutions/`, which ground the next loop — knowledge accretes in the
repo, not in heads
[[ce-compound]](https://github.com/EveryInc/compound-engineering-plugin/blob/main/docs/skills/ce-compound.md).
Fully autonomous pipeline (`/lfg`): plan → work → review → PR → watch CI until green. Reviewer
personas live as skill-local prompt assets (29 skills, 0 standalone agents post-migration)
[[CEP]](https://github.com/EveryInc/compound-engineering-plugin).

See [references/stack.md](references/stack.md) for the stack and [references/workflow.md](references/workflow.md) for workflow detail.

## Tensions

- CEP's layout migrated twice in ~6 months (agents folded into skills) — mimic the
  *principles*, expect the mechanics to drift.
- "Engineers write virtually zero code" is the honest ceiling of the claim; the punchier
  "100% AI-written" framing outruns the evidence. Repo history shows human review is the
  load-bearing step. Treat the ratio as directional.

Want a reviewer/pair persona in Every's voice? See [agents/every-developer.md](agents/every-developer.md).
