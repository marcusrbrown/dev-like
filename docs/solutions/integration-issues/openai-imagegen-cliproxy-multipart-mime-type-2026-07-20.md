---
title: "openai-imagegen edit_image.ts fails through CLIProxy with octet-stream MIME"
date: 2026-07-20
category: integration-issues
module: openai-imagegen
problem_type: integration_issue
component: tooling
severity: medium
applies_when:
  - "editing or composing an image via openai-imagegen edit_image.ts"
  - "routing image API calls through CLIProxy or another OpenAI-compatible proxy"
  - "appending a Bun File/Blob to a multipart form without setting its MIME type"
tags: [openai-imagegen, cliproxy, bun, multipart, mime-type, image-edit]
---

# openai-imagegen edit_image.ts fails through CLIProxy with octet-stream MIME

## Problem

Editing an image with the `openai-imagegen` skill's `edit_image.ts` fails with an HTTP 400
when routed through CLIProxy, because the multipart image part is sent with no MIME type and
the upstream rejects `application/octet-stream`. Only the multipart `/images/edits` path is
affected; JSON-body generation works fine.

## Symptoms

```text
HTTP 400: Invalid 'images[0].image_url'. Expected a base64-encoded data URL with an image
MIME type (e.g. 'data:image/png;base64,...'), but got unsupported MIME type
'application/octet-stream'.
```

- Only `edit_image.ts` (multipart `/images/edits`) fails.
- `generate_image.ts` (JSON `/images/generations`) keeps working — auth, endpoint, and
  network all look healthy, which hides the real cause.

## What Didn't Work

- Re-running `edit_image.ts` as-is (same 400 every time).
- Trusting that working `generate_image.ts` meant credentials/endpoint were the problem area —
  it is not a creds or CLIProxy-URL issue at all, so time spent there is wasted.

## Solution

Stamp the real MIME type on the image `Blob` when appending it to the multipart form. In
`edit_image.ts` the image part is built without a type:

```ts
// before — Blob has no type → multipart part is application/octet-stream
form.append('image', new Blob([await Bun.file(img).arrayBuffer()]), filename)

// after — Blob carries image/png → multipart part is image/png
const bytes = await Bun.file(img).arrayBuffer()
form.append('image', new Blob([bytes], { type: 'image/png' }), filename)
```

Apply the same `{ type: 'image/png' }` to the optional `--mask` blob.

The shared skill script (`~/.agents/skills/openai-imagegen/scripts/edit_image.ts`) was left
untouched — the fix was verified by running a patched **local copy**. The durable options are
(a) keep a patched local copy for edit/compose runs, or (b) upstream the one-line MIME fix
into the skill so it derives the Blob type from the file extension.

## Why This Works

CLIProxy translates the OpenAI Images `/images/edits` multipart call into the upstream
Responses API and builds a data URL from each image part, using the part's `Content-Type` as
the data-URL MIME:

- No Blob type → `data:application/octet-stream;base64,...` → **upstream rejects** (requires
  an `image/*` MIME).
- `{ type: 'image/png' }` → `data:image/png;base64,...` → **upstream accepts**.

## Prevention

- When appending a `Bun.file`/`Blob` image to a multipart form for an image API — especially
  through a proxy — always set the MIME explicitly: `new Blob([bytes], { type: 'image/png' })`.
  A typeless Blob defaults to `application/octet-stream`.
- After a proxied edit, verify output dimensions with `file` — CLIProxy can return a different
  resolution than the input (observed: `1280x640` in → `1774x887` out), so resize downstream
  when exact dimensions matter.
- If this recurs, upstream the MIME fix to `edit_image.ts` (derive the type from the file
  extension) rather than re-patching a local copy each time.

## Related Issues

- None found in `docs/solutions/` or the repo issue tracker at time of writing.
