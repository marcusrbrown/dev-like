#!/usr/bin/env bun

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

export function parseSections(text: string): ProfileSections {
  const sections: ProfileSections = {}
  const parts = text.split(/^## /m).slice(1)
  for (const part of parts) {
    const nl = part.indexOf('\n')
    const heading = (nl === -1 ? part : part.slice(0, nl)).trim()
    const body = (nl === -1 ? '' : part.slice(nl + 1)).trim()
    sections[heading] = body
  }
  return sections
}

export function normalizeCitations(text: string): string {
  return text.replace(/\[\[([^\]]+)\]\]\(([^)]+)\)/g, '[$1]($2)')
}

function escapeYamlScalar(value: unknown): string {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

// Starlight's `slug` frontmatter field overrides the route, pinning generated pages under /registry/ regardless of their _generated/ file location.
function frontmatter(title: string, description: string, slug: string): string {
  return `---\ntitle: "${escapeYamlScalar(title)}"\ndescription: "${escapeYamlScalar(description)}"\nslug: ${slug}\n---\n`
}

function withTrailingNewline(text: string): string {
  return text.replace(/\n*$/, '\n')
}

async function hasPrebuiltSkill(registryDir: string, slug: string): Promise<boolean> {
  try {
    const s = await stat(join(registryDir, slug, 'skill', `develop-like-${slug}`, 'SKILL.md'))
    return s.isFile()
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOENT' || code === 'ENOTDIR') return false
    throw err
  }
}

// Reuses the landing page's raw-HTML copy-button pattern (see src/content/docs/index.mdx's
// hero button and CopyCommand.astro): a <button data-copy-button data-command=... data-umami-event=...>
// wired up client-side by the site-wide Head override's delegated click handler
// (src/components/Head.astro), which binds any [data-copy-button] element on the
// page regardless of which component rendered it. The `registry-copy-button` class
// is self-contained (see custom.css) since these buttons aren't wrapped in
// CopyCommand.astro's .command-block-wrapper positioning context.
function installCopyButton(command: string): string {
  return `<button type="button" class="registry-copy-button" data-copy-button data-command="${command}" data-umami-event="install-cli-cached" aria-label="Copy command: ${command}" title="Copy"><span class="command-text">${command}</span><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="icon-copy"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="icon-copied" style="display:none;"><polyline points="20 6 9 17 4 12"></polyline></svg><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="icon-failed" style="display:none;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>`
}

function installAffordance(slug: string, prebuilt: boolean): string {
  if (prebuilt) {
    const command = `npx dev-like ${slug}`
    return [
      `Install: ${installCopyButton(command)}`,
      `Prebuilt skill: [SKILL.md](https://github.com/marcusrbrown/dev-like/blob/main/registry/${slug}/skill/develop-like-${slug}/SKILL.md)`,
    ].join('\n\n')
  }
  return `Generate live: \`/dev-like ${slug}\` (no prebuilt skill committed for this entry).`
}

function findSectionKey(sections: ProfileSections, canonicalName: string): string | undefined {
  if (sections[canonicalName] !== undefined) return canonicalName
  return Object.keys(sections).find((key) => key.startsWith(canonicalName))
}

// Guards against profile.md content unsafe to render as generated Markdown: raw HTML/JSX, MDX expressions, import/export statements, and javascript:/data: link schemes.
const HTML_JSX_TAG_RE = /<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s[^>]*)?>/
const MDX_EXPRESSION_RE = /[{}]/
const MDX_IMPORT_EXPORT_RE = /^\s*(?:import|export)\s/m
const UNSAFE_LINK_SCHEME_RE = /\]\(\s*(?:javascript|data):/i

function validateSectionContent(slug: string, sectionName: string, body: string): void {
  if (HTML_JSX_TAG_RE.test(body)) {
    throw new Error(`registry/${slug}/profile.md section "${sectionName}" contains raw HTML/JSX tags, which are not allowed in generated output`)
  }
  if (MDX_EXPRESSION_RE.test(body)) {
    throw new Error(`registry/${slug}/profile.md section "${sectionName}" contains MDX expression syntax ({...}), which is not allowed`)
  }
  if (MDX_IMPORT_EXPORT_RE.test(body)) {
    throw new Error(`registry/${slug}/profile.md section "${sectionName}" contains an MDX import/export statement, which is not allowed`)
  }
  if (UNSAFE_LINK_SCHEME_RE.test(body)) {
    throw new Error(`registry/${slug}/profile.md section "${sectionName}" contains a javascript:/data: link, which is not allowed`)
  }
}

function renderSectionsBody(slug: string, sections: ProfileSections, order: string[]): string {
  const rendered: string[] = []
  for (const name of order) {
    const key = findSectionKey(sections, name)
    if (key === undefined) continue
    const body = sections[key]
    validateSectionContent(slug, name, body)
    rendered.push(`## ${name}\n\n${normalizeCitations(body)}`)
  }
  return rendered.join('\n\n')
}

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

  const body = renderSectionsBody(slug, sections, SECTION_ORDER)

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
    'Don\u2019t see the shop you want? <a href="https://github.com/marcusrbrown/dev-like/issues/new?template=profile-request.yml" data-umami-event="request-profile">Request a profile</a>.',
    '',
  ].join('\n')

  return withTrailingNewline(mdx)
}

// A custom registryDir requires an explicit validateFn since the default validate() is hardcoded to the real registry/ tree.
export async function generate({
  registryDir = DEFAULT_REGISTRY_DIR,
  outDir = DEFAULT_OUT_DIR,
  validateFn,
}: GenerateOptions = {}): Promise<GenerateResult> {
  if (registryDir !== DEFAULT_REGISTRY_DIR && validateFn === undefined) {
    throw new Error('generate(): a custom registryDir requires an explicit validateFn (the default validate() only checks the real registry/ tree)')
  }

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

  const rendered: Array<{ file: string; content: string }> = []
  for (const slug of orderedSlugs) {
    const mdx = await renderEntry(registryDir, slug)
    rendered.push({ file: `${slug}.md`, content: mdx })
  }
  rendered.push({ file: 'index.md', content: renderIndex(orderedSlugs, index.entries) })

  await rm(outDir, { recursive: true, force: true })
  await mkdir(outDir, { recursive: true })

  for (const { file, content } of rendered) {
    await writeFile(join(outDir, file), content, 'utf8')
  }

  return { ok: true, errors: [] }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  let outDir = DEFAULT_OUT_DIR
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out') outDir = args[++i]
  }

  const result = await generate({ outDir })
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
