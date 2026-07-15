#!/usr/bin/env bun

import { readFile, readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, posix, relative, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'

const DOCS_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const REPO_ROOT = join(DOCS_ROOT, '..')
const DEFAULT_DIST_DIR = join(DOCS_ROOT, 'dist')
const DEFAULT_BASE = '/dev-like'
const DEFAULT_REGISTRY_DIR = join(REPO_ROOT, 'registry')
const SITE_ORIGIN = 'https://mrbro.dev'

const REF_ATTR_RE = /\s(?:href|src)=(?:"([^"]*)"|'([^']*)')/g
const SRCSET_ATTR_RE = /\ssrcset=(?:"([^"]*)"|'([^']*)')/g

export interface LinkIssue {
  file: string
  ref: string
  reason: string
}

export interface CheckResult {
  ok: boolean
  issues: LinkIssue[]
  checked: number
}

export interface CheckOptions {
  distDir: string
  base?: string
  registryDir?: string
}

function normalizeBase(base: string): string {
  const withLeadingSlash = base.startsWith('/') ? base : `/${base}`
  return withLeadingSlash.endsWith('/') && withLeadingSlash !== '/'
    ? withLeadingSlash.slice(0, -1)
    : withLeadingSlash
}

async function walkHtmlFiles(dir: string): Promise<string[]> {
  const out: string[] = []
  for (const name of await readdir(dir)) {
    const full = join(dir, name)
    const s = await stat(full)
    if (s.isDirectory()) out.push(...(await walkHtmlFiles(full)))
    else if (name.endsWith('.html')) out.push(full)
  }
  return out
}

function posixify(p: string): string {
  return p.split('\\').join('/')
}

function stripQueryAndFragment(ref: string): string {
  return ref.split('#')[0]!.split('?')[0]!
}

function resolveDistFile(distDir: string, pathname: string): string {
  let p = pathname === '' ? '/' : pathname
  // Astro's special 404 route is emitted as a flat 404.html, not 404/index.html.
  if (p === '/404' || p === '/404/') return join(distDir, '404.html')
  const lastSegment = p.split('/').pop() ?? ''
  const hasExtension = /\.[a-zA-Z0-9]+$/.test(lastSegment)
  if (!hasExtension && !p.endsWith('/')) p += '/'
  if (p.endsWith('/')) p += 'index.html'
  return join(distDir, p)
}

type Classification =
  | { kind: 'skip' }
  | { kind: 'escape'; pathname: string }
  | { kind: 'internal'; pathname: string }

function classifyRef(ref: string, base: string, pageDistDir: string): Classification {
  if (ref === '') return { kind: 'skip' }
  if (/^(mailto:|tel:|data:)/i.test(ref)) return { kind: 'skip' }
  if (ref.startsWith('#')) return { kind: 'skip' }

  if (/^https?:\/\//i.test(ref)) {
    let url: URL
    try {
      url = new URL(ref)
    } catch {
      return { kind: 'skip' }
    }
    if (url.origin !== SITE_ORIGIN) return { kind: 'skip' }
    return classifyPathname(url.pathname, base)
  }

  if (ref.startsWith('//')) return { kind: 'skip' }
  if (/^[a-z][a-z0-9+.-]*:/i.test(ref)) return classifyPathname(ref, base)

  const stripped = stripQueryAndFragment(ref)
  if (stripped === '') return { kind: 'skip' }

  if (stripped.startsWith('/')) return classifyPathname(stripped, base)

  // Resolve using POSIX URL-path semantics, not platform filesystem semantics, for cross-platform consistency.
  const pageUrlPath = `${base}${pageDistDir === '.' ? '' : `/${posixify(pageDistDir)}`}/`
  const resolved = posix.resolve(pageUrlPath, stripped)
  return classifyPathname(resolved, base)
}

function classifyPathname(pathname: string, base: string): Classification {
  const normalized = posix.normalize(pathname)
  if (normalized === base || normalized.startsWith(`${base}/`)) {
    const subPath = normalized === base ? '/' : normalized.slice(base.length)
    return { kind: 'internal', pathname: subPath }
  }
  return { kind: 'escape', pathname }
}

async function checkRequiredOutputs(
  distDir: string,
  registryDir: string,
): Promise<LinkIssue[]> {
  const issues: LinkIssue[] = []
  const requiredPaths = ['/', '/ethics/', '/registry/', '/og-image.png']

  const index: { entries: Record<string, unknown> } = JSON.parse(
    await readFile(join(registryDir, 'index.json'), 'utf8'),
  )
  for (const slug of Object.keys(index.entries)) {
    requiredPaths.push(`/registry/${slug}/`, `/og/${slug}.png`)
  }

  for (const p of requiredPaths) {
    const file = resolveDistFile(distDir, p)
    if (!existsSync(file)) {
      issues.push({ file: '<required output>', ref: p, reason: `required output missing: ${file}` })
    }
  }
  return issues
}

export async function checkInternalLinks(opts: CheckOptions): Promise<CheckResult> {
  const distDir = resolvePath(opts.distDir)
  const base = normalizeBase(opts.base ?? DEFAULT_BASE)
  const registryDir = opts.registryDir ?? DEFAULT_REGISTRY_DIR

  const issues: LinkIssue[] = []
  let checked = 0

  const files = await walkHtmlFiles(distDir)
  for (const file of files) {
    const relFile = relative(distDir, file)
    const pageDistDir = dirname(relFile)
    const text = await readFile(file, 'utf8')

    const refs: string[] = []
    for (const m of text.matchAll(REF_ATTR_RE)) refs.push((m[1] ?? m[2])!)
    for (const m of text.matchAll(SRCSET_ATTR_RE)) {
      for (const entry of (m[1] ?? m[2])!.split(',')) {
        const url = entry.trim().split(/\s+/)[0]
        if (url) refs.push(url)
      }
    }

    for (const ref of refs) {
      const classification = classifyRef(ref, base, pageDistDir)
      if (classification.kind === 'skip') continue
      checked++

      if (classification.kind === 'escape') {
        issues.push({
          file: relFile,
          ref,
          reason: `base-path escape: resolves to "${classification.pathname}", expected under "${base}/"`,
        })
        continue
      }

      const targetFile = resolveDistFile(distDir, classification.pathname)
      if (!existsSync(targetFile)) {
        issues.push({ file: relFile, ref, reason: `missing target: ${targetFile}` })
        continue
      }

      const s = classification.pathname
      const lastSegment = s.split('/').pop() ?? ''
      const hasExtension = /\.[a-zA-Z0-9]+$/.test(lastSegment)
      if (!hasExtension && !s.endsWith('/')) {
        issues.push({
          file: relFile,
          ref,
          reason: `missing trailing slash: directory route "${s}" must be referenced as "${s}/"`,
        })
      }
    }
  }

  issues.push(...(await checkRequiredOutputs(distDir, registryDir)))

  return { ok: issues.length === 0, issues, checked }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  let distDir = DEFAULT_DIST_DIR
  let base = DEFAULT_BASE
  let registryDir = DEFAULT_REGISTRY_DIR
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dist') distDir = args[++i]!
    else if (args[i] === '--base') base = args[++i]!
    else if (args[i] === '--registry') registryDir = args[++i]!
  }

  const result = await checkInternalLinks({ distDir, base, registryDir })
  for (const issue of result.issues) {
    console.error(`FAIL ${issue.file}: ${issue.ref}; ${issue.reason}`)
  }
  console.log(`\n${result.checked} internal references checked; ${result.issues.length} failures`)

  if (!result.ok) {
    process.exitCode = 1
    return
  }
  console.log('All internal links resolve under the site base.')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}
