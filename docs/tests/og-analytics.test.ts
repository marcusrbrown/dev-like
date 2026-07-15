import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildAnalyticsTag } from '../src/lib/analytics'
import { buildDefaultImageOptions, buildEntryImageOptions, OG_VISUAL_OPTIONS } from '../src/lib/og-image'
import { loadRegistryOgPages } from '../src/lib/registry-og'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DOCS_ROOT = path.resolve(__dirname, '..')
const REPO_ROOT = path.resolve(DOCS_ROOT, '..')
const REGISTRY_DIR = path.join(REPO_ROOT, 'registry')
const DIST_DIR = path.join(DOCS_ROOT, 'dist')

const FIXTURE_WEBSITE_ID = 'test-website-id-00000000-0000-0000-0000-000000000000'
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function readPngDimensions(file: string): { width: number; height: number } {
  const buf = readFileSync(file)
  if (!buf.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error(`${file} is not a PNG`)
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

function build(env: Record<string, string>): { ok: boolean; stderr: string } {
  const result = Bun.spawnSync({
    cmd: ['bun', 'run', 'build'],
    cwd: DOCS_ROOT,
    // Force production build: bun test sets NODE_ENV=test, which would leak into astro build and disable import.meta.env.PROD.
    env: { ...process.env, ...env, NODE_ENV: 'production' },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  return { ok: result.exitCode === 0, stderr: result.stderr.toString() }
}

function registrySlugs(): string[] {
  const index = JSON.parse(readFileSync(path.join(REGISTRY_DIR, 'index.json'), 'utf8'))
  return Object.keys(index.entries)
}

describe('loadRegistryOgPages() working-directory independence', () => {
  test('resolves the registry from both the repo root and docs/ as cwd', () => {
    const script = "import('./docs/src/lib/registry-og.ts').then(m => m.loadRegistryOgPages()).then(p => console.log(Object.keys(p).length))"
    for (const cwd of [REPO_ROOT, DOCS_ROOT]) {
      const result = Bun.spawnSync({
        cmd: ['bun', '-e', cwd === REPO_ROOT ? script : script.replace('./docs/', './') ],
        cwd,
        stdout: 'pipe',
        stderr: 'pipe',
      })
      expect(result.exitCode, `failed from cwd=${cwd}:\n${result.stderr.toString()}`).toBe(0)
      expect(Number(result.stdout.toString().trim())).toBeGreaterThan(0)
    }
  })
})

describe('loadRegistryOgPages() data completeness', () => {
  test('every entry OG payload includes name, exact summary, source count, and consent tier', async () => {
    const pages = await loadRegistryOgPages()

    for (const slug of registrySlugs()) {
      const entry: { name: string; consentTier: string; sources: unknown[]; summary?: string } =
        JSON.parse(readFileSync(path.join(REGISTRY_DIR, slug, 'entry.json'), 'utf8'))
      const page = pages[slug]
      expect(page, `expected an OG page for ${slug}`).toBeDefined()

      const serialized = JSON.stringify(page)
      expect(serialized, `${slug}: missing name`).toContain(entry.name)
      const expectedSummary = entry.summary ?? `${entry.name} engineering culture profile.`
      expect(serialized, `${slug}: missing exact summary "${expectedSummary}"`).toContain(expectedSummary)
      expect(serialized, `${slug}: missing source count ${entry.sources.length}`).toContain(
        String(entry.sources.length),
      )
      expect(serialized, `${slug}: missing consent tier ${entry.consentTier}`).toContain(entry.consentTier)
    }
  })
})

describe('per-entry OG data and routes', () => {
  test('the build succeeds without an analytics website ID', () => {
    const { ok, stderr } = build({ UMAMI_WEBSITE_ID: '' })
    expect(ok, `docs build failed:\n${stderr}`).toBe(true)
  }, 60_000)

  test('every current registry entry has a generated OG PNG route', () => {
    for (const slug of registrySlugs()) {
      const file = path.join(DIST_DIR, 'og', `${slug}.png`)
      expect(existsSync(file), `expected ${file} to exist`).toBe(true)
    }
  })

  test('generated per-entry PNGs have a valid PNG signature', () => {
    for (const slug of registrySlugs()) {
      const file = path.join(DIST_DIR, 'og', `${slug}.png`)
      const buf = readFileSync(file)
      expect(buf.subarray(0, 8).equals(PNG_SIGNATURE), `${slug}.png missing PNG signature`).toBe(true)
    }
  })

  test('generated per-entry PNGs are 1200x630 (OG card dimensions)', () => {
    for (const slug of registrySlugs()) {
      const file = path.join(DIST_DIR, 'og', `${slug}.png`)
      const { width, height } = readPngDimensions(file)
      expect(width, `${slug}.png width`).toBe(1200)
      expect(height, `${slug}.png height`).toBe(630)
    }
  })

  test('the default site OG image fallback exists in build output', () => {
    expect(existsSync(path.join(DIST_DIR, 'og-image.png'))).toBe(true)
  })

  test('the default OG route is not shadowed by a public/ placeholder and renders the branded image', () => {
    const { ok, stderr } = build({ UMAMI_WEBSITE_ID: '' })
    expect(ok, `docs build failed:\n${stderr}`).toBe(true)
    expect(stderr).not.toContain('Skipping src/pages/og-image.png.ts')

    const file = path.join(DIST_DIR, 'og-image.png')
    const { width, height } = readPngDimensions(file)
    expect(width, 'og-image.png width').toBe(1200)
    expect(height, 'og-image.png height').toBe(630)

    const { size } = statSync(file)
    expect(
      size,
      'og-image.png is 10000 bytes or smaller, consistent with a flat placeholder rather than the branded astro-og-canvas render (known branded output: 31,891 bytes)',
    ).toBeGreaterThan(10_000)
  }, 60_000)

  test('registry entry pages advertise their own OG image URL', () => {
    for (const slug of registrySlugs()) {
      const html = readFileSync(path.join(DIST_DIR, 'registry', slug, 'index.html'), 'utf8')
      expect(html).toContain(`https://mrbro.dev/dev-like/og/${slug}.png`)
    }
  })

  test('non-entry pages advertise the default site OG card', () => {
    const html = readFileSync(path.join(DIST_DIR, 'index.html'), 'utf8')
    expect(html).toContain('https://mrbro.dev/dev-like/og-image.png')
  })
})

describe('buildAnalyticsTag() (pure)', () => {
  test('a configured website ID in development returns no script', () => {
    expect(buildAnalyticsTag(FIXTURE_WEBSITE_ID, false)).toBeUndefined()
  })

  test('no website ID in production returns no script', () => {
    expect(buildAnalyticsTag(undefined, true)).toBeUndefined()
    expect(buildAnalyticsTag('', true)).toBeUndefined()
  })

  test('a configured website ID in production returns the metrics.fro.bot privacy-attributed tag', () => {
    const tag = buildAnalyticsTag(FIXTURE_WEBSITE_ID, true)
    expect(tag).toBeDefined()
    expect(tag?.tag).toBe('script')
    expect(tag?.attrs.src).toBe('https://metrics.fro.bot/script.js')
    expect(tag?.attrs.defer).toBe(true)
    expect(tag?.attrs['data-website-id']).toBe(FIXTURE_WEBSITE_ID)
    expect(tag?.attrs['data-do-not-track']).toBe('true')
    expect(tag?.attrs['data-exclude-search']).toBe('true')
    expect(tag?.attrs['data-exclude-hash']).toBe('true')
  })
})

describe('OG image options builders (pure)', () => {
  test('buildDefaultImageOptions() reaches the shared visual options and site title', () => {
    const options = buildDefaultImageOptions()
    expect(options.title).toBe('dev-like')
    expect(options.description).toContain('Steal the workflow, not the code.')
    expect(options.bgGradient).toEqual(OG_VISUAL_OPTIONS.bgGradient)
    expect(options.border).toEqual(OG_VISUAL_OPTIONS.border)
    expect(options.padding).toBe(OG_VISUAL_OPTIONS.padding)
    expect(options.font).toEqual(OG_VISUAL_OPTIONS.font)
  })

  test('buildEntryImageOptions() surfaces title, summary, consent tier, and source count, and reaches shared visual options', () => {
    const page = { title: 'Acme Corp', summary: 'Acme engineering culture profile.', meta: 'stated · 3 sources' }
    const options = buildEntryImageOptions(page)
    expect(options.title).toBe('Acme Corp')
    expect(options.description).toContain('Acme engineering culture profile.')
    expect(options.description).toContain('stated · 3 sources')
    expect(options.bgGradient).toEqual(OG_VISUAL_OPTIONS.bgGradient)
    expect(options.border).toEqual(OG_VISUAL_OPTIONS.border)
    expect(options.padding).toBe(OG_VISUAL_OPTIONS.padding)
    expect(options.font).toEqual(OG_VISUAL_OPTIONS.font)
  })
})

describe('Umami analytics gating', () => {
  test('a production build with a fixture website ID includes the script and ID', () => {
    const { ok, stderr } = build({ UMAMI_WEBSITE_ID: FIXTURE_WEBSITE_ID })
    expect(ok, `docs build failed:\n${stderr}`).toBe(true)
    const html = readFileSync(path.join(DIST_DIR, 'index.html'), 'utf8')
    expect(html).toContain('https://metrics.fro.bot/script.js')
    expect(html).toContain(FIXTURE_WEBSITE_ID)
    expect(html).toMatch(/<script[^>]*\bdefer\b[^>]*data-website-id="test-website-id/)
    expect(html).toContain('data-do-not-track="true"')
    expect(html).toContain('data-exclude-search="true"')
    expect(html).toContain('data-exclude-hash="true"')
  }, 60_000)

  test('a build without a website ID omits the Umami host and ID', () => {
    const { ok, stderr } = build({ UMAMI_WEBSITE_ID: '' })
    expect(ok, `docs build failed:\n${stderr}`).toBe(true)
    const html = readFileSync(path.join(DIST_DIR, 'index.html'), 'utf8')
    expect(html).not.toContain('metrics.fro.bot')
    expect(html).not.toContain(FIXTURE_WEBSITE_ID)
  }, 60_000)
})

describe('CTA event attributes remain intact', () => {
  test('install, request-profile, and opt-out CTA events are present', () => {
    const landingHtml = readFileSync(path.join(DIST_DIR, 'index.html'), 'utf8')
    const ethicsHtml = readFileSync(path.join(DIST_DIR, 'ethics', 'index.html'), 'utf8')
    expect(landingHtml).toContain('data-umami-event="install-primary"')
    expect(landingHtml).toContain('data-umami-event="install-plugin-marketplace"')
    expect(landingHtml).toContain('data-umami-event="install-plugin-direct"')
    expect(landingHtml).toContain('data-umami-event="install-cli-cached"')
    expect(landingHtml).toContain('data-umami-event="request-profile"')
    expect(ethicsHtml).toContain('data-umami-event="request-profile"')
    expect(ethicsHtml).toContain('data-umami-event="opt-out"')
  })
})
