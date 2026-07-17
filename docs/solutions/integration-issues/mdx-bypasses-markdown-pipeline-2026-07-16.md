---
title: "MDX files silently bypass the configured markdown pipeline"
date: 2026-07-16
category: integration-issues
module: docs-site
problem_type: integration_gap
component: documentation
severity: medium
applies_when:
  - "authoring a content page in an Astro Starlight site"
  - "a page uses the .mdx extension"
  - "@astrojs/mdx is not registered in astro.config"
tags: [astro, starlight, mdx, remark-gfm, markdown-pipeline, rendered-review]
---

# MDX files silently bypass the configured markdown pipeline

## Context

docs/ is Astro Starlight without the `@astrojs/mdx` integration registered. A content page
(harness-support.mdx) was authored with the `.mdx` extension though it used no JSX. It built
green, passed CI, and passed internal-link checks — but its GFM table rendered as raw pipe
text (`| a | b |`) in production. `.mdx` files skip the site's configured markdown processor
(remark-gfm) unless the MDX integration is registered to handle that extension; Starlight's
default `.md` pipeline never touches them.

## Guidance

- Author `.md` by default. Reach for `.mdx` only when a page genuinely needs JSX/component
  embeds, and only after confirming `@astrojs/mdx` is registered in `astro.config.*`.
- Build success and internal-link checks operate on the compiled route graph, not on
  rendered markup — neither can see a GFM table degrading to raw pipes.
- Fix for a no-JSX `.mdx` page: rename to `.md` (PR #20). No content change required; the
  existing markdown plugins apply immediately.

## Why This Matters

- The failure is invisible to every automated CI gate in this repo (build, link check). It
  only shows up on the rendered page.
- `.mdx` without the integration doesn't error — it silently falls back to a different (and
  in this repo's case, unconfigured) processing path, producing degraded but shippable-looking
  output.

## When to Apply

- Any Astro Starlight site without `@astrojs/mdx` in `astro.config.*`.
- Before adding a new content page: confirm the extension matches the site's actual markdown
  integration surface.

## Examples

```bash
grep -r "mdx" docs/astro.config.* || echo "no MDX integration registered"
```

Detection required opening the rendered page, not reading build output — build exit code was
0 and the link checker passed.

## Prevention

- Default to `.md`; treat `.mdx` as an explicit, justified choice.
- The mandatory pre-push rendered-review gate (build the site, inspect actual pages in a
  browser, screenshots as evidence) exists precisely because build exit codes and link
  checkers can't see render-level breakage like this.

## Related

- PR #20 (harness-support.mdx → harness-support.md)
