#!/usr/bin/env bun
// Deterministic registry documentation generator: registry/index.json + registry/<slug>/{entry.json,profile.md}
// -> gitignored Starlight MDX under docs/src/content/docs/_generated/. Zero deps by design
// (mirrors scripts/validate.mjs and scripts/generate-skill.mjs). Registry stays authoritative;
// generated output is disposable and rebuilt fresh on every invocation.
//
// Usage: bun docs/scripts/generate-registry-pages.ts [--registry <dir>] [--out <dir>]

import { readFile, readdir, rm, mkdir, writeFile, stat } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DOCS_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const REPO_ROOT = join(DOCS_ROOT, '..')
const DEFAULT_REGISTRY_DIR = join(REPO_ROOT, 'registry')
const DEFAULT_OUT_DIR = join(DOCS_ROOT, 'src', 'content', 'docs', '_generated')

export type ConsentTier = 'self-published' | 'stated' | 'observed' | 'social'
export type RegistryKind = 'org' | 'person'

export interface RegistrySource {
  url: string
  fetched: string
  tier: ConsentTier
  note?: string
}

export interface RegistryEntry {
  slug: string
  name: string
  kind: RegistryKind
  aliases?: string[]
  consentTier: ConsentTier
  updated: string
  homepage?: string
  summary?: string
  sources: RegistrySource[]
}

export interface RegistryIndexEntry {
  name: string
  kind: RegistryKind
  aliases?: string[]
  consentTier: ConsentTier
  updated: string
}

export interface RegistryIndex {
  $schema?: string
  version: number
  entries: Record<string, RegistryIndexEntry>
}

export type ProfileSections = Record<string, string>

export interface GenerateOptions {
  registryDir?: string
  outDir?: string
  validateFn?: () => Promise<boolean>
}

export interface GenerateResult {
  ok: boolean
  errors: string[]
}

// Split profile.md on `## ` headings into a map of heading text -> trimmed body.
// Lenient by design: section order and presence vary across profiles (theo has no
// Core principle / Workflow shape sections); callers must not assume positional structure.
export function parseSections(text: string): ProfileSections {
  const sections: ProfileSections = {}
  const parts = text.split(/^## /m).slice(1) // drop content before first '## '
  for (const part of parts) {
    const nl = part.indexOf('\n')
    const heading = (nl === -1 ? part : part.slice(0, nl)).trim()
    const body = (nl === -1 ? '' : part.slice(nl + 1)).trim()
    sections[heading] = body
  }
  return sections
}

// Convert registry citation syntax `[[label]](url)` to standard Markdown `[label](url)`.
// Only ever applied to generated output; source profile.md files are never rewritten.
export function normalizeCitations(text: string): string {
  return text.replace(/\[\[([^\]]+)\]\]\(([^)]+)\)/g, '[$1]($2)')
}

