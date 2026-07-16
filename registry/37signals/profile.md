# 37signals — dev culture profile

Profiled: 2026-07-16 · Consent tier: **self-published** (public book, first-party dev blog,
open handbook repo) · Kind: org

## Identity

Makers of Basecamp and HEY, ~70 people, fully distributed across 5 continents, remote since
founding [[how we work]](https://github.com/basecamp/handbook/blob/master/how-we-work.md).
Their planning method — Shape Up — is published as a free book and is also the process they
run their own product teams on [[Shape Up]](https://basecamp.com/shapeup). Engineering
culture leans hard into "boring", server-first Rails and skepticism of unnecessary tooling.

## Core principle

Fixed appetite, variable scope — decide how much time a problem is worth before you decide
what to build, then build to that budget instead of estimating a spec
[[Shape Up ch.1]](https://basecamp.com/shapeup/0.3-chapter-01). Work happens in six-week
cycles with a two-week cooldown between them, and all teams share the same cadence
[[how we work]](https://github.com/basecamp/handbook/blob/master/how-we-work.md).

## Workflow shape

Shaping (defining the problem, appetite, and rough solution) happens ahead of the cycle;
bets are placed at a betting table during cooldown, not pulled from a backlog — "no backlogs"
is explicit doctrine [[Shape Up ch.8]](https://basecamp.com/shapeup/2.2-chapter-08). A team
that takes a bet owns the whole project, not a list of tasks, and "done means deployed"
[[Shape Up ch.10]](https://basecamp.com/shapeup/3.1-chapter-10). Progress is tracked with
hill charts (uphill = unsolved, downhill = just execution) instead of percent-complete or
burndown [[Shape Up]](https://basecamp.com/shapeup). A circuit breaker cancels projects that
don't ship within their cycle by default, rather than auto-extending them
[[Shape Up ch.8]](https://basecamp.com/shapeup/2.2-chapter-08). Cooldown is when bugs get
fixed, cycles get planned, and the next bets get made
[[how we work]](https://github.com/basecamp/handbook/blob/master/how-we-work.md).
QA is a two-person team running manual, guided exploratory testing against ~100-item
per-product checklists (not exhaustive test-case matrices), plus accessibility passes with
screen readers and a home-grown BackstopJS visual-regression suite
[[all about QA]](https://dev.37signals.com/all-about-qa/).

## Stack

Vanilla, server-first Rails: fight hard before adding gems or JS dependencies; Hotwire
(Turbo/Stimulus) for the front end with #nobuild import maps instead of a JS bundler;
Propshaft for assets; solid_cache/solid_queue/solid_cable running on the existing relational
database instead of adding Redis; Minitest with fixtures; deploy with Kamal directly to
VMs/bare metal, no Kubernetes
[[vanilla Rails stack]](https://dev.37signals.com/a-vanilla-rails-stack-is-plenty/). Kamal 2
replaced Traefik with a purpose-built kamal-proxy for gapless, imperative deployments
[[Kamal 2]](https://dev.37signals.com/kamal-2/).

## Principles (cited)

1. Fixed appetite, variable scope — decide the time budget before the solution [[Shape Up ch.1]](https://basecamp.com/shapeup/0.3-chapter-01)
2. Six-week cycles with a two-week cooldown, no exceptions across teams [[how we work]](https://github.com/basecamp/handbook/blob/master/how-we-work.md)
3. No backlogs — shape and bet, don't queue [[Shape Up ch.8]](https://basecamp.com/shapeup/2.2-chapter-08)
4. Hand over whole projects, not task lists; done means deployed [[Shape Up ch.10]](https://basecamp.com/shapeup/3.1-chapter-10)
5. Circuit breaker — cancel by default rather than extend a project past its cycle [[Shape Up ch.8]](https://basecamp.com/shapeup/2.2-chapter-08)
6. Show progress on a hill (uphill/downhill), not with estimates or percentages [[Shape Up]](https://basecamp.com/shapeup)
7. Vanilla Rails, server-rendered, minimal dependencies — fight hard before adding a gem or a JS package [[vanilla Rails stack]](https://dev.37signals.com/a-vanilla-rails-stack-is-plenty/)
8. Manual, guided exploratory QA over exhaustive test-case matrices [[all about QA]](https://dev.37signals.com/all-about-qa/)
9. Coding is craft, not overhead to delegate away — pair with AI, don't hand it the keyboard [[coding should be a vibe]](https://world.hey.com/dhh/coding-should-be-a-vibe-50908f49)

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
