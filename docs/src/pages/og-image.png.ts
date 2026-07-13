import { generateOpenGraphImage } from 'astro-og-canvas'
import type { APIRoute } from 'astro'

export const GET: APIRoute = async () => {
  const image = await generateOpenGraphImage({
    title: 'dev-like',
    description: 'Steal the workflow, not the code.\n\nnpx skills add marcusrbrown/dev-like',
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
    format: 'PNG',
  })

  return new Response(image, {
    headers: {
      'Content-Type': 'image/png',
    },
  })
}