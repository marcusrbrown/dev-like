# Harness support

The generated skill is spec-compliant (agentskills.io), so it works natively in 40+ harnesses.
Canonical install path is the vendor-neutral `.agents/skills/`; mirror into harness-specific
dirs only when the harness doesn't read `.agents/skills/`.

| Harness | Project path | Invocation |
|---------|-------------|------------|
| Claude Code | `.claude/skills/` (also reads plugins) | `/develop-like-<slug>` or implicit |
| OpenAI Codex | `.agents/skills/` | `$develop-like-<slug>` or implicit |
| GitHub Copilot | `.github/skills/`, `.agents/skills/` | implicit; `gh skill` to manage |
| Cursor | `.agents/skills/` | implicit |
| Gemini CLI | `.agents/skills/` | implicit |
| opencode | `.agents/skills/` | implicit |
| Amp | `.agents/skills/` | implicit |
| Windsurf | `.windsurf/skills/` | implicit |
| Zed | in-repo skills (v1.4.2+) | catalog / slash command |
| Goose | `.goose/skills/` | implicit |
| Others (55 total) | see `npx skills add --help` | varies |

## Install strategies

1. **This skill writes directly** to `.agents/skills/` and symlinks `.claude/skills/` when
   present. Covers the big harnesses with zero tooling.
2. **`npx skills add marcusrbrown/dev-like`** — Vercel's cross-harness installer symlinks
   into every detected agent (55 supported). Recommended in docs as the universal path.
3. **Claude Code plugin**: `/plugin marketplace add marcusrbrown/dev-like` then
   `/plugin install dev-like` → bare `/dev-like` command.

Per-harness compiled variants (Impeccable-style build step) are deliberately deferred until
repeated user requests justify the added complexity.
