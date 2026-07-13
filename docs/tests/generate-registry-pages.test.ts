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

// --- Unit: parseSections ---

test('parseSections keys by heading name regardless of order', () => {
  const text = '# Title\n\n## Tensions\nT body\n\n## Core principle\nC body\n'
  const sections = parseSections(text)
  assert.equal(sections['Tensions'], 'T body')
  assert.equal(sections['Core principle'], 'C body')
})

test('parseSections tolerates missing sections (theo deviation)', async () => {
  const theoProfile = await fs.readFile(path.join(REGISTRY_DIR, 'theo', 'profile.md'), 'utf8')
  const sections = parseSections(theoProfile)
  assert.equal(sections['Core principle'], undefined)
  assert.equal(sections['Workflow shape'], undefined)
  assert.ok(sections['Identity'])
  assert.ok(sections['Principles (cited)'])
  assert.ok(sections['Stack'])
  // theo's heading deviates: "Tensions — read before installing" rather than plain "Tensions".
  const tensionsKey = Object.keys(sections).find((k) => k.startsWith('Tensions'))
  assert.ok(tensionsKey, 'expected a heading starting with "Tensions"')
})

// --- Unit: normalizeCitations ---

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

// --- Integration: generate() ---

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
    const result = await generate({ registryDir: REGISTRY_DIR, outDir })
    assert.equal(result.ok, true, `generate failed: ${JSON.stringify(result.errors)}`)
    const files = await fs.readdir(outDir)
    assert.ok(files.includes('index.mdx'))
    assert.ok(files.includes('every.mdx'))
    assert.ok(files.includes('oxide.mdx'))
    assert.ok(files.includes('theo.mdx'))
  } finally {
    await fs.rm(outDir, { recursive: true, force: true })
  }
})

test('generate() renders entries in registry/index.json key order', async () => {
  const outDir = await mktmp()
  try {
    const result = await generate({ registryDir: REGISTRY_DIR, outDir })
    assert.equal(result.ok, true)
    const indexMdx = await fs.readFile(path.join(outDir, 'index.mdx'), 'utf8')
    const everyPos = indexMdx.indexOf('Every')
    const oxidePos = indexMdx.indexOf('Oxide')
    const theoPos = indexMdx.indexOf('Theo Browne')
    assert.ok(everyPos > -1 && oxidePos > -1 && theoPos > -1)
    assert.ok(everyPos < oxidePos, 'every must precede oxide (index.json order)')
    assert.ok(oxidePos < theoPos, 'oxide must precede theo (index.json order)')
  } finally {
    await fs.rm(outDir, { recursive: true, force: true })
  }
})

test('generate() emits Starlight frontmatter with title and description', async () => {
  const outDir = await mktmp()
  try {
    const result = await generate({ registryDir: REGISTRY_DIR, outDir })
    assert.equal(result.ok, true)
    const everyMdx = await fs.readFile(path.join(outDir, 'every.mdx'), 'utf8')
    assert.match(everyMdx, /^---\ntitle:/)
    assert.match(everyMdx, /\ndescription:/)
    assert.match(everyMdx, /\n---\n/)
  } finally {
    await fs.rm(outDir, { recursive: true, force: true })
  }
})

test('generate() emits a Starlight custom slug so output routes under /registry/ despite living in _generated/', async () => {
  const outDir = await mktmp()
  try {
    const result = await generate({ registryDir: REGISTRY_DIR, outDir })
    assert.equal(result.ok, true)

    const indexMdx = await fs.readFile(path.join(outDir, 'index.mdx'), 'utf8')
    assert.match(indexMdx, /\nslug: registry\n/, 'index.mdx must declare slug: registry')

    for (const slug of ['every', 'oxide', 'theo']) {
      const mdx = await fs.readFile(path.join(outDir, `${slug}.mdx`), 'utf8')
      assert.match(
        mdx,
        new RegExp(`\\nslug: registry/${slug}\\n`),
        `${slug}.mdx must declare slug: registry/${slug}`,
      )
    }
  } finally {
    await fs.rm(outDir, { recursive: true, force: true })
  }
})

test('generate() includes consent tier, source count, and updated date for each entry', async () => {
  const outDir = await mktmp()
  try {
    const result = await generate({ registryDir: REGISTRY_DIR, outDir })
    assert.equal(result.ok, true)
    const oxideEntry = JSON.parse(
      await fs.readFile(path.join(REGISTRY_DIR, 'oxide', 'entry.json'), 'utf8'),
    )
    const oxideMdx = await fs.readFile(path.join(outDir, 'oxide.mdx'), 'utf8')
    assert.ok(oxideMdx.includes(oxideEntry.consentTier))
    assert.ok(oxideMdx.includes(oxideEntry.updated))
    assert.ok(oxideMdx.includes(String(oxideEntry.sources.length)))
  } finally {
    await fs.rm(outDir, { recursive: true, force: true })
  }
})

