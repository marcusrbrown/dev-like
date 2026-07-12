---
"dev-like": minor
---

CLI install path: `npx dev-like <target>` resolves against the packaged registry (remote fallback), installs the prebuilt skill into `.agents/skills/` with a `.claude/skills/` symlink (copy fallback), idempotent re-install, `--dry-run`/`--force`/`--dir`/`--registry` flags. Generated skill descriptions disambiguate org vs person ("Every (the company)").
