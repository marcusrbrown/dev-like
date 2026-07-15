import {test, expect, describe, afterEach} from 'bun:test'
import {readFileSync, mkdtempSync, rmSync, writeFileSync, chmodSync} from 'node:fs'
import {join, dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {tmpdir} from 'node:os'
import {
  extractChangelogSection,
  reconcileAlias,
  resolveTagToCommit,
  parsePackageInfo,
  parseRefInfo,
  parseReleaseInfo,
  isNotFound,
  type AliasDeps,
  type RefInfo,
  type ReleaseInfo,
} from '../.github/scripts/alias-release.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function makeDeps(overrides: Partial<AliasDeps> = {}): AliasDeps {
  return {
    readPackageJson: async () => ({name: 'dev-like', version: '0.3.0'}),
    readChangelog: async () =>
      `# dev-like\n\n## 0.3.0\n\n### Minor Changes\n\n- abc123: Did a thing.\n\n## 0.2.0\n\n### Minor Changes\n\n- def456: Older thing.\n`,
    getRefSha: async () => ({sha: 'commit-sha-abc', type: 'commit'}),
    getTagObject: async (sha) => ({sha, type: 'commit'}),
    getRelease: async () => null,
    createRef: async () => {},
    patchRelease: async () => {},
    createRelease: async () => {},
    ...overrides,
  }
}

describe('extractChangelogSection', () => {
  test('extracts the exact version section', () => {
    const changelog = `# dev-like\n\n## 0.3.0\n\n### Minor Changes\n\n- abc123: Did a thing.\n\n## 0.2.0\n\n### Minor Changes\n\n- def456: Older thing.\n`
    const section = extractChangelogSection(changelog, '0.3.0')
    expect(section).toContain('Did a thing.')
    expect(section).not.toContain('Older thing.')
    expect(section).not.toContain('## 0.2.0')
  })

  test('throws when the version section is missing', () => {
    const changelog = `# dev-like\n\n## 0.2.0\n\n- def456: Older thing.\n`
    expect(() => extractChangelogSection(changelog, '9.9.9')).toThrow()
  })
})

describe('malformed package.json', () => {
  test('rejects a package missing name or version', async () => {
    const deps = makeDeps({
      readPackageJson: async () => JSON.parse('{"name":"dev-like"}'),
    })
    await expect(reconcileAlias(deps)).rejects.toThrow()
  })
})

describe('isNotFound strict classification', () => {
  test('accepts actual gh HTTP 404 markers', () => {
    expect(isNotFound({code: 1, stdout: '', stderr: 'gh: Not Found (HTTP 404)'})).toBe(true)
    expect(isNotFound({code: 1, stdout: '', stderr: 'HTTP 404: Not Found'})).toBe(true)
  })

  test('rejects generic "Not Found" text without an HTTP 404 marker', () => {
    expect(isNotFound({code: 1, stdout: '', stderr: 'Not Found'})).toBe(false)
    expect(isNotFound({code: 1, stdout: '', stderr: 'gh: some resource Not Found elsewhere'})).toBe(false)
  })

  test('zero exit code is never a 404 regardless of text', () => {
    expect(isNotFound({code: 0, stdout: 'HTTP 404', stderr: ''})).toBe(false)
  })
})

describe('parsePackageInfo', () => {
  test('accepts a well-formed object', () => {
    expect(parsePackageInfo({name: 'dev-like', version: '0.3.0'})).toEqual({name: 'dev-like', version: '0.3.0'})
  })

  test('rejects non-string name', () => {
    expect(() => parsePackageInfo({name: 123, version: '0.3.0'})).toThrow()
  })

  test('rejects empty string version', () => {
    expect(() => parsePackageInfo({name: 'dev-like', version: ''})).toThrow()
  })

  test('rejects null', () => {
    expect(() => parsePackageInfo(null)).toThrow()
  })

  test('rejects an array', () => {
    expect(() => parsePackageInfo(['dev-like', '0.3.0'])).toThrow()
  })

  test('rejects missing fields', () => {
    expect(() => parsePackageInfo({})).toThrow()
  })
})

describe('parseRefInfo', () => {
  test('accepts commit and tag types', () => {
    expect(parseRefInfo('sha1', 'commit')).toEqual({sha: 'sha1', type: 'commit'})
    expect(parseRefInfo('sha2', 'tag')).toEqual({sha: 'sha2', type: 'tag'})
  })

  test('rejects empty sha', () => {
    expect(() => parseRefInfo('', 'commit')).toThrow()
  })

  test('rejects unknown type', () => {
    expect(() => parseRefInfo('sha1', 'blob')).toThrow()
  })

  test('rejects undefined sha/type', () => {
    expect(() => parseRefInfo(undefined, undefined)).toThrow()
  })
})

