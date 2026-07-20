# Oxide — dev culture profile

Profiled: 2026-07-11 · Consent tier: **self-published** (public RFDs, first-party blog,
open repos) · Kind: org

## Identity

Oxide Computer Company builds rack-scale computers with hardware/software co-designed from
scratch — server sled, root of trust, hypervisor, control plane, console — nearly all of it
open source [[cloud computer]](https://oxide.computer/blog/the-cloud-computer). Remote-first,
famously transparent (uniform compensation, public decision records), and the practice is
unusually legible from outside: the decision process itself is published
[[RFD 1]](https://rfd.shared.oxide.computer/rfd/0001).

## Core principle

Write it down. "We capture the written expression of an idea in a Request for Discussion
(RFD)" — options considered, reasoning, data, and the final determination all get recorded,
and the process covers architecture, APIs, company process, and testing design alike
[[RFD 1]](https://rfd.shared.oxide.computer/rfd/0001). Writing is the collaboration medium,
not a bureaucratic artifact [[a tool for discussion]](https://oxide.computer/blog/a-tool-for-discussion).

## Workflow shape

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

## Stack

Rust nearly everywhere it pays rent: Omicron (control plane) is a very large Cargo
workspace, Hubris (embedded OS), and unsafe Rust handled with published rigor
[[omicron PR 10628]](https://github.com/oxidecomputer/omicron/pull/10628)
[[iddqd]](https://oxide.computer/blog/iddqd-unsafe)
[[Klabnik]](https://steveklabnik.com/writing/memory-safety-is-a-red-herring/). First-party
toolchain: buildomat for CI/jobs, driven from Rust xtasks
[[buildomat]](https://github.com/oxidecomputer/buildomat). Open source with a permissive
lean (MPL-2.0 common), including firmware and root of trust
[[cloud computer]](https://oxide.computer/blog/the-cloud-computer).

## Principles (cited)

1. Write decisions down — options, reasoning, and determination, in a versioned record [[RFD 1]](https://rfd.shared.oxide.computer/rfd/0001)
2. Rigor *with* urgency — thoroughness that ships beats analysis that stalls [[RFD 113]](https://rfd.shared.oxide.computer/rfd/0113)
3. Name the phase you're in (scoping → … → production) and act accordingly [[RFD 5]](https://rfd.shared.oxide.computer/rfd/0005)
4. Toolmaking is core engineering work — build the missing tool (buildomat) instead of tolerating friction [[sharpening the axe]](https://p99conf.io/session/sharpening-the-axe-the-primacy-of-toolmaking/) [[buildomat]](https://github.com/oxidecomputer/buildomat)
5. Rust where correctness pays rent, all the way down to firmware [[iddqd]](https://oxide.computer/blog/iddqd-unsafe) [[Klabnik]](https://steveklabnik.com/writing/memory-safety-is-a-red-herring/)
6. Transparency as default — uniform pay, public RFDs, recorded meetings [[compensation]](https://oxide.computer/blog/compensation-as-a-reflection-of-values) [[engineering culture]](https://oxide.computer/blog/engineering-culture)
7. Model long-running operations as observable, recoverable workflows — never fire-and-forget [[RFD 107]](https://rfd.shared.oxide.computer/rfd/0107)
8. Demo working things continuously; trust demos over status reports [[engineering culture]](https://oxide.computer/blog/engineering-culture)
9. Keep agent instructions local to the code they govern, and cover every harness in use [[omicron PR 10628]](https://github.com/oxidecomputer/omicron/pull/10628)

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
