# Every — dev culture profile

Profiled: 2026-07-11 · Consent tier: **self-published** (they ship their own culture as a
plugin) · Kind: org

## Identity

~15-person company running five products (Cora, Monologue, Sparkle, Spiral, every.to), each
with roughly one-person engineering teams and ~"100% AI-written code"
[[Lenny's]](https://www.lennysnewsletter.com/p/inside-every-dan-shipper). Their practice is
codified in the Compound Engineering Plugin (CEP), ~23k stars
[[CEP]](https://github.com/EveryInc/compound-engineering-plugin).

## Core principle

"Each unit of engineering work should make subsequent units easier — not harder"
[[CEP README]](https://github.com/EveryInc/compound-engineering-plugin). 80% planning/review,
20% execution
[[essay]](https://every.to/chain-of-thought/compound-engineering-how-every-codes-with-agents).

## Workflow shape

Six-step loop: **brainstorm → plan → work → simplify → review → compound**. The compound step
writes learnings to `docs/solutions/`, which ground the next loop — knowledge accretes in the
repo, not in heads [[CEP]](https://github.com/EveryInc/compound-engineering-plugin). Fully
autonomous pipeline (`/lfg`): plan → work → review → PR → watch CI until green. Reviewer
personas live as skill-local prompt assets (29 skills, 0 standalone agents post-migration).

## Stack

"Boring Rails": Ruby on Rails + Turbo/Stimulus/ERB + Tailwind; RubyLLM, StepperMotor, Ahoy,
pgvector for the AI layer (Cora)
[[Kieran's GitHub]](https://github.com/kieranklaassen)
[[SF Ruby keynote]](https://sfruby.com/). Boring, well-understood building blocks under
aggressive AI leverage.

## Principles (cited)

1. Plan-first, 80/20 — most effort before code [[essay]](https://every.to/chain-of-thought/compound-engineering-how-every-codes-with-agents)
2. Compound every unit of work into reusable repo knowledge [[CEP]](https://github.com/EveryInc/compound-engineering-plugin)
3. Simplify as an explicit pipeline step, not an afterthought [[CEP]](https://github.com/EveryInc/compound-engineering-plugin)
4. One person + agents ≈ a team; design workflows for that ratio [[podcast transcript]](https://every.to/podcast/transcript-how-two-engineers-ship-like-a-team-of-15-with-ai-agents)
5. Boring stack, radical process [[Kieran's GitHub]](https://github.com/kieranklaassen)

## Tensions

- CEP's layout migrated twice in ~6 months (agents folded into skills) — mimic the
  *principles*, expect the mechanics to drift.
- "100% AI-written" is a podcast soundbite; repo history shows human review is the load-bearing
  step. Treat the claim as directional.