describe('parseReleaseInfo', () => {
  test('accepts a positive finite integer id and non-empty tag_name', () => {
    expect(parseReleaseInfo('42', 'v0.3.0')).toEqual({id: 42, tag_name: 'v0.3.0'})
  })

  test('rejects non-numeric id', () => {
    expect(() => parseReleaseInfo('abc', 'v0.3.0')).toThrow()
  })

  test('rejects zero/negative id', () => {
    expect(() => parseReleaseInfo('0', 'v0.3.0')).toThrow()
    expect(() => parseReleaseInfo('-1', 'v0.3.0')).toThrow()
  })

  test('rejects non-finite id', () => {
    expect(() => parseReleaseInfo('Infinity', 'v0.3.0')).toThrow()
  })

  test('rejects empty tag_name', () => {
    expect(() => parseReleaseInfo('42', '')).toThrow()
  })
})

describe('resolveTagToCommit', () => {
  test('resolves an annotated tag object to the underlying commit', async () => {
    const getTagObject = async (sha: string): Promise<RefInfo> =>
      sha === 'tag-object-sha' ? {sha: 'commit-sha-final', type: 'commit'} : {sha: 'unexpected', type: 'commit'}
    const result = await resolveTagToCommit({sha: 'tag-object-sha', type: 'tag'}, getTagObject)
    expect(result).toBe('commit-sha-final')
  })

  test('returns the sha directly when already a commit', async () => {
    const result = await resolveTagToCommit({sha: 'commit-sha', type: 'commit'}, async () => {
      throw new Error('should not be called')
    })
    expect(result).toBe('commit-sha')
  })
})

