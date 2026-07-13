// Starlight route middleware (docs/astro.config.mjs: routeMiddleware): advertises the
// per-entry OG image for generated registry pages and falls back to the default site card
// for everything else. Runs at request/build time for every rendered Starlight route.
import { defineRouteMiddleware } from '@astrojs/starlight/route-data'

const SITE_ORIGIN = 'https://mrbro.dev'
const BASE = '/dev-like'
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}${BASE}/og-image.png`

// Generated registry entry pages declare a `registry/<slug>` frontmatter slug (see
// docs/scripts/generate-registry-pages.ts), which becomes the route's `entry.id`.
// `registry` alone (no slug) is the registry index page, which uses the default site card.
const GENERATED_ENTRY_ID = /^registry\/([^/]+)$/

function setOgImage(head: { tag: string; attrs?: Record<string, string | boolean | undefined> }[], url: string) {
  for (const tag of head) {
    if (tag.tag === 'meta' && tag.attrs?.property === 'og:image') {
      tag.attrs.content = url
    }
    if (tag.tag === 'meta' && tag.attrs?.name === 'twitter:image') {
      tag.attrs.content = url
    }
  }
}

export const onRequest = defineRouteMiddleware((context) => {
  const { entry, head } = context.locals.starlightRoute
  const match = GENERATED_ENTRY_ID.exec(entry.id)

  const ogImageUrl = match ? `${SITE_ORIGIN}${BASE}/og/${match[1]}.png` : DEFAULT_OG_IMAGE
  setOgImage(head, ogImageUrl)

  // Cookieless Umami: only in production builds with a configured website ID.
  // Never injected in dev or when the ID is unset, so no analytics call is possible by default.
  // Read from process.env (not import.meta.env): this middleware runs server-side at
  // build/request time, and only PUBLIC_-prefixed vars are guaranteed to be inlined into
  // import.meta.env by Astro/Vite. process.env reflects the live server environment directly.
  const UMAMI_WEBSITE_ID = process.env.UMAMI_WEBSITE_ID
  if (import.meta.env.PROD && UMAMI_WEBSITE_ID) {
    head.push({
      tag: 'script',
      attrs: {
        src: 'https://metrics.fro.bot/script.js',
        defer: true,
        'data-website-id': UMAMI_WEBSITE_ID,
        'data-do-not-track': 'true',
        'data-exclude-search': 'true',
        'data-exclude-hash': 'true',
      },
    })
  }
})
