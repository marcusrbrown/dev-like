# Workflow — Oxide

> Profiled as of 2026-07-11 · consent tier: self-published · full bibliography in [sources.md](sources.md).

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
