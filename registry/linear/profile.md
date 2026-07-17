# Linear — dev culture profile

Profiled: 2026-07-16 · Consent tier: **self-published** (their own Method site, "Now" blog,
careers page, verified GitHub org) · Kind: org

## Identity

Makers of the Linear project-management tool; small, remote-first team that runs its own
product development on the same principles it sells — "we build better with fewer people"
[[careers]](https://linear.app/careers). Their process is published as "the Linear Method",
a hub of principles and practices explicitly aimed at other product teams, not just an
internal handbook [[Method: introduction]](https://linear.app/method/introduction).

## Core principle

Create momentum, don't sprint — find a cadence and stick to it; the goal is healthy,
sustained momentum across cycles, not a rush to a deadline
[[Method: introduction]](https://linear.app/method/introduction). Paired with a bias for
small scope: "ship early... simplify and ship smaller" is principle #1 of how the company
says it thinks and works [[careers]](https://linear.app/careers).

## Workflow shape

Work runs in *n*-week cycles (2 weeks is typical), unfinished items roll forward
automatically rather than triggering scope negotiation, and a manageable backlog beats an
exhaustive one [[Method: introduction]](https://linear.app/method/introduction). Projects
(defined loosely as "multiple people, more than two weeks of work") are led by a rotating
project lead — nobody is the permanent lead, and the rotation is deliberate so every engineer
learns to run one [[how we run projects]](https://linear.app/now/how-we-run-projects-at-linear).
Leads write concise 1-2 page specs covering why/what/how before building, post weekly project
updates, and use milestones to define "done" per release stage; the weekly product meeting is
built around demos rather than status reports
[[how we run projects]](https://linear.app/now/how-we-run-projects-at-linear). Planning is
continuous, not a scheduled batch process: incoming ideas and requests are triaged directly
into "candidate projects" as they arrive, so a quarter's planning session starts from an
already-vetted list instead of a blank page
[[continuous planning]](https://linear.app/now/continuous-planning-in-linear). Quality is a
weekly team habit, not a phase: every engineer ships at least one small, non-bug quality fix
each week and presents it at a dedicated Wednesday standup ("Quality Wednesdays") — over
1,000 such fixes shipped in two years
[[Quality Wednesdays]](https://linear.app/now/quality-wednesdays).

## Stack

Linear does not publish its internal engineering stack the way 37signals or Every do; its
public technical surface is its own API/SDK ecosystem (TypeScript SDK, CLI tooling, Zapier
and webhook integrations) under the `linear` GitHub org, a verified owner of linear.app
[[GitHub org]](https://github.com/linear). Treat "the stack" here as the product surface, not
a verified internal toolchain — don't invent implementation details beyond what's published.

## Principles (cited)

1. Momentum, not sprints — pick a cadence and hold it [[Method: introduction]](https://linear.app/method/introduction)
2. Ship early, ship smaller — simplify scope before building [[careers]](https://linear.app/careers)
3. Rotating project leads — ownership is real but not permanent; everyone learns the role [[how we run projects]](https://linear.app/now/how-we-run-projects-at-linear)
4. Write concise specs (1-2 pages) before building, not after [[how we run projects]](https://linear.app/now/how-we-run-projects-at-linear)
5. Candidate projects as the continuous unit of planning — triage as ideas arrive, don't wait for a planning ritual [[continuous planning]](https://linear.app/now/continuous-planning-in-linear)
6. Quality is a weekly habit, not a milestone gate — one small fix per engineer per week, every week [[Quality Wednesdays]](https://linear.app/now/quality-wednesdays)
7. Avoid side quests — don't fix every problem, don't add process or documents you don't need [[careers]](https://linear.app/careers)
8. Think in principles, not playbooks [[careers]](https://linear.app/careers)
9. Keep the team small, do more with less; wear multiple hats [[careers]](https://linear.app/careers)

## Tensions

- The Linear Method is, transparently, product marketing for Linear the tool — nearly every
  practice page frames itself in terms of how "the Linear app easily facilitates" it
  [[continuous planning]](https://linear.app/now/continuous-planning-in-linear). The
  principles (momentum, small scope, rotating ownership, concise specs) are genuinely
  extractable and tool-agnostic, but read the workflow docs as advocacy, not neutral
  reporting.
- "How we run projects" is a 2023 interview and "Quality Wednesdays" describes a practice
  that started in 2023 and was written up in 2025
  [[Quality Wednesdays]](https://linear.app/now/quality-wednesdays) — solid provenance, but
  older than the AI-driven "continuous planning" post from October 2025, which now folds AI
  triage suggestions directly into the workflow
  [[continuous planning]](https://linear.app/now/continuous-planning-in-linear). Linear's AI
  posture reads as a recent, still-evolving product direction (AI-assisted triage, an
  advertised "AI" product page) layered onto an older, more stable process — not a deep,
  long-held engineering philosophy the way Rails-vanilla or Shape Up are for 37signals.
- No published internal engineering stack (languages, frameworks, deploy tooling) — only the
  public SDK/integration surface is verifiable [[GitHub org]](https://github.com/linear).
  Don't extrapolate an internal stack from the open-source repos; they're developer-facing
  tooling, not necessarily what Linear's own product is built with.
