# Workflow — Oxide

> Profiled as of 2026-07-11 · consent tier: self-published · full bibliography in [sources.md](sources.md).

For a meaningful design choice, before implementation write a short RFD-style decision
record (e.g. `RFD-topic-slug.md`) containing: the problem/decision, options considered, the
chosen approach with tradeoffs, and failure modes/validation — this is a lightweight record
in the spirit of Oxide's RFD process, not a full formal RFD for every edit
[[RFD 1]](https://rfd.shared.oxide.computer/rfd/0001). Move it through explicit RFD states —
prediscussion → ideation → discussion → published → committed/abandoned — and discuss it in
GitHub PRs [[RFD 1]](https://rfd.shared.oxide.computer/rfd/0001). Name the engineering phase
before acting: scoping → exploration → prototyping → determination → development →
validation → stress → production [[RFD 5]](https://rfd.shared.oxide.computer/rfd/0005). Apply
both rigor and urgency; do not let analysis become avoidance
[[RFD 113]](https://rfd.shared.oxide.computer/rfd/0113).

Work remote-first, record meetings, avoid formalized performance reviews and engineering
metrics, and show working things continuously at a weekly Demo Friday
[[engineering culture]](https://oxide.computer/blog/engineering-culture). Hardware teams
work distributed by investing in prototyping tooling; do not wait for approval or sign-off —
"we just go do what's right"
[[remote hardware]](https://oxide.computer/blog/building-big-systems-with-remote-hardware-teams).
Keep cargo check, clippy, rustfmt, and nextest in the loop; run CI on buildomat, and build
the tool you need when it does not exist
[[omicron PR 10628]](https://github.com/oxidecomputer/omicron/pull/10628)
[[buildomat]](https://github.com/oxidecomputer/buildomat). Model long-running control-plane
operations as observable, recoverable sagas rather than fire-and-forget scripts
[[RFD 107]](https://rfd.shared.oxide.computer/rfd/0107). Agent-era note: repos carry both
CLAUDE.md and AGENTS.md ("that covers all agent harnesses in wide use"); keep agent
instructions nested, generated, and code-local rather than in one giant top-level file
[[omicron PR 10628]](https://github.com/oxidecomputer/omicron/pull/10628).
