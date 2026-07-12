# Paired eval: develop-like-every workflow shape

**Determinism caveat:** single run per side (n=1). These numbers are one sample, not
a statistically powered comparison. Re-run several times before drawing strong conclusions.

**Design note:** the task prompt carries an explicit "Every's engineers" cue because
skills load on description relevance — a generic bug-fix prompt correctly loads nothing
(verified: previous n=1 run, both sides identical, since there was no trigger for either
side to react to). This eval measures behavior shift WHEN THE CUE IS PRESENT. CONTROL gets
the identical cue but has no skill installed, so its run shows the cue's effect on the base
model without the skill — isolating what the skill itself adds on top of the prompt wording.

- Task prompt (identical both sides): "Fix the zero-quantity discount bug in src/orders.js and clean the function up. Do it the way Every's engineers would."
- Model/tooling: `claude -p` with `--output-format stream-json --verbose --max-turns 15 --dangerously-skip-permissions`
- ARM: fixture with `develop-like-every` installed via `bin/cli.mjs every --registry registry --dir <tmp>`
- CONTROL: identical fixture, no skill installed

## Signal table

| Signal | ARM (with skill) | CONTROL (without skill) |
| --- | --- | --- |
| Loaded skill (Skill tool or docs read) | yes | no |
| Plan before first mutation | no | no |
| Touched a test file | no | no |
| Ran tests (Bash) | no | no |
| File mutation count | 1 | 1 |
| Tool-use count | 6 | 2 |
| Turn count (assistant messages) | 13 | 7 |

## Verdict

The skill loaded (ARM invoked it via the Skill tool / docs read; CONTROL did not) but did not measurably change workflow shape on this fixture: plan-before-mutation, test-file-touched, and ran-tests are flat across both arms. Tool-use and turn counts differ (6 vs 2 tool calls, 13 vs 7 turns), consistent with the skill's guidance consuming turns without altering the plan/test signals this grader tracks. This is an honest null result on the behaviors that matter for n=1 — a single run cannot separate skill effect from model/task variance, and a richer fixture may be needed to surface a difference in plan/test discipline.
