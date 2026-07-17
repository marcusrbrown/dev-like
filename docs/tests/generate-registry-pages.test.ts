import { test } from 'bun:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import fss from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  generate,
  normalizeCitations,
  parseSections,
} from '../scripts/generate-registry-pages.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DOCS_ROOT = path.resolve(__dirname, '..')
const REPO_ROOT = path.resolve(DOCS_ROOT, '..')
const REGISTRY_DIR = path.join(REPO_ROOT, 'registry')
const GENERATOR = path.join(DOCS_ROOT, 'scripts', 'generate-registry-pages.ts')

async function mktmp(prefix = 'dev-like-docsgen-') {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix))
}

async function copyRegistryFixture(destDir: string) {
  await fs.cp(REGISTRY_DIR, destDir, { recursive: true })
}

interface RegistryIndexEntry {
  name: string
  kind: 'org' | 'person'
  consentTier: string
  updated: string
}

interface RegistryIndex {
  entries: Record<string, RegistryIndexEntry>
}

async function readRegistryIndex(): Promise<RegistryIndex> {
  return JSON.parse(await fs.readFile(path.join(REGISTRY_DIR, 'index.json'), 'utf8'))
}

async function hasPrebuiltSkillFixture(slug: string): Promise<boolean> {
  try {
    const s = await fs.stat(path.join(REGISTRY_DIR, slug, 'skill', `develop-like-${slug}`, 'SKILL.md'))
    return s.isFile()
  } catch {
    return false
  }
}

// Synthetic fixtures: registry/ is expected to conform to the strict section template
// (enforced by scripts/validate.mjs) and to have a prebuilt skill/ tree for every entry, so
// the real registry no longer reliably contains a deviant entry to exercise these lenient
// code paths. Build minimal single-entry temp registries instead.
async function writeSyntheticEntry(
  regDir: string,
  slug: string,
  opts: { profile: string; withPrebuiltSkill: boolean },
): Promise<void> {
  const slugDir = path.join(regDir, slug)
  await fs.mkdir(slugDir, { recursive: true })

  const entry = {
    slug,
    name: `Synthetic ${slug}`,
    kind: 'org',
    consentTier: 'self-published',
    updated: '2026-07-11',
    sources: [{ url: 'https://example.com/source', fetched: '2026-07-11', tier: 'self-published' }],
  }
  await fs.writeFile(path.join(slugDir, 'entry.json'), JSON.stringify(entry, null, 2), 'utf8')
  await fs.writeFile(path.join(slugDir, 'profile.md'), opts.profile, 'utf8')

  const index = { entries: { [slug]: { name: entry.name, kind: entry.kind, consentTier: entry.consentTier, updated: entry.updated } } }
  await fs.writeFile(path.join(regDir, 'index.json'), JSON.stringify(index, null, 2), 'utf8')

  if (opts.withPrebuiltSkill) {
    const skillDir = path.join(slugDir, 'skill', `develop-like-${slug}`)
    await fs.mkdir(skillDir, { recursive: true })
    await fs.writeFile(path.join(skillDir, 'SKILL.md'), '---\nname: stub\n---\nstub\n', 'utf8')
  }
}

async function findSlugWithHeading(slugs: string[], heading: string | string[]): Promise<string | undefined> {
  const headings = Array.isArray(heading) ? heading : [heading]
  for (const slug of slugs) {
    const profile = await fs.readFile(path.join(REGISTRY_DIR, slug, 'profile.md'), 'utf8')
    if (headings.every((h) => new RegExp(`^## ${h}$`, 'm').test(profile))) return slug
  }
  return undefined
}

async function findSlugWithCitation(slugs: string[]): Promise<{ slug: string; label: string; url: string } | undefined> {
  for (const slug of slugs) {
    const profile = await fs.readFile(path.join(REGISTRY_DIR, slug, 'profile.md'), 'utf8')
    const match = /\[\[([^\]]+)\]\]\(([^)]+)\)/.exec(profile)
    if (match) return { slug, label: match[1], url: match[2] }
  }
  return undefined
}

test('parseSections keys by heading name regardless of order', () => {
  const text = '# Title\n\n## Tensions\nT body\n\n## Core principle\nC body\n'
  const sections = parseSections(text)
  assert.equal(sections['Tensions'], 'T body')
  assert.equal(sections['Core principle'], 'C body')
})

