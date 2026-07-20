---
name: develop-like-37signals
description: >-
  Develop the way 37signals (the company) does: shape up cycles/betting/circuit-breaker, vanilla server-first Rails, manual exploratory QA over dogma. Use when the user wants
  37signals-style engineering decisions, code review in 37signals's voice, or asks to
  "develop like 37signals". Profiled 2026-07-16 from public sources.
license: MIT
metadata:
  author: marcusrbrown
  generator: dev-like
  profiled: "2026-07-16"
  consent-tier: "self-published"
  source: https://github.com/marcusrbrown/dev-like/tree/main/registry/37signals
---

# Develop like 37signals

> Profiled as of 2026-07-16 · consent tier: self-published · full bibliography in [references/sources.md](references/sources.md). Cultures drift — if this is more than ~6 months old, re-run `/dev-like 37signals` to refresh.

## Core principle

Fixed appetite, variable scope — decide how much time a problem is worth before you decide
what to build, then build to that budget instead of estimating a spec
[[Shape Up ch.1]](https://basecamp.com/shapeup/0.3-chapter-01). Work happens in six-week
cycles with a two-week cooldown between them, and all teams share the same cadence
[[how we work]](https://github.com/basecamp/handbook/blob/master/how-we-work.md).

## Principles

1. Fixed appetite, variable scope — decide the time budget before the solution [[Shape Up ch.1]](https://basecamp.com/shapeup/0.3-chapter-01)
2. Six-week cycles with a two-week cooldown, no exceptions across teams [[how we work]](https://github.com/basecamp/handbook/blob/master/how-we-work.md)
3. No backlogs — shape and bet, don't queue [[Shape Up ch.8]](https://basecamp.com/shapeup/2.2-chapter-08)
4. Hand over whole projects, not task lists; done means deployed [[Shape Up ch.10]](https://basecamp.com/shapeup/3.1-chapter-10)
5. Circuit breaker — cancel by default rather than extend a project past its cycle [[Shape Up ch.8]](https://basecamp.com/shapeup/2.2-chapter-08)
6. Show progress on a hill (uphill/downhill), not with estimates or percentages [[Shape Up]](https://basecamp.com/shapeup)
7. Vanilla Rails, server-rendered, minimal dependencies — fight hard before adding a gem or a JS package [[vanilla Rails stack]](https://dev.37signals.com/a-vanilla-rails-stack-is-plenty/)
8. Manual, guided exploratory QA over exhaustive test-case matrices [[all about QA]](https://dev.37signals.com/all-about-qa/)
9. Coding is craft, not overhead to delegate away — pair with AI, don't hand it the keyboard [[coding should be a vibe]](https://world.hey.com/dhh/coding-should-be-a-vibe-50908f49)

## Workflow

Execute these checkpoints before and during the task. Treat them as required actions, not
background description:

Before the cycle, shape the problem, state the appetite, and sketch the rough solution. During
cooldown, place bets at a betting table; do not pull them from a backlog — "no backlogs" is
explicit doctrine [[Shape Up ch.8]](https://basecamp.com/shapeup/2.2-chapter-08). When you take
a bet, own the whole project, not a list of tasks, and define done as deployed
[[Shape Up ch.10]](https://basecamp.com/shapeup/3.1-chapter-10). Track progress with hill
charts (uphill = unsolved, downhill = just execution), not percent-complete or burndown
[[Shape Up]](https://basecamp.com/shapeup). Use a circuit breaker: cancel projects that don't
ship within their cycle by default rather than auto-extending them
[[Shape Up ch.8]](https://basecamp.com/shapeup/2.2-chapter-08). During cooldown, fix bugs, plan
cycles, and make the next bets
[[how we work]](https://github.com/basecamp/handbook/blob/master/how-we-work.md).
As a two-person QA team, run manual, guided exploratory testing against ~100-item
per-product checklists (not exhaustive test-case matrices), then run accessibility passes with
screen readers and the home-grown BackstopJS visual-regression suite
[[all about QA]](https://dev.37signals.com/all-about-qa/).

See [references/stack.md](references/stack.md) for the stack and [references/workflow.md](references/workflow.md) for workflow detail.

## Tensions

- Manual QA is a deliberate, celebrated practice — two people running guided exploratory
  passes and checklists, not automated end-to-end suites
  [[all about QA]](https://dev.37signals.com/all-about-qa/). That's a real bet against
  TDD/heavy-automation dogma; it works because their QA staff are experienced generalists
  embedded in the Shape Up cycle, not because automated testing doesn't matter — Minitest and
  fixtures are still standard practice in the stack
  [[vanilla Rails stack]](https://dev.37signals.com/a-vanilla-rails-stack-is-plenty/). Don't
  read "manual QA works for them" as "skip your test suite."
- AI posture is genuinely split by voice and by time. DHH is on record wanting to keep his
  hands on the keyboard and treating full vibe-coding handoff with suspicion
  [[coding should be a vibe]](https://world.hey.com/dhh/coding-should-be-a-vibe-50908f49),
  while a year later the company shipped a fully agent-accessible Basecamp — revamped API,
  CLI, and a bundled skill for agent harnesses
  [[agent-accessible]](https://world.hey.com/dhh/basecamp-becomes-agent-accessible-3ae6b949).
  Mimic the trajectory (cautious about full autonomy in the editor, enthusiastic about making
  the product agent-operable), not a single fixed stance.
- Shape Up's six-week/two-week cadence assumes a company that can hold "all teams operate on
  the same 6-week cadence"
  [[how we work]](https://github.com/basecamp/handbook/blob/master/how-we-work.md) — a
  ~70-person, cross-functional, deeply synced org. It doesn't obviously survive contact with
  much larger or less disciplined organizations without adaptation, which the book itself
  acknowledges (Appendix: "Adjust to Your Size") [[Shape Up]](https://basecamp.com/shapeup).

Want a reviewer/pair persona in 37signals's voice? See [personas/37signals-developer.md](personas/37signals-developer.md) — it's reference material. Claude Code users can copy it to `.claude/agents/` to run it as a first-class subagent; other harnesses may need their own harness-specific metadata.
