#!/usr/bin/env bun
// Retargets the canonical dev-like@X.Y.Z release to also exist as vX.Y.Z.
// Zero dependencies; side effects live behind AliasDeps for testing.

import {readFile} from 'node:fs/promises'
import {join, dirname} from 'node:path'
import {fileURLToPath} from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const GH_TIMEOUT_MS = 30_000

export interface PackageInfo {
  name: string
  version: string
}

export interface RefInfo {
  sha: string
  type: 'commit' | 'tag'
}

export interface ReleaseInfo {
  id: number
  tag_name: string
}

export interface AliasDeps {
  readPackageJson: () => Promise<PackageInfo>
  readChangelog: () => Promise<string>
  getRefSha: (tag: string) => Promise<RefInfo | null>
  getTagObject: (sha: string) => Promise<RefInfo>
  getRelease: (tag: string) => Promise<ReleaseInfo | null>
  createRef: (tag: string, sha: string) => Promise<void>
  patchRelease: (id: number, fields: {tag_name: string; name: string}) => Promise<void>
  createRelease: (tag: string, sha: string, notes: string) => Promise<void>
}

// Extracts the `## <version>` section from a Changesets CHANGELOG.
export function extractChangelogSection(changelog: string, version: string): string {
  const heading = `## ${version}`
  const lines = changelog.split('\n')
  const start = lines.findIndex((line) => line.trim() === heading)
  if (start === -1) {
    throw new Error(`CHANGELOG.md has no "${heading}" section`)
  }
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((line) => /^## /.test(line))
  const body = end === -1 ? rest : rest.slice(0, end)
  return body.join('\n').trim()
}

// Validates parsed package.json has usable name/version.
export function parsePackageInfo(value: unknown): PackageInfo {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('package.json must be a JSON object')
  }
  const {name, version} = value as {name?: unknown; version?: unknown}
  if (typeof name !== 'string' || name === '') {
    throw new Error('package.json "name" must be a non-empty string')
  }
  if (typeof version !== 'string' || version === '') {
    throw new Error('package.json "version" must be a non-empty string')
  }
  return {name, version}
}

// Validates gh ref/tag output has a usable sha and known type.
export function parseRefInfo(sha: unknown, type: unknown): RefInfo {
  if (typeof sha !== 'string' || sha === '') {
    throw new Error(`gh ref output has an invalid sha: ${String(sha)}`)
  }
  if (type !== 'commit' && type !== 'tag') {
    throw new Error(`gh ref output has an unknown object type: ${String(type)}`)
  }
  return {sha, type}
}

// Validates gh release output has a usable id and tag_name.
export function parseReleaseInfo(id: unknown, tagName: unknown): ReleaseInfo {
  const idStr = typeof id === 'number' ? String(id) : id
  if (typeof idStr !== 'string' || idStr === '') {
    throw new Error(`gh release output has an invalid id: ${String(id)}`)
  }
  const parsedId = Number(idStr)
  if (!Number.isFinite(parsedId) || !Number.isInteger(parsedId) || parsedId <= 0) {
    throw new Error(`gh release output has an invalid id: ${String(id)}`)
  }
  if (typeof tagName !== 'string' || tagName === '') {
    throw new Error(`gh release output has an invalid tag_name: ${String(tagName)}`)
  }
  return {id: parsedId, tag_name: tagName}
}

const MAX_TAG_DEPTH = 10

// Resolves an annotated tag object chain down to the underlying commit SHA.
export async function resolveTagToCommit(
  ref: RefInfo,
  getTagObject: (sha: string) => Promise<RefInfo>,
  depth = 0,
): Promise<string> {
  if (ref.type === 'commit') return ref.sha
  if (depth >= MAX_TAG_DEPTH) {
    throw new Error(`tag resolution exceeded depth ${MAX_TAG_DEPTH}`)
  }
  const next = await getTagObject(ref.sha)
  return resolveTagToCommit(next, getTagObject, depth + 1)
}

export async function reconcileAlias(deps: AliasDeps): Promise<void> {
  const pkg = parsePackageInfo(await deps.readPackageJson())

  const canonicalTag = `${pkg.name}@${pkg.version}`
  const aliasTag = `v${pkg.version}`

  const canonicalRef = await deps.getRefSha(canonicalTag)
  if (canonicalRef === null) {
    // No canonical release/tag occurred — nothing to reconcile.
    return
  }
  const canonicalCommit = await resolveTagToCommit(canonicalRef, deps.getTagObject)

  let aliasCommit: string | undefined
  const existingAliasRef = await deps.getRefSha(aliasTag)
  if (existingAliasRef !== null) {
    aliasCommit = await resolveTagToCommit(existingAliasRef, deps.getTagObject)
    if (aliasCommit !== canonicalCommit) {
      throw new Error(`alias tag ${aliasTag} already points to a different commit than ${canonicalTag}`)
    }
  } else {
    try {
      await deps.createRef(aliasTag, canonicalCommit)
      aliasCommit = canonicalCommit
    } catch (error) {
      // Concurrent reruns may race to create the ref; accept only if a refetch matches.
      const refetched = await deps.getRefSha(aliasTag)
      if (refetched === null) throw error
      const refetchedCommit = await resolveTagToCommit(refetched, deps.getTagObject)
      if (refetchedCommit !== canonicalCommit) {
        throw new Error(`alias tag ${aliasTag} create race resolved to a different commit than ${canonicalTag}`)
      }
      aliasCommit = refetchedCommit
    }
  }

  const canonicalRelease = await deps.getRelease(canonicalTag)
  const aliasRelease = await deps.getRelease(aliasTag)

  if (aliasRelease !== null) {
    if (canonicalRelease !== null) {
      throw new Error(`both ${canonicalTag} and ${aliasTag} releases exist; refusing to create a duplicate`)
    }
    return
  }

  if (canonicalRelease !== null) {
    await deps.patchRelease(canonicalRelease.id, {tag_name: aliasTag, name: aliasTag})
    return
  }

  // Canonical tag exists but no release was created upstream — create one.
  const changelog = await deps.readChangelog()
  const notes = extractChangelogSection(changelog, pkg.version)
  await deps.createRelease(aliasTag, aliasCommit, notes)
}

