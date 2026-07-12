# Cross-harness verification — 2026-07-11

Verified the three install/invocation paths for `dev-like` against real CLI tooling on this
machine. Codex and Cursor are **not installed** here; both are documented in
`skills/dev-like/references/harnesses.md` as `.agents/skills/` readers (same install surface
GitHub Copilot uses), so Copilot CLI stood in as the "+1 more harness" for Probe 3.

Tooling versions: `claude` 2.1.128, `copilot` 1.0.69 (GitHub Copilot CLI), `npx skills` (latest
via npx), `gh` (Homebrew).

## Probe 1 — Claude Code plugin marketplace: **PASS** (after manifest fix)

```
$ claude plugin marketplace add marcusrbrown/dev-like
Adding marketplace…Cloning via SSH: git@github.com:marcusrbrown/dev-like.git
✔ Successfully added marketplace: dev-like (declared in user settings)

$ claude plugin install dev-like@dev-like
Installing plugin "dev-like@dev-like"...
✘ Failed to install plugin "dev-like@dev-like": This plugin uses a source type
  your Claude Code version does not support. Update Claude Code and try again.
```

Root cause: relative plugin sources must start with `./` per the marketplace schema — `"."`
is invalid, and working root-plugin marketplaces (EveryInc/compound-engineering-plugin,
anthropics/skills, browserbase/skills) all ship `"source": "./"`. Fixed in
`.claude-plugin/marketplace.json` (commit 5123b2f) and re-verified end-to-end:

```
$ claude plugin install dev-like@dev-like
✔ Successfully installed plugin: dev-like@dev-like (scope: user)

$ cd <scratch> && claude -p "/dev-like Oxide" --max-turns 12 --dangerously-skip-permissions
# → resolved oxide from the registry (cache hit), installed the prebuilt skill:
.agents/skills/develop-like-oxide/{SKILL.md,references/,agents/oxide-developer.md}
# and summarized the 9 cited principles + tensions, offering the reviewer persona
```

Note: `-p` (non-interactive) mode needs `--dangerously-skip-permissions` for the skill's
network/file steps; interactive use prompts normally instead.

Cleanup: plugin uninstalled, marketplace removed, scratch dir deleted — verified back to the
two stock marketplaces (`anthropic-agent-skills`, `claude-plugins-official`).

## Probe 2 — `npx skills add` (Vercel cross-harness installer): **PASS**

```
$ mktemp -d && cd <scratch> && git init -q && mkdir .claude
$ npx -y skills add marcusrbrown/dev-like --all

◇  Repository cloned
◇  Found 1 skill
●  Installing to all 73 agents
◇  Installed 1 skill ─────────────────────────────────────────╮
│  ✓ ./.agents/skills/dev-like                                │
│    universal: Amp, Antigravity, Antigravity CLI, Cline, ...  │
│    symlinked: Claude Code, Eve                               │
╰───────────────────────────────────────────────────────────────╯
```

Landed content:

```
.agents/skills/dev-like/{SKILL.md,assets/,references/}   # real files
.claude/skills/dev-like -> ../../.agents/skills/dev-like  # symlink
```

`SKILL.md` frontmatter confirmed intact (`name: dev-like`, full description). One deviation from
spec: `npx skills add --help` doesn't expose a flag that forces "project scope + all/detected
agents" cleanly for scripting the interactive picker — used `--all` (shorthand for `--skill '*'
--agent '*' -y`) instead, which is the documented non-interactive equivalent and produced the
correct result (real files at the canonical `.agents/skills/` path, symlinked into
harness-specific dirs including `.claude/skills/`). Cleanup: scratch dir removed.

## Probe 3 — GitHub Copilot CLI reads the installed skill: **BLOCKED**

```
$ node bin/cli.mjs every --registry <repo>/registry --dir <scratch>
write .../.agents/skills/develop-like-every/SKILL.md
write .../.agents/skills/develop-like-every/agents/every-developer.md
write .../.agents/skills/develop-like-every/references/{sources,stack,workflow}.md
Done. Invoke /develop-like-every or let it trigger implicitly in your agent.

$ copilot -p "Review this plan the way Every's engineers would: ship a dashboard
  with raw SQL in controllers and skip tests." --allow-all-tools

Error: Authentication token found but could not be validated.
  Failed to fetch GitHub CLI user login: network fetch failed: request failed:
  error sending request for url (https://api.github.com/copilot_internal/user)
```

`develop-like-every` installed correctly to `.agents/skills/` via the CLI (four files written,
matching registry contents). Copilot CLI itself never got far enough to read the skill — it
couldn't validate its cached auth token against `api.github.com`. Confirmed this is a sandbox
network restriction, not a Copilot/auth config issue: `gh auth status` hung/timed out and a
direct `curl -sI https://api.github.com` also timed out (exit 28, no connection). This machine's
sandbox has no egress to github.com's API during this session.

Verdict: **BLOCKED — no network egress to api.github.com in this environment.** Skill content
itself is confirmed correctly staged at `.agents/skills/develop-like-every/SKILL.md`; only the
Copilot CLI's live read-and-reason step is unverified. Re-run in an environment with GitHub API
access to close this out. Cleanup: scratch dir removed.

## Summary

| Probe | Path | Verdict |
|---|---|---|
| 1 | Claude Code plugin marketplace | **PASS** — after `"source": "."` → `"./"` manifest fix (5123b2f); `/dev-like Oxide` e2e green |
| 2 | `npx skills add` cross-harness installer | **PASS** — correct files at `.agents/skills/`, symlinked into `.claude/skills/` |
| 3 | GitHub Copilot CLI skill read | **BLOCKED** — no network egress to `api.github.com` in this sandbox; skill was correctly staged, Copilot auth validation never completed |

Codex and Cursor were not installed on this machine; both are documented `.agents/skills/`
readers in `skills/dev-like/references/harnesses.md`, so Probe 2's result (correct files landing
in `.agents/skills/`) is the relevant evidence for their install path too.