const SYNTHETIC_PROFILE_MISSING_CORE_AND_WORKFLOW = [
  '# Synthetic deviant — dev culture profile',
  '',
  '## Identity',
  '',
  'A synthetic fixture entry, missing Core principle and Workflow shape.',
  '[[source]](https://example.com/source)',
  '',
  '## Stack',
  '',
  'n/a',
  '',
  '## Principles (cited)',
  '',
  '1. n/a',
  '',
  '## Tensions',
  '',
  'n/a',
  '',
].join('\n')

test('parseSections tolerates missing optional sections (synthetic deviant fixture)', () => {
  const sections = parseSections(SYNTHETIC_PROFILE_MISSING_CORE_AND_WORKFLOW)
  assert.equal(sections['Core principle'], undefined)
  assert.equal(sections['Workflow shape'], undefined)
  assert.ok(sections['Identity'])
  assert.ok(sections['Principles (cited)'])
  assert.ok(sections['Stack'])
  const tensionsKey = Object.keys(sections).find((k) => k.startsWith('Tensions'))
  assert.ok(tensionsKey, 'expected a heading starting with "Tensions"')
})

test('normalizeCitations converts [[label]](url) to [label](url)', () => {
  const input = 'See [[CEP]](https://github.com/EveryInc/compound-engineering-plugin) for detail.'
  const output = normalizeCitations(input)
  assert.equal(
    output,
    'See [CEP](https://github.com/EveryInc/compound-engineering-plugin) for detail.',
  )
  assert.ok(!output.includes('[['))
})

test('normalizeCitations leaves standard markdown links untouched', () => {
  const input = 'See [normal link](https://example.com) here.'
  assert.equal(normalizeCitations(input), input)
})

test('generate() fails loud and writes nothing when validation fails', async () => {
  const outDir = await mktmp()
  try {
    const result = await generate({
      registryDir: REGISTRY_DIR,
      outDir,
      validateFn: async () => false,
    })
    assert.equal(result.ok, false)
    const exists = await fs
      .access(outDir)
      .then(() => true)
      .catch(() => false)
    if (exists) {
      const entries = await fs.readdir(outDir)
      assert.deepEqual(entries, [], 'output dir must remain empty when validation fails')
    }
  } finally {
    await fs.rm(outDir, { recursive: true, force: true })
  }
})

test('generate() succeeds against the real registry with real validate()', async () => {
  const outDir = await mktmp()
  try {
    const index = await readRegistryIndex()
    const result = await generate({ registryDir: REGISTRY_DIR, outDir })
    assert.equal(result.ok, true, `generate failed: ${JSON.stringify(result.errors)}`)
    const files = await fs.readdir(outDir)
    assert.ok(files.includes('index.md'))
    for (const slug of Object.keys(index.entries)) {
      assert.ok(files.includes(`${slug}.md`), `expected ${slug}.md to be generated`)
    }
  } finally {
    await fs.rm(outDir, { recursive: true, force: true })
  }
})

test('generate() renders entries in registry/index.json key order', async () => {
  const outDir = await mktmp()
  try {
    const index = await readRegistryIndex()
    const slugs = Object.keys(index.entries)
    assert.ok(slugs.length >= 2, 'need at least 2 registry entries to assert ordering')
    const result = await generate({ registryDir: REGISTRY_DIR, outDir })
    assert.equal(result.ok, true)
    const indexMdx = await fs.readFile(path.join(outDir, 'index.md'), 'utf8')
    const positions = slugs.map((slug) => indexMdx.indexOf(index.entries[slug].name))
    for (const [i, pos] of positions.entries()) {
      assert.ok(pos > -1, `expected "${index.entries[slugs[i]].name}" to appear in index.md`)
    }
    for (let i = 1; i < positions.length; i++) {
      assert.ok(
        positions[i - 1] < positions[i],
        `${slugs[i - 1]} must precede ${slugs[i]} (index.json order)`,
      )
    }
  } finally {
    await fs.rm(outDir, { recursive: true, force: true })
  }
})

test('generate() emits Starlight frontmatter with title and description', async () => {
  const outDir = await mktmp()
  try {
    const index = await readRegistryIndex()
    const [firstSlug] = Object.keys(index.entries)
    const result = await generate({ registryDir: REGISTRY_DIR, outDir })
    assert.equal(result.ok, true)
    const mdx = await fs.readFile(path.join(outDir, `${firstSlug}.md`), 'utf8')
    assert.match(mdx, /^---\ntitle:/)
    assert.match(mdx, /\ndescription:/)
    assert.match(mdx, /\n---\n/)
  } finally {
    await fs.rm(outDir, { recursive: true, force: true })
  }
})

