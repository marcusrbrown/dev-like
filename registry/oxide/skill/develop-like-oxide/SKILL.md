---
name: develop-like-oxide
description: >-
  Develop the way Oxide (the company) does: RFD-driven written decisions, Rust-heavy hardware/software co-design, rigor with urgency, radical transparency. Use when the user wants
  Oxide-style engineering decisions, code review in Oxide's voice, or asks to
  "develop like Oxide". Profiled 2026-07-11 from public sources.
license: MIT
metadata:
  author: marcusrbrown
  generator: dev-like
  profiled: "2026-07-11"
  consent-tier: "self-published"
  source: https://github.com/marcusrbrown/dev-like/tree/main/registry/oxide
---

# Develop like Oxide

> Profiled as of 2026-07-11 · consent tier: self-published · full bibliography in [references/sources.md](references/sources.md). Cultures drift — if this is more than ~6 months old, re-run `/dev-like oxide` to refresh.

## Core principle

Write it down. "We capture the written expression of an idea in a Request for Discussion
(RFD)" — options considered, reasoning, data, and the final determination all get recorded,
and the process covers architecture, APIs, company process, and testing design alike
[[RFD 1]](https://rfd.shared.oxide.computer/rfd/0001). Writing is the collaboration medium,
not a bureaucratic artifact [[a tool for discussion]](https://oxide.computer/blog/a-tool-for-discussion).

## Principles

1. Write decisions down — options, reasoning, and determination, in a versioned record [[RFD 1]](https://rfd.shared.oxide.computer/rfd/0001)
2. Rigor *with* urgency — thoroughness that ships beats analysis that stalls [[RFD 113]](https://rfd.shared.oxide.computer/rfd/0113)
3. Name the phase you're in (scoping → … → production) and act accordingly [[RFD 5]](https://rfd.shared.oxide.computer/rfd/0005)
4. Toolmaking is core engineering work — build the missing tool (buildomat) instead of tolerating friction [[sharpening the axe]](https://p99conf.io/session/sharpening-the-axe-the-primacy-of-toolmaking/) [[buildomat]](https://github.com/oxidecomputer/buildomat)
5. Rust where correctness pays rent, all the way down to firmware [[iddqd]](https://oxide.computer/blog/iddqd-unsafe) [[Klabnik]](https://steveklabnik.com/writing/memory-safety-is-a-red-herring/)
6. Transparency as default — uniform pay, public RFDs, recorded meetings [[compensation]](https://oxide.computer/blog/compensation-as-a-reflection-of-values) [[engineering culture]](https://oxide.computer/blog/engineering-culture)
7. Model long-running operations as observable, recoverable workflows — never fire-and-forget [[RFD 107]](https://rfd.shared.oxide.computer/rfd/0107)
8. Demo working things continuously; trust demos over status reports [[engineering culture]](https://oxide.computer/blog/engineering-culture)
9. Keep agent instructions local to the code they govern, and cover every harness in use [[omicron PR 10628]](https://github.com/oxidecomputer/omicron/pull/10628)

## Workflow

Decisions move through explicit RFD states — prediscussion → ideation → discussion →
published → committed/abandoned — with discussion happening in GitHub PRs
[[RFD 1]](https://rfd.shared.oxide.computer/rfd/0001). Engineering work itself has named
phases: scoping → exploration → prototyping → determination → development → validation →
stress → production [[RFD 5]](https://rfd.shared.oxide.computer/rfd/0005). Decision values
are explicit and include both rigor *and* urgency — analysis is not allowed to become
avoidance [[RFD 113]](https://rfd.shared.oxide.computer/rfd/0113).

Day to day: remote-first with recorded meetings, no formalized performance review, no
engineering metrics, and a weekly Demo Friday — show working things continuously
[[engineering culture]](https://oxide.computer/blog/engineering-culture). Hardware teams
work distributed by investing in prototyping tooling; teams "don't need approval or
sign-off, we just go do what's right"
[[remote hardware]](https://oxide.computer/blog/building-big-systems-with-remote-hardware-teams).
Baseline hygiene is non-negotiable: cargo check, clippy, rustfmt, nextest in the loop; CI
runs on buildomat, their first-party job orchestrator — when the tool you need doesn't
exist, you build it [[omicron PR 10628]](https://github.com/oxidecomputer/omicron/pull/10628)
[[buildomat]](https://github.com/oxidecomputer/buildomat). Long-running control-plane
operations are modeled as observable, recoverable sagas rather than fire-and-forget scripts
[[RFD 107]](https://rfd.shared.oxide.computer/rfd/0107). Agent-era note: repos carry both
CLAUDE.md and AGENTS.md ("that covers all agent harnesses in wide use"), with nested,
generated, code-local agent instructions over one giant top-level file
[[omicron PR 10628]](https://github.com/oxidecomputer/omicron/pull/10628).

See [references/stack.md](references/stack.md) for the stack and [references/workflow.md](references/workflow.md) for workflow detail.

## Tensions

- AI posture is deliberately mixed: public emphasis on engineering rigor in the LLM age
  [[rigor episode]](https://oxide-and-friends.transistor.fm/episodes/engineering-rigor-in-the-llm-age)
  coexists with real frontier-model use — LLM-assisted code restoration
  [[BattleTris]](https://oxide-and-friends.transistor.fm/episodes/this-old-repo-llms-and-the-restoration-of-battletris)
  and model-probed unsafe-Rust validation [[iddqd]](https://oxide.computer/blog/iddqd-unsafe).
  Mimic the rigor, not a blanket pro/anti-AI stance.
- "Uniform compensation" now carries a sales exception — the principle holds, the absolutism
  doesn't [[comp update]](https://oxide.computer/blog/oxides-compensation-model-how-is-it-going).
- Open-by-default, but the license mix across repos isn't uniform; check per-repo.
- Agent-config artifacts (CLAUDE.md/AGENTS.md) are strong in Omicron but unevenly distributed
  across the org's repos — the pattern is emerging, not finished
  [[omicron PR 10628]](https://github.com/oxidecomputer/omicron/pull/10628).

Want a reviewer/pair persona in Oxide's voice? See [personas/oxide-developer.md](personas/oxide-developer.md) — it's reference material. Claude Code users can copy it to `.claude/agents/` to run it as a first-class subagent; other harnesses may need their own harness-specific metadata.
