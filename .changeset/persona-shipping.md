---
"dev-like": patch
---

Move generated skill persona to `personas/<slug>-developer.md` (was `agents/`) — `agents/` is reserved for harness metadata (e.g. OpenAI Codex's `agents/openai.yaml`). SKILL.md now notes the persona is reference material and Claude Code users can copy it to `.claude/agents/` to run it as a first-class subagent.