test('generate() emits a Starlight custom slug so output routes under /registry/ despite living in _generated/', async () => {
  const outDir = await mktmp()
  try {
    const index = await readRegistryIndex()
    const result = await generate({ registryDir: REGISTRY_DIR, outDir })
    assert.equal(result.ok, true)

    const indexMdx = await fs.readFile(path.join(outDir, 'index.md'), 'utf8')
    assert.match(indexMdx, /\nslug: registry\n/, 'index.md must declare slug: registry')

    for (const slug of Object.keys(index.entries)) {
      const mdx = await fs.readFile(path.join(outDir, `${slug}.md`), 'utf8')
      assert.match(
        mdx,
        new RegExp(`\\nslug: registry/${slug}\\n`),
        `${slug}.md must declare slug: registry/${slug}`,
      )
    }
  } finally {
    await fs.rm(outDir, { recursive: true, force: true })
  }
})

test('generate() includes consent tier, source count, and updated date for each entry', async () => {
  const outDir = await mktmp()
  try {
    const index = await readRegistryIndex()
    const slugs = Object.keys(index.entries)
    const result = await generate({ registryDir: REGISTRY_DIR, outDir })
    assert.equal(result.ok, true)
    for (const slug of slugs) {
      const entry = JSON.parse(
        await fs.readFile(path.join(REGISTRY_DIR, slug, 'entry.json'), 'utf8'),
      )
      const mdx = await fs.readFile(path.join(outDir, `${slug}.md`), 'utf8')
      assert.ok(mdx.includes(entry.consentTier), `${slug}: missing consentTier`)
      assert.ok(mdx.includes(entry.updated), `${slug}: missing updated date`)
      assert.ok(mdx.includes(String(entry.sources.length)), `${slug}: missing source count`)
    }
  } finally {
    await fs.rm(outDir, { recursive: true, force: true })
  }
})

test('generate() shows npx dev-like <slug> and SKILL.md link for prebuilt entries', async () => {
  const outDir = await mktmp()
  try {
    const index = await readRegistryIndex()
    const prebuiltSlugs: string[] = []
    for (const slug of Object.keys(index.entries)) {
      if (await hasPrebuiltSkillFixture(slug)) prebuiltSlugs.push(slug)
    }
    assert.ok(prebuiltSlugs.length > 0, 'expected at least one prebuilt-skill fixture entry')

    const result = await generate({ registryDir: REGISTRY_DIR, outDir })
    assert.equal(result.ok, true)
    for (const slug of prebuiltSlugs) {
      const mdx = await fs.readFile(path.join(outDir, `${slug}.md`), 'utf8')
      assert.ok(mdx.includes(`npx dev-like ${slug}`), `${slug}: missing npx install command`)
      assert.ok(
        mdx.includes(`registry/${slug}/skill/develop-like-${slug}/SKILL.md`),
        `${slug}: missing SKILL.md link`,
      )
    }
  } finally {
    await fs.rm(outDir, { recursive: true, force: true })
  }
})

test('generate() shows /dev-like <slug> generation instruction for entries with no prebuilt skill', async () => {
  // Synthetic fixture: every real registry entry now has a committed prebuilt skill/ tree
  // (enforced by scripts/validate.mjs's drift check), so there's no live entry left to
  // exercise the non-prebuilt / AE6 empty-state code path.
  const registryDir = await mktmp('dev-like-docsgen-noprebuilt-')
  const outDir = await mktmp('dev-like-docsgen-noprebuilt-out-')
  try {
    const slug = 'synthetic-noprebuilt'
    await writeSyntheticEntry(registryDir, slug, {
      profile: SYNTHETIC_PROFILE_MISSING_CORE_AND_WORKFLOW,
      withPrebuiltSkill: false,
    })

    const result = await generate({ registryDir, outDir, validateFn: async () => true })
    assert.equal(result.ok, true, `generate failed: ${JSON.stringify(result.errors)}`)
    const mdx = await fs.readFile(path.join(outDir, `${slug}.md`), 'utf8')
    assert.ok(mdx.includes(`/dev-like ${slug}`))
    assert.ok(!mdx.includes(`npx dev-like ${slug}`))
  } finally {
    await fs.rm(registryDir, { recursive: true, force: true })
    await fs.rm(outDir, { recursive: true, force: true })
  }
})

