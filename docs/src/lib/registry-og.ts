import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Registry lookup is anchored to this module's own file, not cwd, so it works regardless of invoking process/bundle depth.
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
  summary: string
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
