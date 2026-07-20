# Eval: artifact-first Oxide workflow (issue #23 follow-up)

Date: 2026-07-20 · regenerated `develop-like-oxide` on the `oxide-artifact-first-workflow`
branch · Claude Code headless (`claude -p --max-turns 12 --dangerously-skip-permissions`)

## Baseline

`docs/demo/skill-template-imperative-eval-2026-07-20.md` (lines 34–64) documented the
negative result this follow-up targets: even with checkpointed imperatives ("move through
RFD states," "name the engineering phase before acting"), the agent went straight to code —
no RFD-shaped file, no decision record, only terminal-only rationale.

## Change under test

`registry/oxide/profile.md`'s Workflow shape section, first sentence, now reads (regenerated
into `registry/oxide/skill/develop-like-oxide/references/workflow.md` and `SKILL.md`
verbatim):

> For a meaningful design choice, before implementation write a short RFD-style decision
> record (e.g. `RFD-topic-slug.md`) containing: the problem/decision, options considered, the
> chosen approach with tradeoffs, and failure modes/validation — this is a lightweight record
> in the spirit of Oxide's RFD process, not a full formal RFD for every edit.

This names a concrete artifact (a file), states its minimum contents, and requires it before
implementation — the general rule added to `skills/dev-like/references/distilling.md`.

## Prompt (identical to baseline)

> Approach this the way Oxide would: add a caching layer to service.rs so that fetch_profile
> doesn't hit the slow upstream call on every request. Implement it.

## Setup

Two fresh scratch directories, each with the regenerated `develop-like-oxide` skill copied to
`.claude/skills/develop-like-oxide/` and the same `service.rs` fixture used by
`oxide-dryrun-2026-07-16.md` (a `ProfileService` whose `fetch_profile` calls a 200 ms-sleep
`call_upstream` on every invocation, no caching).

## Run 1

Files produced: `RFD-profile-cache.md` (3020 bytes, mtime 11:28:29) and `service.rs` (mtime
11:28:38) — the RFD file's mtime precedes the code file's by 9 seconds, consistent with the
model writing the record before implementing.

`RFD-profile-cache.md` contains all four required sections: **Problem** (upstream latency on
every call), **Options considered** (A: `Mutex`, B: `RwLock` — chosen, C: external crate,
each with a stated tradeoff), **Chosen approach: B** (with concrete implementation steps),
**Failure modes** (unbounded growth, upstream errors, poisoned lock), and **Validation**
(timing-based test description). It also carries an RFD-style `State: committed` header.

Terminal output named the artifact directly: "The decision record is in
`RFD-profile-cache.md` and explicitly names the two things to revisit when requirements
change."

**Result: pass.** Artifact created, minimum contents present, code followed the artifact.

## Run 2

Files produced: `RFD-profile-cache.md` (2411 bytes, mtime 11:31:20) and `service.rs` (mtime
11:31:30) — RFD file 10 seconds ahead of the code file.

`RFD-profile-cache.md` contains **Problem**, **Options considered** (a comparison table:
external cache, in-process LRU, `HashMap` + TTL under `Mutex` — chosen, `moka`), **Decision**
(with rationale bullets), **Tradeoffs** (lock contention, thundering herd, staleness window),
**Failure modes** (lock poisoning, clock monotonicity), and **Validation**.

Terminal output referenced it: "RFD-profile-cache.md records the alternatives (Redis, `lru`,
`moka`) and the reasoning for not choosing them, so the next person to touch this file knows
what was considered."

**Result: pass.** Same shape as run 1, independently produced, different candidate options
and file layout — not a templated repeat.

## Verdict

**2/2 — RFD-first behavior transferred consistently in this n=2 sample.** Both runs created a
named `RFD-*.md` decision record before writing `service.rs`, and both records contained all
four required minimum sections (problem, options considered, chosen approach/tradeoffs,
failure modes). File-mtime ordering in both runs is consistent with artifact-before-code
(record ~9–10 seconds ahead of the code file in both cases; this is corroborating, not proof
of intra-session ordering, since Claude Code can batch file writes).

This is a clear improvement over the documented baseline, which produced zero RFD-shaped
files across the same prompt. It does not establish the behavior at scale — n=2, one model
version, one task family (a concurrency/caching design choice), one cue-assisted prompt
("the way Oxide would"). No claim is made here that Oxide's generated skill produces a full
formal RFD for every code change; the instruction and both observed artifacts are explicitly
scoped to "a meaningful design choice," matching Oxide's actual RFD process description
(RFD 1) for what warrants a written record.

## Caveats

- n=2, not a large sample; both runs targeted the same fixture and task family.
- Cue-assisted prompt, consistent with the existing baseline and dry-run methodology — this
  eval does not test implicit triggering.
- File-mtime ordering is a proxy for "artifact before code," not a guarantee; the harness did
  not instrument tool-call ordering directly.