describe('reconcileAlias', () => {
  test('canonical ref 404 is a clean no-op with zero mutation', async () => {
    let createRefCalled = false
    let patchCalled = false
    let createReleaseCalled = false
    const deps = makeDeps({
      getRefSha: async () => null,
      createRef: async () => {
        createRefCalled = true
      },
      patchRelease: async () => {
        patchCalled = true
      },
      createRelease: async () => {
        createReleaseCalled = true
      },
    })
    await reconcileAlias(deps)
    expect(createRefCalled).toBe(false)
    expect(patchCalled).toBe(false)
    expect(createReleaseCalled).toBe(false)
  })

  test('non-404 canonical lookup error throws', async () => {
    const deps = makeDeps({
      getRefSha: async () => {
        throw new Error('rate limited')
      },
    })
    await expect(reconcileAlias(deps)).rejects.toThrow(/rate limited/)
  })

  test('happy path: missing alias ref creates it at canonical commit, then patches the canonical release to alias', async () => {
    const calls: string[] = []
    let createdRefTag: string | undefined
    let createdRefSha: string | undefined
    let patchedId: number | undefined
    let patchedFields: {tag_name: string; name: string} | undefined

    const deps = makeDeps({
      getRefSha: async (tag: string) => {
        calls.push(`getRefSha:${tag}`)
        if (tag === 'dev-like@0.3.0') return {sha: 'commit-sha-abc', type: 'commit'}
        return null // alias ref absent
      },
      createRef: async (tag: string, sha: string) => {
        calls.push(`createRef:${tag}`)
        createdRefTag = tag
        createdRefSha = sha
      },
      getRelease: async (tag: string) => {
        calls.push(`getRelease:${tag}`)
        if (tag === 'dev-like@0.3.0') return {id: 42, tag_name: 'dev-like@0.3.0'}
        return null
      },
      patchRelease: async (id: number, fields: {tag_name: string; name: string}) => {
        calls.push(`patchRelease:${id}`)
        patchedId = id
        patchedFields = fields
      },
    })

    await reconcileAlias(deps)

    expect(createdRefTag).toBe('v0.3.0')
    expect(createdRefSha).toBe('commit-sha-abc')
    expect(patchedId).toBe(42)
    expect(patchedFields).toEqual({tag_name: 'v0.3.0', name: 'v0.3.0'})
    // both git tags remain: canonical ref check happened, alias ref created — never deleted
    expect(calls).toContain('createRef:v0.3.0')
    expect(calls.filter((c) => c.startsWith('createRef:')).length).toBe(1)
  })

  test('existing alias ref/release at same commit is idempotent no-op', async () => {
    let mutated = false
    const deps = makeDeps({
      getRefSha: async (tag: string) => ({sha: 'commit-sha-abc', type: 'commit'}),
      getRelease: async (tag: string) => {
        if (tag === 'v0.3.0') return {id: 99, tag_name: 'v0.3.0'}
        return null
      },
      createRef: async () => {
        mutated = true
      },
      patchRelease: async () => {
        mutated = true
      },
      createRelease: async () => {
        mutated = true
      },
    })
    await reconcileAlias(deps)
    expect(mutated).toBe(false)
  })

  test('conflicting alias commit fails before any release mutation', async () => {
    let mutated = false
    const deps = makeDeps({
      getRefSha: async (tag: string) => {
        if (tag === 'dev-like@0.3.0') return {sha: 'commit-sha-abc', type: 'commit'}
        return {sha: 'commit-sha-DIFFERENT', type: 'commit'} // alias points elsewhere
      },
      patchRelease: async () => {
        mutated = true
      },
      createRelease: async () => {
        mutated = true
      },
    })
    await expect(reconcileAlias(deps)).rejects.toThrow()
    expect(mutated).toBe(false)
  })

  test('canonical tag exists but release missing creates exactly one alias release with changelog notes', async () => {
    let createReleaseArgs: {tag: string; sha: string; notes: string} | undefined
    let createReleaseCalls = 0
    const deps = makeDeps({
      getRefSha: async (tag: string) => {
        if (tag === 'dev-like@0.3.0') return {sha: 'commit-sha-abc', type: 'commit'}
        return null
      },
      getRelease: async () => null, // neither canonical nor alias release exists
      createRelease: async (tag: string, sha: string, notes: string) => {
        createReleaseCalls++
        createReleaseArgs = {tag, sha, notes}
      },
    })
    await reconcileAlias(deps)
    expect(createReleaseCalls).toBe(1)
    expect(createReleaseArgs?.tag).toBe('v0.3.0')
    expect(createReleaseArgs?.sha).toBe('commit-sha-abc')
    expect(createReleaseArgs?.notes).toContain('Did a thing.')
  })

  test('duplicate canonical release alongside an already-correct alias release fails', async () => {
    const deps = makeDeps({
      getRefSha: async () => ({sha: 'commit-sha-abc', type: 'commit'}),
      getRelease: async (tag: string) => {
        if (tag === 'dev-like@0.3.0') return {id: 1, tag_name: 'dev-like@0.3.0'}
        if (tag === 'v0.3.0') return {id: 2, tag_name: 'v0.3.0'}
        return null
      },
    })
    await expect(reconcileAlias(deps)).rejects.toThrow()
  })

  test('alias ref create race is accepted only after refetch proves same commit', async () => {
    let refetchCount = 0
    const deps = makeDeps({
      getRefSha: async (tag: string) => {
        if (tag === 'dev-like@0.3.0') return {sha: 'commit-sha-abc', type: 'commit'}
        refetchCount++
        if (refetchCount === 1) return null // first check: absent
        return {sha: 'commit-sha-abc', type: 'commit'} // refetch after race: same commit
      },
      createRef: async () => {
        throw new Error('422 Reference already exists')
      },
      getRelease: async (tag: string) => {
        if (tag === 'dev-like@0.3.0') return {id: 7, tag_name: 'dev-like@0.3.0'}
        return null
      },
    })
    await reconcileAlias(deps)
    expect(refetchCount).toBe(2)
  })

  test('alias ref create race followed by mismatched refetch commit fails', async () => {
    let refetchCount = 0
    const deps = makeDeps({
      getRefSha: async (tag: string) => {
        if (tag === 'dev-like@0.3.0') return {sha: 'commit-sha-abc', type: 'commit'}
        refetchCount++
        if (refetchCount === 1) return null
        return {sha: 'commit-sha-OTHER', type: 'commit'}
      },
      createRef: async () => {
        throw new Error('422 Reference already exists')
      },
    })
    await expect(reconcileAlias(deps)).rejects.toThrow()
  })

  test('generic nonzero "Not Found" without HTTP 404 marker throws rather than returning null', async () => {
    // getRefSha here is a deps-level fake standing in for a real classification failure;
    // the strict-404 behavior itself is exercised via the real adapter in the integration test.
    const deps = makeDeps({
      getRefSha: async (tag: string) => {
        if (tag === 'dev-like@0.3.0') {
          throw new Error('gh: Not Found (some unrelated error, not an HTTP 404)')
        }
        return null
      },
    })
    await expect(reconcileAlias(deps)).rejects.toThrow(/Not Found/)
  })

  test('command order: canonical ref before alias ref before release queries before mutation', async () => {
    const order: string[] = []
    const deps = makeDeps({
      getRefSha: async (tag: string) => {
        order.push(`ref:${tag}`)
        if (tag === 'dev-like@0.3.0') return {sha: 'commit-sha-abc', type: 'commit'}
        return null
      },
      createRef: async () => {
        order.push('createRef')
      },
      getRelease: async (tag: string) => {
        order.push(`release:${tag}`)
        return null
      },
      createRelease: async () => {
        order.push('createRelease')
      },
    })
    await reconcileAlias(deps)
    expect(order.indexOf('ref:dev-like@0.3.0')).toBeLessThan(order.indexOf('ref:v0.3.0'))
    expect(order.indexOf('ref:v0.3.0')).toBeLessThan(order.indexOf('createRef'))
    expect(order.indexOf('createRef')).toBeLessThan(order.indexOf('createRelease'))
  })
})

