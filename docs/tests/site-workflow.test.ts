import { describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..', '..')
const WORKFLOW_PATH = path.join(REPO_ROOT, '.github', 'workflows', 'site.yaml')
const STUB_PATH = path.join(REPO_ROOT, 'docs', 'site-stub', 'index.html')

const CHECKOUT_SHA = 'df4cb1c069e1874edd31b4311f1884172cec0e10'
const SETUP_BUN_SHA = '0c5077e51419868618aeaa5fe8019c62421857d6'
const UPLOAD_PAGES_ARTIFACT_SHA = '7b1f4a764d45c48632c6b24a0339c27f5614fb0b'
const DEPLOY_PAGES_SHA = 'd6db90164ac5ed86f2b6aed7e0febac5b3c0c03e'

async function readWorkflow(): Promise<string> {
  return readFile(WORKFLOW_PATH, 'utf8')
}

describe('site.yaml workflow contract', () => {
  test('push-to-main paths include docs/**, registry/**, and the workflow file, plus workflow_dispatch', async () => {
    const text = await readWorkflow()
    expect(text).toContain('workflow_dispatch:')
    expect(text).toMatch(/branches:\s*\[main\]/)
    expect(text).toContain('docs/**')
    expect(text).toContain('registry/**')
    expect(text).toContain('.github/workflows/site.yaml')
  })

  test('all actions are pinned to the expected commit SHAs with version comments', async () => {
    const text = await readWorkflow()
    expect(text).toMatch(new RegExp(`actions/checkout@${CHECKOUT_SHA}\\s*#\\s*v\\d`))
    expect(text).toMatch(new RegExp(`oven-sh/setup-bun@${SETUP_BUN_SHA}\\s*#\\s*v\\d`))
    expect(text).toMatch(new RegExp(`actions/upload-pages-artifact@${UPLOAD_PAGES_ARTIFACT_SHA}\\s*#\\s*v4\\.0\\.0`))
    expect(text).toMatch(new RegExp(`actions/deploy-pages@${DEPLOY_PAGES_SHA}\\s*#\\s*v4\\.0\\.5`))
  })

  test('build job installs frozen with --ignore-scripts and runs validate, docs test, docs build in fail-fast order before upload', async () => {
    const text = await readWorkflow()
    const buildJobMatch = text.match(/build:\n([\s\S]*?)\n {2}deploy:/)
    expect(buildJobMatch, text).toBeDefined()
    const buildJob = buildJobMatch![1]!

    expect(buildJob).toContain('bun install --frozen-lockfile --ignore-scripts')

    const validateIdx = buildJob.indexOf('bun run validate')
    const docsTestIdx = buildJob.indexOf('bun run --cwd docs test')
    const docsBuildIdx = buildJob.indexOf('bun run --cwd docs build')
    const uploadIdx = buildJob.indexOf('upload-pages-artifact')

    expect(validateIdx).toBeGreaterThan(-1)
    expect(docsTestIdx).toBeGreaterThan(-1)
    expect(docsBuildIdx).toBeGreaterThan(-1)
    expect(uploadIdx).toBeGreaterThan(-1)
    expect(validateIdx).toBeLessThan(docsTestIdx)
    expect(docsTestIdx).toBeLessThan(docsBuildIdx)
    expect(docsBuildIdx).toBeLessThan(uploadIdx)
    expect(buildJob).toContain('docs/dist')
  })

  test('deploy job needs build, and only deploy gets pages/id-token write and the github-pages environment', async () => {
    const text = await readWorkflow()
    const deployJobMatch = text.match(/\n {2}deploy:\n([\s\S]*)$/)
    expect(deployJobMatch, text).toBeDefined()
    const deployJob = deployJobMatch![1]!

    expect(deployJob).toMatch(/needs:\s*build/)
    expect(deployJob).toContain('pages: write')
    expect(deployJob).toContain('id-token: write')
    expect(deployJob).toMatch(/environment:\s*\n\s*name:\s*github-pages/)
    expect(deployJob).toContain('deploy-pages')

    const buildJobMatch = text.match(/build:\n([\s\S]*?)\n {2}deploy:/)
    const buildJob = buildJobMatch![1]!
    expect(buildJob).not.toContain('pages: write')
    expect(buildJob).not.toContain('id-token: write')
  })

  test('global permissions are contents: read', async () => {
    const text = await readWorkflow()
    const topPermsMatch = text.match(/^permissions:\n\s*contents:\s*read\s*$/m)
    expect(topPermsMatch, text).toBeDefined()
  })

  test('concurrency serializes Pages deploys to avoid stale overlap', async () => {
    const text = await readWorkflow()
    expect(text).toMatch(/concurrency:/)
    expect(text).toMatch(/group:\s*["']?pages["']?|group:\s*\$\{\{\s*github\.workflow\s*\}\}/)
    expect(text).toMatch(/cancel-in-progress:\s*false/)
  })

  test('no site-stub references remain and the stub file is absent', async () => {
    const text = await readWorkflow()
    expect(text).not.toContain('site-stub')
    expect(existsSync(STUB_PATH)).toBe(false)
  })

  test('the Build docs site step passes UMAMI_WEBSITE_ID via its own env mapping, not workflow/job scope', async () => {
    const text = await readWorkflow()
    const stepMatch = text.match(/- name: Build docs site\n([\s\S]*?)(?:\n\n|\n {6}- name:)/)
    expect(stepMatch, text).toBeDefined()
    const step = stepMatch![1]!
    expect(step).toContain('run: bun run --cwd docs build')
    expect(step).toMatch(/env:\s*\n\s*UMAMI_WEBSITE_ID:\s*\$\{\{\s*vars\.UMAMI_WEBSITE_ID\s*\}\}/)

    // Must not be hoisted to workflow-level or job-level env (would make it non-optional
    // in scope and defeat the docs tests that verify analytics-off behavior).
    const beforeJobs = text.slice(0, text.indexOf('\njobs:'))
    expect(beforeJobs).not.toContain('UMAMI_WEBSITE_ID')
    const buildJobMatch = text.match(/build:\n([\s\S]*?)\n {2}deploy:/)
    const buildJobHeader = buildJobMatch![1]!.slice(0, buildJobMatch![1]!.indexOf('steps:'))
    expect(buildJobHeader).not.toContain('UMAMI_WEBSITE_ID')
  })

  test('release workflow remains untouched', async () => {
    const releaseText = await readFile(path.join(REPO_ROOT, '.github', 'workflows', 'release.yaml'), 'utf8')
    expect(releaseText).toContain('name: Release')
  })
})
