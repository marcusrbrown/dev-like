import { afterEach, describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { checkInternalLinks } from '../scripts/check-internal-links.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DOCS_ROOT = path.resolve(__dirname, '..')
const GENERATOR = path.join(DOCS_ROOT, 'scripts', 'check-internal-links.ts')

const tmpDirs: string[] = []

async function mktmp(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'dev-like-linkcheck-'))
  tmpDirs.push(dir)
  return dir
}

async function writeHtml(distDir: string, relPath: string, body: string): Promise<void> {
  const file = path.join(distDir, relPath)
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, body, 'utf8')
}

async function writeFixtureRegistry(dir: string, slugs: string[]): Promise<void> {
  const entries: Record<string, unknown> = {}
  for (const slug of slugs) entries[slug] = { name: slug }
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, 'index.json'), JSON.stringify({ entries }), 'utf8')
}

afterEach(async () => {
  while (tmpDirs.length) await rm(tmpDirs.pop()!, { recursive: true, force: true })
})

describe('checkInternalLinks() fixtures', () => {
  test('happy path: nested pages, assets, query strings, and fragments all pass', async () => {
    const distDir = await mktmp()
    const registryDir = await mktmp()
    await writeFixtureRegistry(registryDir, [])
    await writeHtml(distDir, 'index.html', `
      <a href="/dev-like/ethics/">ethics</a>
      <a href="/dev-like/registry/">registry</a>
      <a href="/dev-like/about.html?tab=1#section">about</a>
      <img src="/dev-like/img/logo.png"/>
    `)
    await writeHtml(distDir, 'ethics/index.html', '<p>ok</p>')
    await writeHtml(distDir, 'registry/index.html', '<p>ok</p>')
    await writeHtml(distDir, 'about.html', '<p>ok</p>')
    await writeFile(path.join(distDir, 'og-image.png'), 'x')
    await mkdir(path.join(distDir, 'img'), { recursive: true })
    await writeFile(path.join(distDir, 'img', 'logo.png'), 'x')

    const result = await checkInternalLinks({ distDir, registryDir })
    expect(result.ok, JSON.stringify(result.issues)).toBe(true)
  })

  test('error path: a missing internal page is identified and fails', async () => {
    const distDir = await mktmp()
    const registryDir = await mktmp()
    await writeFixtureRegistry(registryDir, [])
    await writeHtml(distDir, 'index.html', '<a href="/dev-like/missing/">missing</a>')
    await writeFile(path.join(distDir, 'og-image.png'), 'x')
    await mkdir(path.join(distDir, 'ethics'), { recursive: true })
    await writeFile(path.join(distDir, 'ethics', 'index.html'), 'ok')
    await mkdir(path.join(distDir, 'registry'), { recursive: true })
    await writeFile(path.join(distDir, 'registry', 'index.html'), 'ok')

    const result = await checkInternalLinks({ distDir, registryDir })
    expect(result.ok).toBe(false)
    const issue = result.issues.find((i) => i.ref === '/dev-like/missing/')
    expect(issue, JSON.stringify(result.issues)).toBeDefined()
    expect(issue!.file).toBe('index.html')
  })

  test('error path: a missing internal asset is identified and fails', async () => {
    const distDir = await mktmp()
    const registryDir = await mktmp()
    await writeFixtureRegistry(registryDir, [])
    await writeHtml(distDir, 'index.html', '<img src="/dev-like/img/missing.png"/>')
    await writeFile(path.join(distDir, 'og-image.png'), 'x')
    await mkdir(path.join(distDir, 'ethics'), { recursive: true })
    await writeFile(path.join(distDir, 'ethics', 'index.html'), 'ok')
    await mkdir(path.join(distDir, 'registry'), { recursive: true })
    await writeFile(path.join(distDir, 'registry', 'index.html'), 'ok')

    const result = await checkInternalLinks({ distDir, registryDir })
    expect(result.ok).toBe(false)
    expect(result.issues.some((i) => i.ref === '/dev-like/img/missing.png')).toBe(true)
  })

  test('error path: a base-path escape (/registry/example-team/ instead of /dev-like/registry/example-team/) is reported', async () => {
    const distDir = await mktmp()
    const registryDir = await mktmp()
    await writeFixtureRegistry(registryDir, [])
    await writeHtml(distDir, 'index.html', '<a href="/registry/example-team/">example-team</a>')
    await writeFile(path.join(distDir, 'og-image.png'), 'x')
    await mkdir(path.join(distDir, 'ethics'), { recursive: true })
    await writeFile(path.join(distDir, 'ethics', 'index.html'), 'ok')
    await mkdir(path.join(distDir, 'registry'), { recursive: true })
    await writeFile(path.join(distDir, 'registry', 'index.html'), 'ok')

    const result = await checkInternalLinks({ distDir, registryDir })
    expect(result.ok).toBe(false)
    const issue = result.issues.find((i) => i.ref === '/registry/example-team/')
    expect(issue, JSON.stringify(result.issues)).toBeDefined()
    expect(issue!.reason).toContain('base-path escape')
  })

  test('edge case: external HTTPS, mailto, fragment-only, and non-page links are not treated as missing', async () => {
    const distDir = await mktmp()
    const registryDir = await mktmp()
    await writeFixtureRegistry(registryDir, [])
    await writeHtml(distDir, 'index.html', `
      <a href="https://example.com/foo">external</a>
      <a href="mailto:someone@example.com">mail</a>
      <a href="#top">fragment only</a>
      <a href="tel:+15551234567">phone</a>
      <a href="data:image/png;base64,abcd">data</a>
    `)
    await writeFile(path.join(distDir, 'og-image.png'), 'x')
    await mkdir(path.join(distDir, 'ethics'), { recursive: true })
    await writeFile(path.join(distDir, 'ethics', 'index.html'), 'ok')
    await mkdir(path.join(distDir, 'registry'), { recursive: true })
    await writeFile(path.join(distDir, 'registry', 'index.html'), 'ok')

    const result = await checkInternalLinks({ distDir, registryDir })
    expect(result.ok, JSON.stringify(result.issues)).toBe(true)
  })

  test('single-quoted href, src, and srcset references escaping /dev-like/ are caught', async () => {
    const distDir = await mktmp()
    const registryDir = await mktmp()
    await writeFixtureRegistry(registryDir, [])
    await writeHtml(distDir, 'index.html', `
      <a href='/registry/example-team/'>example-team</a>
      <img src='/img/missing.png'/>
      <img srcset='/img/missing-2x.png 2x, /img/missing-1x.png 1x'/>
    `)
    await writeFile(path.join(distDir, 'og-image.png'), 'x')
    await mkdir(path.join(distDir, 'ethics'), { recursive: true })
    await writeFile(path.join(distDir, 'ethics', 'index.html'), 'ok')
    await mkdir(path.join(distDir, 'registry'), { recursive: true })
    await writeFile(path.join(distDir, 'registry', 'index.html'), 'ok')

    const result = await checkInternalLinks({ distDir, registryDir })
    expect(result.ok, JSON.stringify(result.issues)).toBe(false)
    const refs = result.issues.map((i) => i.ref)
    expect(refs).toContain('/registry/example-team/')
    expect(refs).toContain('/img/missing.png')
    expect(refs).toContain('/img/missing-2x.png')
    expect(refs).toContain('/img/missing-1x.png')
  })

  test('a nested relative URL resolves using POSIX semantics regardless of host platform', async () => {
    const distDir = await mktmp()
    const registryDir = await mktmp()
    await writeFixtureRegistry(registryDir, [])
    await writeHtml(distDir, 'a/b/page.html', '<a href="../sibling/target.html">sibling</a>')
    await writeHtml(distDir, 'a/sibling/target.html', '<p>ok</p>')
    await writeFile(path.join(distDir, 'og-image.png'), 'x')
    await mkdir(path.join(distDir, 'ethics'), { recursive: true })
    await writeFile(path.join(distDir, 'ethics', 'index.html'), 'ok')
    await mkdir(path.join(distDir, 'registry'), { recursive: true })
    await writeFile(path.join(distDir, 'registry', 'index.html'), 'ok')
    await writeFile(path.join(distDir, 'index.html'), '<p>ok</p>')

    const result = await checkInternalLinks({ distDir, registryDir })
    expect(result.ok, JSON.stringify(result.issues)).toBe(true)
  })

  test('a directory-resolving internal reference without a trailing slash fails (trailingSlash: always)', async () => {
    const distDir = await mktmp()
    const registryDir = await mktmp()
    await writeFixtureRegistry(registryDir, [])
    await writeHtml(distDir, 'index.html', '<a href="/dev-like/registry">registry, no trailing slash</a>')
    await writeFile(path.join(distDir, 'og-image.png'), 'x')
    await mkdir(path.join(distDir, 'ethics'), { recursive: true })
    await writeFile(path.join(distDir, 'ethics', 'index.html'), 'ok')
    await mkdir(path.join(distDir, 'registry'), { recursive: true })
    await writeFile(path.join(distDir, 'registry', 'index.html'), 'ok')

    const result = await checkInternalLinks({ distDir, registryDir })
    expect(result.ok, JSON.stringify(result.issues)).toBe(false)
    const issue = result.issues.find((i) => i.ref === '/dev-like/registry')
    expect(issue, JSON.stringify(result.issues)).toBeDefined()
    expect(issue!.reason).toContain('trailing slash')
  })

  test('assets, files with extensions, and fragment-only references are unaffected by the trailing-slash rule', async () => {
    const distDir = await mktmp()
    const registryDir = await mktmp()
    await writeFixtureRegistry(registryDir, [])
    await writeHtml(distDir, 'index.html', `
      <a href="/dev-like/about.html">about</a>
      <a href="#top">fragment only</a>
      <img src="/dev-like/img/logo.png"/>
    `)
    await writeHtml(distDir, 'about.html', '<p>ok</p>')
    await writeFile(path.join(distDir, 'og-image.png'), 'x')
    await mkdir(path.join(distDir, 'ethics'), { recursive: true })
    await writeFile(path.join(distDir, 'ethics', 'index.html'), 'ok')
    await mkdir(path.join(distDir, 'registry'), { recursive: true })
    await writeFile(path.join(distDir, 'registry', 'index.html'), 'ok')
    await mkdir(path.join(distDir, 'img'), { recursive: true })
    await writeFile(path.join(distDir, 'img', 'logo.png'), 'x')

    const result = await checkInternalLinks({ distDir, registryDir })
    expect(result.ok, JSON.stringify(result.issues)).toBe(true)
  })

  test('every registry slug from a fixture index.json requires a built page and OG image, without hardcoding slugs', async () => {
    const distDir = await mktmp()
    const registryDir = await mktmp()
    await writeFixtureRegistry(registryDir, ['alpha', 'beta'])
    await writeHtml(distDir, 'index.html', '<p>ok</p>')
    await writeFile(path.join(distDir, 'og-image.png'), 'x')
    await mkdir(path.join(distDir, 'ethics'), { recursive: true })
    await writeFile(path.join(distDir, 'ethics', 'index.html'), 'ok')
    await mkdir(path.join(distDir, 'registry'), { recursive: true })
    await writeFile(path.join(distDir, 'registry', 'index.html'), 'ok')

    const result = await checkInternalLinks({ distDir, registryDir })
    expect(result.ok).toBe(false)
    const missingRefs = result.issues.map((i) => i.ref)
    expect(missingRefs).toContain('/registry/alpha/')
    expect(missingRefs).toContain('/registry/beta/')
    expect(missingRefs).toContain('/og/alpha.png')
    expect(missingRefs).toContain('/og/beta.png')
  })

  test('a complete fixture with all registry entries, OG images, and required pages passes', async () => {
    const distDir = await mktmp()
    const registryDir = await mktmp()
    await writeFixtureRegistry(registryDir, ['alpha'])
    await writeHtml(distDir, 'index.html', '<p>ok</p>')
    await writeFile(path.join(distDir, 'og-image.png'), 'x')
    await mkdir(path.join(distDir, 'ethics'), { recursive: true })
    await writeFile(path.join(distDir, 'ethics', 'index.html'), 'ok')
    await mkdir(path.join(distDir, 'registry'), { recursive: true })
    await writeFile(path.join(distDir, 'registry', 'index.html'), 'ok')
    await mkdir(path.join(distDir, 'registry', 'alpha'), { recursive: true })
    await writeFile(path.join(distDir, 'registry', 'alpha', 'index.html'), 'ok')
    await mkdir(path.join(distDir, 'og'), { recursive: true })
    await writeFile(path.join(distDir, 'og', 'alpha.png'), 'x')

    const result = await checkInternalLinks({ distDir, registryDir })
    expect(result.ok, JSON.stringify(result.issues)).toBe(true)
  })

  test('javascript: references are not skipped and fail the checker', async () => {
    const distDir = await mktmp()
    const registryDir = await mktmp()
    await writeFixtureRegistry(registryDir, [])
    await writeHtml(distDir, 'index.html', '<a href="javascript:void(0)">click</a>')
    await writeFile(path.join(distDir, 'og-image.png'), 'x')
    await mkdir(path.join(distDir, 'ethics'), { recursive: true })
    await writeFile(path.join(distDir, 'ethics', 'index.html'), 'ok')
    await mkdir(path.join(distDir, 'registry'), { recursive: true })
    await writeFile(path.join(distDir, 'registry', 'index.html'), 'ok')

    const result = await checkInternalLinks({ distDir, registryDir })
    expect(result.ok).toBe(false)
    expect(result.issues.some((i) => i.ref === 'javascript:void(0)')).toBe(true)
  })

  test('a "..", after normalization, cannot traverse outside /dev-like/', async () => {
    const distDir = await mktmp()
    const registryDir = await mktmp()
    await writeFixtureRegistry(registryDir, [])
    await writeHtml(distDir, 'index.html', '<a href="/dev-like/../secret">escape</a>')
    await writeFile(path.join(distDir, 'og-image.png'), 'x')
    await mkdir(path.join(distDir, 'ethics'), { recursive: true })
    await writeFile(path.join(distDir, 'ethics', 'index.html'), 'ok')
    await mkdir(path.join(distDir, 'registry'), { recursive: true })
    await writeFile(path.join(distDir, 'registry', 'index.html'), 'ok')

    const result = await checkInternalLinks({ distDir, registryDir })
    expect(result.ok).toBe(false)
    const issue = result.issues.find((i) => i.ref === '/dev-like/../secret')
    expect(issue, JSON.stringify(result.issues)).toBeDefined()
    expect(issue!.reason).toContain('base-path escape')
  })

  test('a same-origin absolute URL containing ".." cannot traverse outside /dev-like/', async () => {
    const distDir = await mktmp()
    const registryDir = await mktmp()
    await writeFixtureRegistry(registryDir, [])
    await writeHtml(distDir, 'index.html', '<a href="https://mrbro.dev/dev-like/../secret">escape</a>')
    await writeFile(path.join(distDir, 'og-image.png'), 'x')
    await mkdir(path.join(distDir, 'ethics'), { recursive: true })
    await writeFile(path.join(distDir, 'ethics', 'index.html'), 'ok')
    await mkdir(path.join(distDir, 'registry'), { recursive: true })
    await writeFile(path.join(distDir, 'registry', 'index.html'), 'ok')

    const result = await checkInternalLinks({ distDir, registryDir })
    expect(result.ok).toBe(false)
    const issue = result.issues.find((i) => i.ref === 'https://mrbro.dev/dev-like/../secret')
    expect(issue, JSON.stringify(result.issues)).toBeDefined()
    expect(issue!.reason).toContain('base-path escape')
  })
})

