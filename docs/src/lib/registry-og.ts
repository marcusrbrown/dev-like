// Deterministic per-entry OG card data, loaded directly from the validated registry (not from
// generated MDX) so image generation and the generated pages always agree. Read at build time
// only; astro-og-canvas renders images from this data via astro-og-canvas's OGImageRoute.

import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Located by walking up from this module's own file, not cwd: at build time this module is
// bundled into a prerendered chunk at an arbitrary depth under docs/, and cwd varies with the
// invoking process (repo root vs docs/). Walking up guarantees the same registry regardless.
function findRegistryDir(startDir: string): string {
  let dir = startDir
  while (true) {
    const candidate = join(dir, 'registry', 'index.json')
    if (existsSync(candidate)) return join(dir, 'registry')
    const parent = dirname(dir)
    if (parent === dir) throw new Error('registry/index.json not found in any parent directory')
    dir = parent
  }
}

const REGISTRY_DIR = findRegistryDir(dirname(fileURLToPath(import.meta.url)))

export interface RegistryOgPage {
  title: string
  /** One-line registry summary (R10), rendered as the OG card's primary description. */
  summary: string
  /** Consent tier and source count, rendered as secondary metadata beneath the summary. */
  meta: string
}

interface RegistryIndex {
  entries: Record<string, unknown>
}

interface RegistryEntryJson {
  name: string
  consentTier: string
  sources: unknown[]
  summary?: string
}

// Cached at module scope: this file is imported once per build by both the OG image route and
// the route middleware, and registry data does not change mid-build.
let cachedPages: Record<string, RegistryOgPage> | undefined

export async function loadRegistryOgPages(): Promise<Record<string, RegistryOgPage>> {
  if (cachedPages) return cachedPages

  const index: RegistryIndex = JSON.parse(await readFile(join(REGISTRY_DIR, 'index.json'), 'utf8'))
  const pages: Record<string, RegistryOgPage> = {}

  for (const slug of Object.keys(index.entries)) {
    const entry: RegistryEntryJson = JSON.parse(
      await readFile(join(REGISTRY_DIR, slug, 'entry.json'), 'utf8'),
    )
    pages[slug] = {
      title: entry.name,
      summary: entry.summary ?? `${entry.name} engineering culture profile.`,
      meta: `${entry.consentTier} · ${entry.sources.length} sources`,
    }
  }

  cachedPages = pages
  return pages
}
