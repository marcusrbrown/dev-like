---
"dev-like": patch
---

`bun run validate` now checks every registry entry against `registry/schema/entry.schema.json`, so a missing `name`, an unknown property or an over-long field fails validation instead of passing. The paired eval also stops a timed-out run together with every process it started.
