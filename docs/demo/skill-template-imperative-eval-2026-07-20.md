# Eval: imperative workflow sections in generated skills

Date: 2026-07-20 · regenerated from the skill template on the `skill-template-imperative-workflow` branch · Claude Code headless (`claude -p`)

This is a two-task follow-up to issue #23. Each run used a fresh scratch project with the
regenerated skill copied from the corresponding `registry/<slug>/skill/` tree. The prompts
are the same cue-assisted prompts used by the existing dry-run docs.

## 37signals

Prompt:

> Approach this the way 37signals would: Add a notifications system: email notifications,
> in-app notification center with unread badges, daily digest emails, and per-user
> notification preferences. We want this shipped in about two weeks. Plan and implement.

The generated workflow now starts with an imperative checkpoint: “Execute these checkpoints
before and during the task. Treat them as required actions, not background description.” The
run did cut scope and name the cut explicitly:

> ## What's explicitly out of scope for this cycle
> - WebSocket real-time badge streaming (Turbo Drive covers it on navigation; add `ActionCable`
>   broadcast later if users actually ask for it)
> - Mobile push
> - Notification grouping/threading
> - Per-event digest granularity (v1 digest is all-or-nothing per user)

It also organized the implementation into “Week 1 deliverables” and “Week 2 deliverables.”
This is a positive transfer: the agent treated the two-week request as a scope boundary and
listed what it would not build, rather than implementing every requested feature. The output
does not use the word “appetite” or explicitly restate “two weeks” as a named constraint, so
the stronger appetite wording still deserves a follow-up eval.

## Oxide

Prompt:

> Approach this the way Oxide would: add a caching layer to service.rs so that fetch_profile
> doesn't hit the slow upstream call on every request. Implement it.

The generated workflow now presents checkpointed imperatives, including moving through RFD
states and naming the engineering phase before acting. The run still did not produce an
RFD-style decision document before code. Its output immediately summarized implementation
choices, including:

> **Read lock dropped before the upstream call** — the block with `if let Some(...)` borrows
> from the `RwLock` only for the duration of the guard. When `return` isn't taken, Rust drops
> the guard at the closing `}`, so `fetch_from_upstream` runs without holding any lock.

It also said:

> **No double-checked locking ceremony** — after the upstream call we just insert. If two
> threads race on the same `user_id`, the second write is a no-op overwrite of an identical
> value.

No RFD-shaped file or decision record appeared in the scratch project, and the response went
straight to implementation reasoning. The RFD-first behavior remains a negative result.

## Verdict

The imperative workflow rewrite transferred the 37signals scope-cutting behavior in this run:
the agent listed four deliberate out-of-scope items. It did not transfer Oxide's
decision-doc-first behavior: the agent still reasoned in its final response and went straight
to code. This is a mixed result, not a clean fix; the n=2 evidence now contains one positive
workflow-discipline transfer and one unchanged miss.

**Follow-up (2026-07-20):** a later artifact-first revision names a concrete pre-code
decision record and produced RFD-first artifacts in 2/2 fresh runs — see
[oxide-artifact-first-eval-2026-07-20.md](oxide-artifact-first-eval-2026-07-20.md). The
negative result documented above remains the baseline; it is not rewritten.
