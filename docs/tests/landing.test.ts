// RED-phase contract for U3 (plan: docs/plans/2026-07-12-001-feat-docs-site-plan.md, R5/R7/R8/R9/R13).
// Builds the real Starlight site once with Bun and inspects the rendered HTML output for
// meaningful behavior — not visual implementation. No runtime dependencies; parsing is done
// with plain string/regex checks against the built HTML.
//
// Contract this test enforces (stable data attributes the eventual markup must expose):
//   - Exactly one element carries `data-cta="primary"`; its visible text is exactly the
//     install command `npx skills add marcusrbrown/dev-like`.
//   - Secondary install paths (CLI, plugin marketplace) and first-run `/dev-like` guidance
//     are present in the page text but never carry `data-cta="primary"`.
//   - Before/after evidence uses `data-evidence="before"` / `data-evidence="after"` labels and
//     links to the raw demo transcript on GitHub.
//   - The ethics page states public-source-only sourcing, every consent tier, the `stated`
//     floor for people, versioned-at-generation provenance, the request-profile and opt-out
//     paths, and the 48-hour response promise.

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DOCS_ROOT = path.resolve(__dirname, '..')
const DIST_DIR = path.join(DOCS_ROOT, 'dist')
const LANDING_HTML = path.join(DIST_DIR, 'index.html')
const ETHICS_HTML = path.join(DIST_DIR, 'ethics', 'index.html')

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

afterAll(() => {
  // Leave dist/ in place for inspection; the build step is disposable and re-run on demand.
})

describe('docs site build', () => {
  test('the site builds successfully with Bun', () => {
    expect(buildFailed, `docs build failed:\n${buildStderr}`).toBe(false)
  })
})

describe('landing route (R5, R8, R13)', () => {
  test('the /dev-like/ landing route exists in build output', () => {
    expect(existsSync(LANDING_HTML), `expected build output at ${LANDING_HTML}`).toBe(true)
  })

  test('exactly one element is marked as the primary CTA', () => {
    const matches = landingHtml.match(PRIMARY_CTA_ATTR) ?? []
    expect(matches.length).toBe(1)
  })

  test('the primary CTA visible command is exactly the skills install command', () => {
    const primaryCtaMatch = /<[^>]*data-cta="primary"[^>]*>([^<]*)<\/[^>]+>/.exec(landingHtml)
    expect(primaryCtaMatch, 'expected a primary CTA element with visible text').not.toBeNull()
    expect(primaryCtaMatch?.[1]?.trim()).toBe('npx skills add marcusrbrown/dev-like')
  })

  test('the primary CTA points to a real install destination, not a same-page or /dev-like/ link', () => {
    const primaryCtaTagMatch = /<[^>]*data-cta="primary"[^>]*>/.exec(landingHtml)
    expect(primaryCtaTagMatch, 'expected a primary CTA element').not.toBeNull()
    const tag = primaryCtaTagMatch?.[0] ?? ''
    const hrefMatch = /href="([^"]*)"/.exec(tag)
    expect(hrefMatch, 'expected the primary CTA element to carry an href').not.toBeNull()
    const href = hrefMatch?.[1] ?? ''
    expect(href).toBe('https://github.com/marcusrbrown/dev-like#install')
    expect(href).not.toBe('/dev-like/')
    expect(href.startsWith('#')).toBe(false)
  })

  test('secondary CLI and plugin install paths are present but not marked primary', () => {
    expect(landingHtml).toContain('npx dev-like')
    // Plugin marketplace path referenced by name; must not carry the primary marker.
    const secondaryCliMatch = /<[^>]*>[^<]*npx dev-like[^<]*<\/[^>]+>/.exec(landingHtml)
    expect(secondaryCliMatch, 'expected a rendered element containing the CLI install path').not.toBeNull()
    expect(secondaryCliMatch?.[0]).not.toContain('data-cta="primary"')
  })

  test('first-run /dev-like guidance is present but not marked primary', () => {
    const firstRunMatch = /<[^>]*>[^<]*\/dev-like\s+<[^<]*<\/[^>]+>/.exec(landingHtml)
    expect(firstRunMatch, 'expected first-run /dev-like <target> guidance in rendered output').not.toBeNull()
    expect(firstRunMatch?.[0]).not.toContain('data-cta="primary"')
  })

  test('before and after evidence labels are present', () => {
    expect(landingHtml).toMatch(/data-evidence="before"/)
    expect(landingHtml).toMatch(/data-evidence="after"/)
  })

  test('a link to the verified raw demo transcript is present', () => {
    expect(landingHtml).toContain(RAW_DEMO_LINK)
  })

  test('the [receipt] links are real external HTTPS sources, not local/hash placeholders', () => {
    expect(landingHtml).not.toContain('href="#receipt"')
    expect(landingHtml).toContain('https://github.com/EveryInc/compound-engineering-plugin')
    expect(landingHtml).toContain('https://every.to/guides/compound-engineering')
    expect(landingHtml).toContain('https://sfruby.com/')
  })
})

describe('ethics route (R9)', () => {
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
    // Must not be conflated with dev-like itself publishing the profile.
    expect(ethicsHtml.toLowerCase()).not.toMatch(/self-published[\s\S]{0,80}publish(es)? a dev-like profile/)
  })

  test('links the opt-out policy to registry/OPTOUT.md', () => {
    expect(ethicsHtml).toContain(
      'https://github.com/marcusrbrown/dev-like/blob/main/registry/OPTOUT.md',
    )
  })
})
