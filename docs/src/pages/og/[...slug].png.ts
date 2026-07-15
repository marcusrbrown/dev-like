import { OGImageRoute } from 'astro-og-canvas'

import { buildEntryImageOptions } from '../../lib/og-image'
import { loadRegistryOgPages } from '../../lib/registry-og'

const pages = await loadRegistryOgPages()

export const { getStaticPaths, GET } = await OGImageRoute({
  param: 'slug',
  pages,
  // Bare slug: the route filename already supplies the .png extension, avoiding a double .png.
  getSlug: (path) => path,
  getImageOptions: (_path, page) => buildEntryImageOptions(page),
})
