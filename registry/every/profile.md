# Every — dev culture profile

Profiled: 2026-07-11 · Consent tier: **self-published** (they ship their own culture as a
plugin) · Kind: org

## Identity

~15-person company running five products (Cora, Monologue, Sparkle, Spiral, every.to), each
with roughly one-person engineering teams whose engineers "write virtually zero code"
[[Lenny's]](https://www.lennysnewsletter.com/p/inside-every-dan-shipper). Their practice is
codified in the Compound Engineering Plugin (CEP), ~23k stars
[[CEP]](https://github.com/EveryInc/compound-engineering-plugin).

## Core principle

"Each unit of engineering work should make subsequent units easier — not harder"
[[CEP README]](https://github.com/EveryInc/compound-engineering-plugin). Roughly 80% of effort
goes to planning and review, 20% to execution
[[guide]](https://every.to/guides/compound-engineering).

## Workflow shape

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

## Stack

"Boring Rails": Ruby on Rails + Turbo/Stimulus/ERB + Tailwind; RubyLLM, StepperMotor, Ahoy,
pgvector for the AI layer (Cora)
[[SF Ruby keynote]](https://sfruby.com/). Boring, well-understood building blocks under
aggressive AI leverage.

## Principles (cited)

1. Plan-first, 80/20 — most effort before code [[guide]](https://every.to/guides/compound-engineering)
2. Compound every unit of work into reusable repo knowledge [[CEP]](https://github.com/EveryInc/compound-engineering-plugin)
3. Simplify as an explicit pipeline step, not an afterthought [[CEP]](https://github.com/EveryInc/compound-engineering-plugin)
4. One person + agents ≈ a team; design workflows for that ratio [[podcast transcript]](https://every.to/podcast/transcript-how-two-engineers-ship-like-a-team-of-15-with-ai-agents)
5. Boring stack, radical process [[SF Ruby keynote]](https://sfruby.com/)
6. Agent-native parity — if a human can run tests, read logs, or open a PR, the agent should be able to as well [[guide]](https://every.to/guides/compound-engineering)
7. Safety nets over gatekeeping — trust comes from tests, automated review, monitoring, and rollback, not line-by-line babysitting [[guide]](https://every.to/guides/compound-engineering)
8. Make institutional knowledge discoverable — solved problems live in `docs/solutions/`, and instruction files must surface that store so future agents find it [[ce-compound-refresh]](https://github.com/EveryInc/compound-engineering-plugin/blob/main/skills/ce-compound-refresh/SKILL.md)

## Tensions

- CEP's layout migrated twice in ~6 months (agents folded into skills) — mimic the
  *principles*, expect the mechanics to drift.
- "Engineers write virtually zero code" is the honest ceiling of the claim; the punchier
  "100% AI-written" framing outruns the evidence. Repo history shows human review is the
  load-bearing step. Treat the ratio as directional.