test('generate() normalizes citations in generated Markdown but leaves source profile.md unchanged', async () => {
  const outDir = await mktmp()
  try {
    const index = await readRegistryIndex()
    const found = await findSlugWithCitation(Object.keys(index.entries))
    assert.ok(found, 'expected at least one registry entry using [[label]](url) citation syntax')
    const { slug, label, url } = found!

    const beforeProfile = await fs.readFile(path.join(REGISTRY_DIR, slug, 'profile.md'), 'utf8')
    const result = await generate({ registryDir: REGISTRY_DIR, outDir })
    assert.equal(result.ok, true)
    const afterProfile = await fs.readFile(path.join(REGISTRY_DIR, slug, 'profile.md'), 'utf8')
    assert.equal(beforeProfile, afterProfile, 'source profile.md must not be modified')

    const mdx = await fs.readFile(path.join(outDir, `${slug}.md`), 'utf8')
    assert.ok(!mdx.includes('[['), 'generated Markdown must not contain raw [[citation]] syntax')
    assert.ok(
      mdx.includes(`[${label}](${url})`),
      'generated Markdown must contain normalized citation link',
    )
  } finally {
    await fs.rm(outDir, { recursive: true, force: true })
  }
})

test('generate() renders entries with missing optional sections without error', async () => {
  const registryDir = await mktmp('dev-like-docsgen-missingsections-')
  const outDir = await mktmp('dev-like-docsgen-missingsections-out-')
  try {
    const slug = 'synthetic-missing-sections'
    await writeSyntheticEntry(registryDir, slug, {
      profile: SYNTHETIC_PROFILE_MISSING_CORE_AND_WORKFLOW,
      withPrebuiltSkill: false,
    })

    const result = await generate({ registryDir, outDir, validateFn: async () => true })
    assert.equal(result.ok, true, `generate failed: ${JSON.stringify(result.errors)}`)
    const mdx = await fs.readFile(path.join(outDir, `${slug}.md`), 'utf8')
    assert.ok(mdx.includes('Identity'))
    assert.ok(mdx.includes('Principles (cited)'))
    assert.ok(mdx.includes('Stack'))
    assert.ok(mdx.includes('Tensions'))
  } finally {
    await fs.rm(registryDir, { recursive: true, force: true })
    await fs.rm(outDir, { recursive: true, force: true })
  }
})

const LONE_BRACE_CASES: [string, string][] = [
  ['opening', 'Unbalanced { brace with no close.\n\n'],
  ['closing', 'Unbalanced } brace with no open.\n\n'],
]

