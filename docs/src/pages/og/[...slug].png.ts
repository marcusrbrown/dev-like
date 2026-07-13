// Per-registry-entry OG PNG route, generated via astro-og-canvas (no Playwright/browser
// automation). One image per validated registry entry at /dev-like/og/<slug>.png.
import { OGImageRoute } from 'astro-og-canvas'

import { loadRegistryOgPages } from '../../lib/registry-og'

const pages = await loadRegistryOgPages()

export const { getStaticPaths, GET } = await OGImageRoute({
  param: 'slug',
  pages,
  // The route file itself supplies the `.png` extension (`[...slug].png.ts`); the default
  // astro-og-canvas slug also appends one, which would double it. Use the bare registry slug.
  getSlug: (path) => path,
  getImageOptions: (_path, page) => ({
    title: page.title,
    // astro-og-canvas supports newlines for breaking text. Replace the em dash
    // with structural lines to match the forensic blueprint system. Add brand/registry context.
    description: `${page.summary}\n\ndev-like / registry  ·  ${page.meta}`,
    bgGradient: [[34, 43, 53]],
    border: { color: [0, 206, 209], width: 4, side: 'block-start' },
    padding: 80,
    font: {
      title: {
        color: [243, 246, 247],
        size: 76,
        weight: 'Bold'
      },
      description: {
        color: [148, 163, 165],
        size: 34,
        weight: 'Normal'
      },
    },
  }),
})