# Dry run: develop-like-every on a scratch project

Date: 2026-07-11 · dev-like 0.2.0 · Claude Code headless (`claude -p`, same prompt both sides)

## Setup

```console
$ npx -y dev-like@latest every
write .agents/skills/develop-like-every/SKILL.md
write .agents/skills/develop-like-every/agents/every-developer.md
write .agents/skills/develop-like-every/references/sources.md
write .agents/skills/develop-like-every/references/stack.md
write .agents/skills/develop-like-every/references/workflow.md
symlink .claude/skills/develop-like-every -> ../../.agents/skills/develop-like-every
Done. Invoke /develop-like-every or let it trigger implicitly in your agent.
```

Prompt (both runs): *"Review this plan the way Every's engineers would: 'Ship a quick
user-analytics dashboard by writing raw SQL in the controller, skip tests to move fast, add
Redis for caching.'"*

## Without the skill

> **Raw SQL in the controller** — This conflates data access with request handling. When the
> query needs changing (and it will), you're hunting through controller logic. Extract it to a
> repository or service layer; it takes 10 minutes and saves hours later.
>
> **Skip tests to move fast** — Analytics dashboards have a nasty failure mode: they silently
> return wrong numbers. No crash, no alert, just bad decisions made on bad data. A few
> query-level integration tests against fixture data are cheap insurance. "Move fast" on a
> dashboard that's lying to you isn't fast.
>
> **Redis for caching** — This is the most premature call. You don't know your query is slow
> yet. Profile first. Often a single index eliminates the need entirely. Redis adds operational
> overhead, cache invalidation complexity, and a new failure mode (stale data) — none of which
> you want on a v1 analytics page. If you do need it, add it when you have evidence.
>
> **The real Every critique:** This plan optimizes for the appearance of speed. Skipping
> structure and tests on data-critical code tends to produce a dashboard that's fast to ship
> and slow to trust. Do it right the first time — it's not much slower.

Solid generic senior-engineer review. "Every" is a label, not a lens — nothing traces to how
Every actually works.

## With develop-like-every installed

> **Every's verdict: this plan optimizes for the wrong kind of speed.**
>
> Every's core test is simple: *does this unit of work make the next one easier or harder?*
> This plan fails it on all three counts.
>
> **Raw SQL in the controller** — hard no. Queries buried in controllers aren't discoverable by
> the next engineer or agent. Extract them into a scope or query object so they compound into
> reusable repo knowledge. This is a one-time cost that pays forward indefinitely.
>
> **Skip tests** — this is where the plan most directly contradicts Every's model. Tests aren't
> a tax on speed; they're how you maintain speed as agents take over more execution. Without
> them, you've broken agent-native parity: the agent can't verify its own changes, so a human
> has to babysit every merge. You've traded a future of autonomous pipelines for a slightly
> faster first deploy.
>
> **Redis for caching** — premature. Every defaults to boring stack. Add an index, measure,
> then decide. Introducing Redis before you have evidence of a bottleneck is complexity debt on
> top of the other debt you're already taking.
>
> **Replan:** spend 80% of the time designing the data model and query layer, write the tests,
> ship without Redis. Cache when a slow query proves you need it.

The review now runs on Every's actual operating model, all traceable to cited sources in the
installed skill: the compound test ("each unit of work should make subsequent units easier"),
agent-native parity, the 80/20 plan-first split, boring-stack defaults.
