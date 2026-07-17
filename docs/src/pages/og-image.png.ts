import type { APIRoute } from 'astro'
import { readFileSync } from 'node:fs'
import path from 'node:path'

// Resolved from the project (docs/) root rather than import.meta.url: at build time this
// module is bundled into dist/.prerender/chunks/, so a path relative to the compiled file's
// location would not reach src/assets/og-image.png.
const OG_IMAGE_PATH = path.resolve(process.cwd(), 'src/assets/og-image.png')

export const GET: APIRoute = async () => {
  const image = readFileSync(OG_IMAGE_PATH)

  return new Response(image, {
    headers: {
      'Content-Type': 'image/png',
    },
  })
}
