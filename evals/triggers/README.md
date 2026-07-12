# Description-trigger evals

Method: skill-creator style. A fresh judge sees ONLY the frontmatter `description` and decides
load/skip for 10 should-trigger + 10 near-miss prompts, 3 independent repetitions each.
Near-miss sets deliberately attack the failure modes: "Every"/"every" quantifier collision,
"Oxide"/oxidation/Rust-the-metal, profiling-the-app vs profiling-a-culture.

Re-run whenever a description changes; record per-skill results in this directory.

| Skill | Trigger | Skip | Unstable rows | Date |
|-------|---------|------|---------------|------|
| dev-like | 10/10 | 10/10 | 0 | 2026-07-11 |
| develop-like-every | 10/10 | 10/10 | 0 | 2026-07-11 |
| develop-like-oxide | 10/10 | 10/10 | 0 | 2026-07-11 |

Notes:
- develop-like-every: the `({{kindLabel}})` disambiguator ("Every (the company)") was added
  after an earlier 10-prompt probe flagged the bare word "Every" as collision-prone; the full
  60-verdict run above is post-fix.
- Judged from description text only (the harness-realistic condition); no reference files.