describe('real adapter integration (fake gh, no network)', () => {
  let tmpDir: string | undefined

  afterEach(() => {
    if (tmpDir) {
      rmSync(tmpDir, {recursive: true, force: true})
      tmpDir = undefined
    }
  })

  test('exercises the real command adapter path against a fake gh: exits 0, correct argv, no npm, correct ordering/PATCH', async () => {
    const realPkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {name: string; version: string}
    const canonicalTag = `${realPkg.name}@${realPkg.version}`
    const aliasTag = `v${realPkg.version}`
    const canonicalCommit = 'fixture-commit-sha-0123456789'

    tmpDir = mkdtempSync(join(tmpdir(), 'alias-release-it-'))
    const logPath = join(tmpDir, 'gh-argv.log')
    const ghPath = join(tmpDir, 'gh')

    // Deterministic fake `gh` that logs argv and returns fixture JSON matching the real
    // package version. Uses only case/echo/exit — no network, no real gh.
    const fakeGh = `#!/bin/sh
echo "$@" >> "${logPath}"
args="$*"
if echo "$args" | grep -q "git/ref/tags/${canonicalTag}"; then
  echo "${canonicalCommit}"
  echo "commit"
  exit 0
fi
if echo "$args" | grep -q "git/ref/tags/${aliasTag}"; then
  echo "not found (HTTP 404)" >&2
  exit 1
fi
if echo "$args" | grep -q "git/refs" && echo "$args" | grep -q "POST"; then
  exit 0
fi
if echo "$args" | grep -q "releases/tags/${canonicalTag}"; then
  echo "99"
  echo "${canonicalTag}"
  exit 0
fi
if echo "$args" | grep -q "releases/tags/${aliasTag}"; then
  echo "not found (HTTP 404)" >&2
  exit 1
fi
if echo "$args" | grep -q "releases/99" && echo "$args" | grep -q "PATCH"; then
  exit 0
fi
echo "unhandled fake gh invocation: $args" >&2
exit 1
`
    writeFileSync(ghPath, fakeGh, {mode: 0o755})
    chmodSync(ghPath, 0o755)

    const proc = Bun.spawn(['bun', 'run', join(ROOT, '.github/scripts/alias-release.ts')], {
      cwd: ROOT,
      env: {
        ...process.env,
        PATH: `${tmpDir}:${process.env.PATH ?? ''}`,
        GITHUB_REPOSITORY: 'marcusrbrown/dev-like',
      },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ])

    expect(exitCode).toBe(0)
    if (exitCode !== 0) {
      throw new Error(`alias-release.ts failed: stdout=${stdout} stderr=${stderr}`)
    }

    const log = readFileSync(logPath, 'utf8')
    const invocations = log.trim().split('\n')

    // Every invocation went through `gh api`, no shell.
    for (const line of invocations) {
      expect(line.startsWith('api ')).toBe(true)
    }
    expect(log).not.toMatch(/\bnpm\b/)

    const canonicalRefIdx = invocations.findIndex((l) => l.includes(`git/ref/tags/${canonicalTag}`))
    const aliasRefGetIdx = invocations.findIndex((l) => l.includes(`git/ref/tags/${aliasTag}`))
    const createRefIdx = invocations.findIndex((l) => l.includes('git/refs') && l.includes('POST'))
    const patchIdx = invocations.findIndex((l) => l.includes('releases/99') && l.includes('PATCH'))

    expect(canonicalRefIdx).toBeGreaterThanOrEqual(0)
    expect(aliasRefGetIdx).toBeGreaterThan(canonicalRefIdx)
    expect(createRefIdx).toBeGreaterThan(aliasRefGetIdx)
    expect(patchIdx).toBeGreaterThan(createRefIdx)

    // Alias ref created at the resolved canonical commit.
    const createRefLine = invocations[createRefIdx] ?? ''
    expect(createRefLine).toContain(`sha=${canonicalCommit}`)

    // PATCH retargets tag_name/name to vX.Y.Z.
    const patchLine = invocations[patchIdx] ?? ''
    expect(patchLine).toContain(`tag_name=${aliasTag}`)
    expect(patchLine).toContain(`name=${aliasTag}`)
  })
})