for (const [kind, injected] of LONE_BRACE_CASES) {
  test(`generate() rejects a profile section containing a lone/unbalanced ${kind} brace`, async () => {
    const registryDir = await mktmp(`dev-like-docsgen-lonebrace-${kind}-`)
    const outDir = await mktmp(`dev-like-docsgen-lonebrace-${kind}-out-`)
    try {
      await copyRegistryFixture(registryDir)
      const index = await readRegistryIndex()
      const slug = await findSlugWithHeading(Object.keys(index.entries), 'Tensions')
      assert.ok(slug, 'expected at least one registry entry with a "## Tensions" section')
      const slugDir = path.join(registryDir, slug!)
      const original = await fs.readFile(path.join(slugDir, 'profile.md'), 'utf8')
      const tampered = original.replace(/(## Tensions\n)/, `$1${injected}`)
      assert.notEqual(tampered, original, `expected to inject a lone ${kind} brace into Tensions`)
      await fs.writeFile(path.join(slugDir, 'profile.md'), tampered, 'utf8')

      await assert.rejects(
        generate({ registryDir, outDir, validateFn: async () => true }),
        new RegExp(`(${slug}.*Tensions.*MDX expression|MDX expression.*${slug}.*Tensions)`, 'is'),
      )
    } finally {
      await fs.rm(registryDir, { recursive: true, force: true })
      await fs.rm(outDir, { recursive: true, force: true })
    }
  })
}

test('generate() renders a fixture with reordered profile headings without error', async () => {
  const registryDir = await mktmp('dev-like-docsgen-reorder-')
  const outDir = await mktmp('dev-like-docsgen-reorder-out-')
  try {
    await copyRegistryFixture(registryDir)
    const index = await readRegistryIndex()
    const slug = await findSlugWithHeading(Object.keys(index.entries), ['Tensions', 'Core principle'])
    assert.ok(slug, 'expected a registry entry with both "## Tensions" and "## Core principle" sections')
    const slugDir = path.join(registryDir, slug!)
    const original = await fs.readFile(path.join(slugDir, 'profile.md'), 'utf8')
    const tensionsMatch = /## Tensions\n[\s\S]*?(?=\n## |$)/.exec(original)
    assert.ok(tensionsMatch)
    const withoutTensions = original.replace(tensionsMatch[0], '').trimEnd() + '\n'
    const reordered = original.slice(0, original.indexOf('## Identity')) + tensionsMatch[0] + '\n' + withoutTensions.slice(original.indexOf('## Identity'))
    await fs.writeFile(path.join(slugDir, 'profile.md'), reordered, 'utf8')

    const result = await generate({
      registryDir,
      outDir,
      validateFn: async () => true,
    })
    assert.equal(result.ok, true, `generate failed: ${JSON.stringify(result.errors)}`)
    const mdx = await fs.readFile(path.join(outDir, `${slug}.md`), 'utf8')
    assert.ok(mdx.includes('Tensions'))
    assert.ok(mdx.includes('Core principle'))
  } finally {
    await fs.rm(registryDir, { recursive: true, force: true })
    await fs.rm(outDir, { recursive: true, force: true })
  }
})

test('generate() is deterministic across repeated runs', async () => {
  const outDirA = await mktmp()
  const outDirB = await mktmp()
  try {
    const resultA = await generate({ registryDir: REGISTRY_DIR, outDir: outDirA })
    const resultB = await generate({ registryDir: REGISTRY_DIR, outDir: outDirB })
    assert.equal(resultA.ok, true)
    assert.equal(resultB.ok, true)

    const filesA = (await fs.readdir(outDirA)).sort()
    const filesB = (await fs.readdir(outDirB)).sort()
    assert.deepEqual(filesA, filesB)

    for (const rel of filesA) {
      const bufA = await fs.readFile(path.join(outDirA, rel))
      const bufB = await fs.readFile(path.join(outDirB, rel))
      assert.ok(bufA.equals(bufB), `file ${rel} differs between runs`)
    }
  } finally {
    await fs.rm(outDirA, { recursive: true, force: true })
    await fs.rm(outDirB, { recursive: true, force: true })
  }
})

test('CLI: exits 0 and writes generated output to a given --out directory', async () => {
  const outDir = await mktmp('dev-like-docsgen-cli-')
  const res = spawnSync('bun', [GENERATOR, '--out', outDir], { cwd: DOCS_ROOT, encoding: 'utf8' })
  try {
    assert.equal(res.status, 0, `CLI failed: ${res.stderr}`)
    assert.ok(fss.existsSync(path.join(outDir, 'index.md')))
  } finally {
    await fs.rm(outDir, { recursive: true, force: true })
  }
})

test('generated output path under docs/src/content/docs/_generated is ignored by git', () => {
  const probe = path.join(DOCS_ROOT, 'src', 'content', 'docs', '_generated', 'index.md')
  const res = spawnSync('git', ['check-ignore', '--no-index', probe], { cwd: REPO_ROOT, encoding: 'utf8' })
  assert.equal(res.status, 0, `expected ${probe} to be git-ignored; git check-ignore exit ${res.status}`)
})

test('docs package.json: dev and build scripts generate registry pages before running Astro', async () => {
  const pkg = JSON.parse(await fs.readFile(path.join(DOCS_ROOT, 'package.json'), 'utf8'))
  for (const script of ['dev', 'build']) {
    const command: string = pkg.scripts[script]
    assert.ok(
      /bun run generate/.test(command),
      `docs package.json "${script}" script must run "bun run generate" before astro: got "${command}"`,
    )
    const generateIndex = command.indexOf('bun run generate')
    const astroIndex = command.indexOf('astro')
    assert.ok(
      generateIndex >= 0 && astroIndex > generateIndex,
      `docs package.json "${script}" script must run generate before astro: got "${command}"`,
    )
  }
})
