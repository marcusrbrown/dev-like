export interface AnalyticsScriptTag {
  tag: 'script'
  attrs: {
    src: string
    defer: true
    'data-website-id': string
    'data-do-not-track': string
    'data-exclude-search': string
    'data-exclude-hash': string
  }
}

export function buildAnalyticsTag(websiteId: string | undefined, isProd: boolean): AnalyticsScriptTag | undefined {
  if (!isProd || !websiteId) return undefined

  return {
    tag: 'script',
    attrs: {
      src: 'https://metrics.fro.bot/script.js',
      defer: true,
      'data-website-id': websiteId,
      'data-do-not-track': 'true',
      'data-exclude-search': 'true',
      'data-exclude-hash': 'true',
    },
  }
}