async function readPackageJson(): Promise<PackageInfo> {
  const raw = await readFile(join(ROOT, 'package.json'), 'utf8')
  return JSON.parse(raw) as PackageInfo
}

async function readChangelog(): Promise<string> {
  return readFile(join(ROOT, 'CHANGELOG.md'), 'utf8')
}

interface GhResult {
  code: number
  stdout: string
  stderr: string
}

async function runGh(args: string[], input?: string): Promise<GhResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), GH_TIMEOUT_MS)
  try {
    const proc = Bun.spawn(['gh', ...args], {
      stdin: input === undefined ? 'ignore' : 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
      signal: controller.signal,
    })
    if (input !== undefined) {
      proc.stdin.write(input)
      proc.stdin.end()
    }
    const [stdout, stderr, code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ])
    return {code, stdout, stderr}
  } finally {
    clearTimeout(timeout)
  }
}

function repoOrThrow(env: Record<string, string | undefined>): string {
  const repo = env.GITHUB_REPOSITORY
  if (!repo) throw new Error('GITHUB_REPOSITORY is required')
  return repo
}

// Strict: only an actual gh HTTP 404 marker counts as not-found.
export function isNotFound(result: GhResult): boolean {
  return result.code !== 0 && /\bHTTP 404\b/.test(`${result.stdout}${result.stderr}`)
}

function assertOk(result: GhResult, context: string): void {
  if (result.code !== 0) {
    throw new Error(`${context} failed: ${result.stderr || result.stdout}`)
  }
}

async function getRefSha(tag: string, env: Record<string, string | undefined>): Promise<RefInfo | null> {
  const repo = repoOrThrow(env)
  const result = await runGh(['api', `repos/${repo}/git/ref/tags/${tag}`, '--jq', '.object.sha,.object.type'])
  if (isNotFound(result)) return null
  assertOk(result, `get ref ${tag}`)
  const [sha, type] = result.stdout.trim().split('\n')
  return parseRefInfo(sha, type)
}

async function getTagObject(sha: string, env: Record<string, string | undefined>): Promise<RefInfo> {
  const repo = repoOrThrow(env)
  const result = await runGh(['api', `repos/${repo}/git/tags/${sha}`, '--jq', '.object.sha,.object.type'])
  assertOk(result, `get tag object ${sha}`)
  const [nextSha, type] = result.stdout.trim().split('\n')
  return parseRefInfo(nextSha, type)
}

async function getRelease(tag: string, env: Record<string, string | undefined>): Promise<ReleaseInfo | null> {
  const repo = repoOrThrow(env)
  const result = await runGh(['api', `repos/${repo}/releases/tags/${tag}`, '--jq', '.id,.tag_name'])
  if (isNotFound(result)) return null
  assertOk(result, `get release ${tag}`)
  const [id, tagName] = result.stdout.trim().split('\n')
  return parseReleaseInfo(id, tagName)
}

async function createRef(tag: string, sha: string, env: Record<string, string | undefined>): Promise<void> {
  const repo = repoOrThrow(env)
  const result = await runGh([
    'api',
    `repos/${repo}/git/refs`,
    '--method',
    'POST',
    '-f',
    `ref=refs/tags/${tag}`,
    '-f',
    `sha=${sha}`,
  ])
  assertOk(result, `create ref ${tag}`)
}

async function patchRelease(
  id: number,
  fields: {tag_name: string; name: string},
  env: Record<string, string | undefined>,
): Promise<void> {
  const repo = repoOrThrow(env)
  const result = await runGh([
    'api',
    `repos/${repo}/releases/${id}`,
    '--method',
    'PATCH',
    '-f',
    `tag_name=${fields.tag_name}`,
    '-f',
    `name=${fields.name}`,
  ])
  assertOk(result, `patch release ${id}`)
}

async function createRelease(
  tag: string,
  sha: string,
  notes: string,
  env: Record<string, string | undefined>,
): Promise<void> {
  const repo = repoOrThrow(env)
  const result = await runGh(
    [
      'api',
      `repos/${repo}/releases`,
      '--method',
      'POST',
      '-f',
      `tag_name=${tag}`,
      '-f',
      `target_commitish=${sha}`,
      '-f',
      `name=${tag}`,
      '-F',
      'body=@-',
    ],
    notes,
  )
  assertOk(result, `create release ${tag}`)
}

function defaultDeps(): AliasDeps {
  const env = process.env
  return {
    readPackageJson,
    readChangelog,
    getRefSha: (tag) => getRefSha(tag, env),
    getTagObject: (sha) => getTagObject(sha, env),
    getRelease: (tag) => getRelease(tag, env),
    createRef: (tag, sha) => createRef(tag, sha, env),
    patchRelease: (id, fields) => patchRelease(id, fields, env),
    createRelease: (tag, sha, notes) => createRelease(tag, sha, notes, env),
  }
}

if (import.meta.main) {
  reconcileAlias(defaultDeps()).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