describe('checkInternalLinks() CLI output', () => {
  test('CLI failure output reports "N internal references checked; M failures" accurately, with no em dash', async () => {
    const distDir = await mktmp()
    const registryDir = await mktmp()
    await writeFixtureRegistry(registryDir, [])
    await writeHtml(distDir, 'index.html', '<a href="/dev-like/missing/">missing</a>')
    await writeFile(path.join(distDir, 'og-image.png'), 'x')
    await mkdir(path.join(distDir, 'ethics'), { recursive: true })
    await writeFile(path.join(distDir, 'ethics', 'index.html'), 'ok')
    await mkdir(path.join(distDir, 'registry'), { recursive: true })
    await writeFile(path.join(distDir, 'registry', 'index.html'), 'ok')

    const res = spawnSync('bun', [GENERATOR, '--dist', distDir, '--registry', registryDir], {
      encoding: 'utf8',
    })
    expect(res.status).toBe(1)
    expect(res.stdout).not.toContain('\u2014')
    expect(res.stderr).not.toContain('\u2014')
    const match = res.stdout.match(/(\d+) internal references checked; (\d+) failures?/)
    expect(match, res.stdout).toBeDefined()
    const [, checkedStr, failuresStr] = match!
    expect(Number(failuresStr)).toBeGreaterThan(0)
    expect(Number(checkedStr)).toBeGreaterThanOrEqual(Number(failuresStr))
  })
})
