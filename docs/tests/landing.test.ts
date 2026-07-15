import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DOCS_ROOT = path.resolve(__dirname, '..')
const REPO_ROOT = path.resolve(DOCS_ROOT, '..')
const REGISTRY_INDEX = path.join(REPO_ROOT, 'registry', 'index.json')
const DIST_DIR = path.join(DOCS_ROOT, 'dist')
const LANDING_HTML = path.join(DIST_DIR, 'index.html')
const ETHICS_HTML = path.join(DIST_DIR, 'ethics', 'index.html')
const REGISTRY_HTML = path.join(DIST_DIR, 'registry', 'index.html')

function extractSidebarHtml(html: string): string {
  const start = html.indexOf('<ul class="top-level')
  const end = html.indexOf('<script aria-hidden', start)
  if (start === -1 || end === -1) return ''
  return html.slice(start, end)
}

const PRIMARY_CTA_ATTR = /data-cta="primary"/g
const RAW_DEMO_LINK =
  'https://github.com/marcusrbrown/dev-like/blob/main/docs/demo/every-dryrun-2026-07-11.md'

let buildFailed = false
let buildStderr = ''
let landingHtml = ''
let ethicsHtml = ''

beforeAll(() => {
  const result = Bun.spawnSync({
    cmd: ['bun', 'run', 'build'],
    cwd: DOCS_ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  buildFailed = result.exitCode !== 0
  buildStderr = result.stderr.toString()

  if (existsSync(LANDING_HTML)) landingHtml = readFileSync(LANDING_HTML, 'utf8')
  if (existsSync(ETHICS_HTML)) ethicsHtml = readFileSync(ETHICS_HTML, 'utf8')
}, 60_000)

afterAll(() => {})

describe('docs site build', () => {
  test('the site builds successfully with Bun', () => {
    expect(buildFailed, `docs build failed:\n${buildStderr}`).toBe(false)
  })
})

describe('landing route', () => {
  test('the /dev-like/ landing route exists in build output', () => {
    expect(existsSync(LANDING_HTML), `expected build output at ${LANDING_HTML}`).toBe(true)
  })

  test('exactly one element is marked as the primary CTA', () => {
    const matches = landingHtml.match(PRIMARY_CTA_ATTR) ?? []
    expect(matches.length).toBe(1)
  })

  test('the primary CTA is a copy button, not a link to the repo', () => {
    const primaryCtaTagMatch = /<button[^>]*data-cta="primary"[^>]*>/.exec(landingHtml)
    expect(primaryCtaTagMatch, 'expected a primary CTA element that is a button').not.toBeNull()
    const tag = primaryCtaTagMatch?.[0] ?? ''
    expect(tag).toContain('data-copy-button')
    expect(tag).toContain('data-command="npx skills add marcusrbrown/dev-like"')
  })

  test('the "Install" section contains alternate install paths and a link to the full install guide', () => {
    expect(landingHtml).toContain('npx dev-like')
    const secondaryCliMatch = /<[^>]*>[^<]*npx dev-like[^<]*<\/[^>]+>/.exec(landingHtml)
    expect(secondaryCliMatch, 'expected a rendered element containing the CLI install path').not.toBeNull()
    expect(secondaryCliMatch?.[0]).not.toContain('data-cta="primary"')

    expect(landingHtml).toContain('<h2>Install</h2>')
    expect(landingHtml).not.toContain('<h2>Alternate Install Paths</h2>')

    // Check for the Full install guide link
    const guideLinkMatch = /<a[^>]*href="https:\/\/github\.com\/marcusrbrown\/dev-like#install"[^>]*>Full install guide<\/a>/.exec(landingHtml)
    expect(guideLinkMatch, 'expected a Full install guide link pointing to the repo').not.toBeNull()
  })

  test('the header contains a visible text Registry link', () => {
    // Look for the registry link within the header section
    const headerMatch = /<header[^>]*>[\s\S]*?<\/header>/.exec(landingHtml)
    expect(headerMatch, 'expected a header element').not.toBeNull()
    const headerHtml = headerMatch?.[0] ?? ''
    const registryLinkMatch = /<a[^>]*href="\/dev-like\/registry\/"[^>]*>Registry<\/a>/.exec(headerHtml)
    expect(registryLinkMatch, 'expected a Registry link in the header').not.toBeNull()
  })

  test('secondary install commands have accessible copy controls and correct tracking events', () => {
    expect(landingHtml).toContain('data-umami-event="install-plugin-marketplace"')
    expect(landingHtml).toContain('data-umami-event="install-plugin-direct"')
    expect(landingHtml).toContain('data-umami-event="install-cli-cached"')
    expect(landingHtml).toMatch(/<button[^>]*data-copy-button[^>]*>/)

    // Copy affordance should use icons instead of tex
    expect(landingHtml).not.toContain('<span class="copy-text">Copy</span>')
  })

  test('copy buttons have their inherited top margin explicitly reset to 0 for vertical centering', () => {
    const customCssPath = path.join(DOCS_ROOT, 'src', 'styles', 'custom.css')
    const customCss = readFileSync(customCssPath, 'utf8')
    const copyButtonMatch = /\.copy-button\s*\{([^}]+)\}/.exec(customCss)
    expect(copyButtonMatch, 'expected .copy-button styles').not.toBeNull()
    const styles = copyButtonMatch?.[1] ?? ''
    expect(styles).toMatch(/margin:\s*0\s*(?:!important)?\s*;/)
  })

  test('first-run /dev-like guidance is present but not marked primary', () => {
    const firstRunMatch = /<[^>]*>[^<]*\/dev-like\s+<[^<]*<\/[^>]+>/.exec(landingHtml)
    expect(firstRunMatch, 'expected first-run /dev-like <target> guidance in rendered output').not.toBeNull()
    expect(firstRunMatch?.[0]).not.toContain('data-cta="primary"')
  })

  test('before and after evidence labels and neutral headers are present', () => {
    expect(landingHtml).toMatch(/data-evidence="before"/)
    expect(landingHtml).toMatch(/data-evidence="after"/)
    expect(landingHtml).toContain('With Every profile')
  })

  test('a link to the verified raw demo transcript is present', () => {
    expect(landingHtml).toContain(RAW_DEMO_LINK)
  })

  test('internal registry and ethics links use canonical trailing-slash URLs', () => {
    expect(landingHtml).toContain('href="/dev-like/registry/"')
    expect(landingHtml).not.toMatch(/href="\/dev-like\/registry"[^/]/)
    expect(landingHtml).toContain('href="/dev-like/ethics/"')
    expect(landingHtml).not.toMatch(/href="\/dev-like\/ethics"[^/]/)
  })

  test('the [receipt] links are real external HTTPS sources, not local/hash placeholders', () => {
    expect(landingHtml).not.toContain('href="#receipt"')
    expect(landingHtml).toContain('https://github.com/EveryInc/compound-engineering-plugin')
    expect(landingHtml).toContain('https://every.to/guides/compound-engineering')
    expect(landingHtml).toContain('https://sfruby.com/')
  })
})

describe('ethics route', () => {
  test('the /dev-like/ethics/ route exists in build output', () => {
    expect(existsSync(ETHICS_HTML), `expected build output at ${ETHICS_HTML}`).toBe(true)
  })

  test('states profiles are built from public sources only', () => {
    expect(ethicsHtml.toLowerCase()).toMatch(/public[\s-]sources?\s+only|only\s+public\s+sources?/)
  })

  test('lists every consent tier', () => {
    for (const tier of ['self-published', 'stated', 'observed', 'social']) {
      expect(ethicsHtml.toLowerCase()).toContain(tier)
    }
  })

  test('states the stated tier as the floor for people', () => {
    expect(ethicsHtml.toLowerCase()).toMatch(/stated[\s\S]{0,80}floor|floor[\s\S]{0,80}stated/)
  })

  test('states profiles are versioned at generation time', () => {
    expect(ethicsHtml.toLowerCase()).toMatch(/versioned\s+at\s+generation|version(?:ed)?[\s\S]{0,40}generat/)
  })

  test('links the profile-request path', () => {
    expect(ethicsHtml).toContain('profile-request')
  })

  test('links the opt-out path', () => {
    expect(ethicsHtml.toLowerCase()).toMatch(/opt-?out/)
  })

  test('states the 48-hour response promise', () => {
    expect(ethicsHtml).toMatch(/48[\s-]hour/)
  })

  test('describes self-published accurately: the subject ships its own culture artifacts (DESIGN.md:84)', () => {
    expect(ethicsHtml.toLowerCase()).toMatch(/subject ships (its|their) own culture artifacts/)
    expect(ethicsHtml.toLowerCase()).not.toMatch(/self-published[\s\S]{0,80}publish(es)? a dev-like profile/)
  })

  test('links the opt-out policy to registry/OPTOUT.md', () => {
    expect(ethicsHtml).toContain(
      'https://github.com/marcusrbrown/dev-like/blob/main/registry/OPTOUT.md',
    )
  })
})

describe('registry sidebar navigation', () => {
  test('the sidebar group is explicitly labeled "Registry" and does not expose the raw "_generated" directory name', () => {
    expect(existsSync(REGISTRY_HTML), `expected build output at ${REGISTRY_HTML}`).toBe(true)
    const registryHtml = readFileSync(REGISTRY_HTML, 'utf8')
    const sidebar = extractSidebarHtml(registryHtml)
    expect(sidebar).not.toBe('')
    expect(sidebar).not.toContain('_generated')
    expect(sidebar).toMatch(/class="group-label[^"]*"[^>]*>\s*<span[^>]*>Registry</)
  })

  test('the sidebar links Ethics & Consent to /dev-like/ethics/', () => {
    const registryHtml = readFileSync(REGISTRY_HTML, 'utf8')
    const sidebar = extractSidebarHtml(registryHtml)
    expect(sidebar).toContain('href="/dev-like/ethics/"')
    expect(sidebar).toContain('Ethics &amp; Consent')
  })

  test('the sidebar links the registry overview and every current registry entry, read dynamically from registry/index.json', () => {
    const registryHtml = readFileSync(REGISTRY_HTML, 'utf8')
    const sidebar = extractSidebarHtml(registryHtml)

    expect(sidebar).toContain('href="/dev-like/registry/"')

    const index: { entries: Record<string, { name: string }> } = JSON.parse(
      readFileSync(REGISTRY_INDEX, 'utf8'),
    )
    for (const [slug, entry] of Object.entries(index.entries)) {
      expect(sidebar, `expected sidebar link for slug "${slug}"`).toContain(
        `href="/dev-like/registry/${slug}/"`,
      )
      expect(sidebar, `expected sidebar label for slug "${slug}"`).toContain(entry.name)
    }
  })
})

describe('registry index table rendering (remark-gfm regression)', () => {
  test('the registry overview renders a real <table> with a link for every current registry entry, not raw markdown pipe-row text', () => {
    const registryHtml = readFileSync(REGISTRY_HTML, 'utf8')

    expect(registryHtml).toMatch(/<table>/)
    expect(registryHtml).not.toMatch(/\|\s*Name\s*\|\s*Kind\s*\|/)
    expect(registryHtml).not.toMatch(/\|\s*---\s*\|\s*---\s*\|/)

    const tableMatch = /<table>[\s\S]*?<\/table>/.exec(registryHtml)
    expect(tableMatch, 'expected a rendered <table> in the registry overview').not.toBeNull()
    const tableHtml = tableMatch?.[0] ?? ''

    const index: { entries: Record<string, { name: string }> } = JSON.parse(
      readFileSync(REGISTRY_INDEX, 'utf8'),
    )
    for (const [slug, entry] of Object.entries(index.entries)) {
      expect(tableHtml, `expected table link for slug "${slug}"`).toContain(
        `href="/dev-like/registry/${slug}/"`,
      )
      expect(tableHtml, `expected table label for slug "${slug}"`).toContain(entry.name)
    }
  })
})
