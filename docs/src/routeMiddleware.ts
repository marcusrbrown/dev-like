import { defineRouteMiddleware } from '@astrojs/starlight/route-data'

import { buildAnalyticsTag } from './lib/analytics'

const SITE_ORIGIN = 'https://mrbro.dev'
const BASE = '/dev-like'
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}${BASE}/og-image.png`

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

  // process.env, not import.meta.env: server-side, and only PUBLIC_-prefixed vars are inlined into import.meta.env by Astro/Vite.
  const analyticsTag = buildAnalyticsTag(process.env.UMAMI_WEBSITE_ID, import.meta.env.PROD)
  if (analyticsTag) head.push(analyticsTag)
})