test('generate() shows npx dev-like <slug> and SKILL.md link for prebuilt entries (every, oxide)', async () => {
  const outDir = await mktmp()
  try {
    const result = await generate({ registryDir: REGISTRY_DIR, outDir })
    assert.equal(result.ok, true)
    for (const slug of ['every', 'oxide']) {
      const mdx = await fs.readFile(path.join(outDir, `${slug}.mdx`), 'utf8')
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

test('generate() shows /dev-like theo generation instruction for theo (no prebuilt skill)', async () => {
  const outDir = await mktmp()
  try {
    const result = await generate({ registryDir: REGISTRY_DIR, outDir })
    assert.equal(result.ok, true)
    const theoMdx = await fs.readFile(path.join(outDir, 'theo.mdx'), 'utf8')
    assert.ok(theoMdx.includes('/dev-like theo'))
    assert.ok(!theoMdx.includes('npx dev-like theo'))
  } finally {
    await fs.rm(outDir, { recursive: true, force: true })
  }
})

test('generate() normalizes citations in generated MDX but leaves source profile.md unchanged', async () => {
  const outDir = await mktmp()
  try {
    const beforeProfile = await fs.readFile(path.join(REGISTRY_DIR, 'every', 'profile.md'), 'utf8')
    const result = await generate({ registryDir: REGISTRY_DIR, outDir })
    assert.equal(result.ok, true)
    const afterProfile = await fs.readFile(path.join(REGISTRY_DIR, 'every', 'profile.md'), 'utf8')
    assert.equal(beforeProfile, afterProfile, 'source profile.md must not be modified')

    const everyMdx = await fs.readFile(path.join(outDir, 'every.mdx'), 'utf8')
    assert.ok(!everyMdx.includes('[['), 'generated MDX must not contain raw [[citation]] syntax')
    assert.ok(
      everyMdx.includes('[CEP](https://github.com/EveryInc/compound-engineering-plugin)'),
      'generated MDX must contain normalized citation link',
    )
  } finally {
    await fs.rm(outDir, { recursive: true, force: true })
  }
})

test('generate() renders theo despite missing Core principle / Workflow shape sections', async () => {
  const outDir = await mktmp()
  try {
    const result = await generate({ registryDir: REGISTRY_DIR, outDir })
    assert.equal(result.ok, true)
    const theoMdx = await fs.readFile(path.join(outDir, 'theo.mdx'), 'utf8')
    assert.ok(theoMdx.includes('Identity'))
    assert.ok(theoMdx.includes('Principles (cited)'))
    assert.ok(theoMdx.includes('Stack'))
    assert.ok(theoMdx.includes('Tensions'))
  } finally {
    await fs.rm(outDir, { recursive: true, force: true })
  }
})

test('generate() renders a fixture with reordered profile headings without error', async () => {
  const registryDir = await mktmp('dev-like-docsgen-reorder-')
  const outDir = await mktmp('dev-like-docsgen-reorder-out-')
  try {
    await copyRegistryFixture(registryDir)
    // Reorder: put Tensions before Core principle / Workflow shape / Stack.
    const slugDir = path.join(registryDir, 'every')
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
    const everyMdx = await fs.readFile(path.join(outDir, 'every.mdx'), 'utf8')
    assert.ok(everyMdx.includes('Tensions'))
    assert.ok(everyMdx.includes('Core principle'))
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

// --- CLI integration ---

test('CLI: exits 0 and writes generated output for the real registry', async () => {
  const outDir = path.join(DOCS_ROOT, 'src', 'content', 'docs', '_generated')
  const res = spawnSync('bun', [GENERATOR], { cwd: DOCS_ROOT, encoding: 'utf8' })
  try {
    assert.equal(res.status, 0, `CLI failed: ${res.stderr}`)
    assert.ok(fss.existsSync(path.join(outDir, 'index.mdx')))
  } finally {
    await fs.rm(outDir, { recursive: true, force: true })
  }
})

test('generated output directory is ignored by git', async () => {
  const outDir = path.join(DOCS_ROOT, 'src', 'content', 'docs', '_generated')
  await fs.mkdir(outDir, { recursive: true })
  const probe = path.join(outDir, 'index.mdx')
  await fs.writeFile(probe, 'placeholder', 'utf8')
  try {
    const res = spawnSync('git', ['check-ignore', probe], { cwd: REPO_ROOT, encoding: 'utf8' })
    assert.equal(res.status, 0, `expected ${probe} to be git-ignored; git check-ignore exit ${res.status}`)
  } finally {
    await fs.rm(outDir, { recursive: true, force: true })
  }
})
