# Stack — Oxide

> Profiled as of 2026-07-11 · consent tier: self-published · full bibliography in [sources.md](sources.md).

Rust nearly everywhere it pays rent: Omicron (control plane) is a very large Cargo
workspace, Hubris (embedded OS), and unsafe Rust handled with published rigor
[[omicron PR 10628]](https://github.com/oxidecomputer/omicron/pull/10628)
[[iddqd]](https://oxide.computer/blog/iddqd-unsafe)
[[Klabnik]](https://steveklabnik.com/writing/memory-safety-is-a-red-herring/). First-party
toolchain: buildomat for CI/jobs, driven from Rust xtasks
[[buildomat]](https://github.com/oxidecomputer/buildomat). Open source with a permissive
lean (MPL-2.0 common), including firmware and root of trust
[[cloud computer]](https://oxide.computer/blog/the-cloud-computer).
