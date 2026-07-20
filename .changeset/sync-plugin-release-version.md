---
"dev-like": patch
---

Claude plugin and skill metadata now stay synchronized with package releases: `.claude-plugin/plugin.json` and the `dev-like` skill's frontmatter version are automatically kept in lockstep with `package.json`, and `bun run validate` catches drift before it ships.
