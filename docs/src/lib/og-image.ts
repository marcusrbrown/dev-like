import type { RegistryOgPage } from './registry-og'

export const OG_VISUAL_OPTIONS = {
  bgGradient: [[34, 43, 53]] as [number, number, number][],
  border: { color: [0, 206, 209] as [number, number, number], width: 4, side: 'block-start' as const },
  padding: 80,
  font: {
    title: {
      color: [243, 246, 247] as [number, number, number],
      size: 76,
      weight: 'Bold' as const,
    },
    description: {
      color: [148, 163, 165] as [number, number, number],
      size: 34,
      weight: 'Normal' as const,
    },
  },
}

export function buildEntryImageOptions(page: RegistryOgPage) {
  return {
    title: page.title,
    description: `${page.summary}\n\ndev-like / registry  ·  ${page.meta}`,
    ...OG_VISUAL_OPTIONS,
  }
}