function escapeYamlScalar(value: unknown): string {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

// `slug` is a supported Starlight frontmatter field that overrides the page's route,
// independent of its file location under src/content/docs/. Source files live under the
// gitignored _generated/ directory, but slug pins routes to /registry/ and /registry/<slug>/
// rather than /_generated/ and /_generated/<slug>/.
// https://starlight.astro.build/reference/frontmatter/
function frontmatter(title: string, description: string, slug: string): string {
  return `---\ntitle: "${escapeYamlScalar(title)}"\ndescription: "${escapeYamlScalar(description)}"\nslug: ${slug}\n---\n`
}

function withTrailingNewline(text: string): string {
  return text.replace(/\n*$/, '\n')
}

function hasPrebuiltSkill(registryDir: string, slug: string): Promise<boolean> {
  return stat(join(registryDir, slug, 'skill', `develop-like-${slug}`, 'SKILL.md'))
    .then(() => true)
    .catch(() => false)
}

function installAffordance(slug: string, prebuilt: boolean): string {
  if (prebuilt) {
    return [
      `Install: \`npx dev-like ${slug}\``,
      `Prebuilt skill: [SKILL.md](https://github.com/marcusrbrown/dev-like/blob/main/registry/${slug}/skill/develop-like-${slug}/SKILL.md)`,
    ].join('\n\n')
  }
  return `Generate live: \`/dev-like ${slug}\` (no prebuilt skill committed for this entry).`
}

// Section headings may deviate slightly from the canonical name (theo's profile uses
// "Tensions — read before installing" rather than plain "Tensions"); match by prefix so
// generation doesn't require every profile to use identical heading text.
function findSectionKey(sections: ProfileSections, canonicalName: string): string | undefined {
  if (sections[canonicalName] !== undefined) return canonicalName
  return Object.keys(sections).find((key) => key.startsWith(canonicalName))
}

function renderSectionsBody(sections: ProfileSections, order: string[]): string {
  const rendered: string[] = []
  for (const name of order) {
    const key = findSectionKey(sections, name)
    if (key === undefined) continue
    rendered.push(`## ${name}\n\n${normalizeCitations(sections[key])}`)
  }
  return rendered.join('\n\n')
}

// The canonical section presentation order for generated entry pages. Sections absent from
// a given profile (e.g. theo has no Core principle / Workflow shape) are simply skipped.
const SECTION_ORDER = [
  'Identity',
  'Core principle',
  'Workflow shape',
  'Stack',
  'Principles (cited)',
  'Tensions',
]

async function renderEntry(registryDir: string, slug: string): Promise<string> {
  const entry: RegistryEntry = JSON.parse(
    await readFile(join(registryDir, slug, 'entry.json'), 'utf8'),
  )
  const profileText = await readFile(join(registryDir, slug, 'profile.md'), 'utf8')
  const sections = parseSections(profileText)
  const prebuilt = await hasPrebuiltSkill(registryDir, slug)

  const description = entry.summary ?? `${entry.name} engineering culture profile.`
  const meta = [
    `**Consent tier:** ${entry.consentTier}`,
    `**Kind:** ${entry.kind}`,
    `**Sources:** ${entry.sources.length}`,
    `**Updated:** ${entry.updated}`,
  ].join(' · ')

  const body = renderSectionsBody(sections, SECTION_ORDER)

  const mdx = [
    frontmatter(entry.name, description, `registry/${slug}`),
    meta,
    '',
    installAffordance(slug, prebuilt),
    '',
    body,
    '',
  ].join('\n')

  return withTrailingNewline(mdx)
}

function renderIndex(orderedSlugs: string[], entries: Record<string, RegistryIndexEntry>): string {
  const rows = orderedSlugs.map((slug) => {
    const e = entries[slug]
    return `| [${e.name}](/dev-like/registry/${slug}/) | ${e.kind} | ${e.consentTier} | ${e.updated} |`
  })

  const mdx = [
    frontmatter('Registry', 'Browse profiled engineering cultures with cited sources.', 'registry'),
    '| Name | Kind | Consent tier | Updated |',
    '| --- | --- | --- | --- |',
    ...rows,
    '',
  ].join('\n')

  return withTrailingNewline(mdx)
}

/**
 * Generate registry MDX into outDir. Validates first via validateFn (defaults to the real
 * validate() from scripts/validate.mjs) and aborts before writing anything on failure, so
 * malformed registry data is never used as generation input. Writes themselves are a
 * sequential loop, not an atomic transaction — a failure partway through a run (e.g. disk
 * error) can still leave a partially-written output set; this only guarantees that a *known
 * invalid* registry never starts generating in the first place.
 */
export async function generate({
  registryDir = DEFAULT_REGISTRY_DIR,
  outDir = DEFAULT_OUT_DIR,
  validateFn,
}: GenerateOptions = {}): Promise<GenerateResult> {
  const runValidate = validateFn ?? (await import('../../scripts/validate.mjs')).validate

  const ok = await runValidate()
  if (!ok) {
    return { ok: false, errors: ['registry validation failed; see validate() output above'] }
  }

  const index: RegistryIndex = JSON.parse(await readFile(join(registryDir, 'index.json'), 'utf8'))
  const orderedSlugs = Object.keys(index.entries)

  const dirNames: string[] = []
  for (const name of await readdir(registryDir)) {
    const p = join(registryDir, name)
    if ((await stat(p)).isDirectory() && name !== 'schema') dirNames.push(name)
  }
  const missing = orderedSlugs.filter((slug) => !dirNames.includes(slug))
  if (missing.length) {
    return { ok: false, errors: [`registry/index.json references missing dir(s): ${missing.join(', ')}`] }
  }

  // Clear and regenerate as one disposable set so deleted registry entries never leave
  // stale generated pages behind.
  await rm(outDir, { recursive: true, force: true })
  await mkdir(outDir, { recursive: true })

  for (const slug of orderedSlugs) {
    const mdx = await renderEntry(registryDir, slug)
    await writeFile(join(outDir, `${slug}.mdx`), mdx, 'utf8')
  }

  const indexMdx = renderIndex(orderedSlugs, index.entries)
  await writeFile(join(outDir, 'index.mdx'), indexMdx, 'utf8')

  return { ok: true, errors: [] }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  let registryDir = DEFAULT_REGISTRY_DIR
  let outDir = DEFAULT_OUT_DIR
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--registry') registryDir = args[++i]
    else if (args[i] === '--out') outDir = args[++i]
  }

  const result = await generate({ registryDir, outDir })
  if (!result.ok) {
    for (const err of result.errors) console.error(`FAIL ${err}`)
    process.exitCode = 1
    return
  }
  console.log(`Wrote generated registry pages to ${outDir}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}
