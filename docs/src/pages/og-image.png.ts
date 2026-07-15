import { generateOpenGraphImage } from 'astro-og-canvas'
import type { APIRoute } from 'astro'

import { buildDefaultImageOptions } from '../lib/og-image'

export const GET: APIRoute = async () => {
  const image = await generateOpenGraphImage({
    ...buildDefaultImageOptions(),
    format: 'PNG',
  })

  return new Response(image, {
    headers: {
      'Content-Type': 'image/png',
    },
  })
}
