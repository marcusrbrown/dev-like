#!/usr/bin/env node
// dev-like CLI — thin, deterministic plumbing. The agent skill does the smart work.
//
// Resolve + install from the registry. No telemetry, no postinstall, no network
// beyond raw.githubusercontent.com.

import { parseArgs } from 'node:util';
import { readFile, mkdir, writeFile, readdir, lstat, stat, symlink, realpath, rm, cp } from 'node:fs/promises';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAW = 'https://raw.githubusercontent.com/marcusrbrown/dev-like/main';
const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const HELP = `dev-like — develop like the shops you admire, with receipts.

Usage:
  npx dev-like <target> [--dry-run] [--force] [--dir <projectRoot>] [--registry <dir>]
                                  Install develop-like-<target> from the registry
  npx dev-like list              List registry entries
  npx dev-like validate          Validate local registry + skill (contributors/CI)
  npx dev-like --help

Options:
  --dry-run           Show the install plan without writing anything
  --force             Overwrite an installed skill that has drifted from the registry
  --dir <path>        Project root to install into (default: cwd)
  --registry <path>   Use a local registry directory instead of the packaged/remote one

Uncached targets: run /dev-like <target> in your agent instead — live profiling
needs an LLM. This CLI only installs cached profiles.`;

async function fetchJson(path) {
  const res = await fetch(`${RAW}/${path}`);
  if (!res.ok) throw new Error(`fetch ${path}: ${res.status}`);
  return res.json();
}

async function fetchText(path) {
  const res = await fetch(`${RAW}/${path}`);
  if (!res.ok) throw new Error(`fetch ${path}: ${res.status}`);
  return res.text();
}

function resolve(index, query) {
  const q = query.toLowerCase().trim();
  for (const [slug, e] of Object.entries(index.entries)) {
    if (slug === q || e.name.toLowerCase() === q || (e.aliases ?? []).includes(q)) return slug;
  }
  return null;
}

async function pathExists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function readLocalIndex(registryRoot) {
  try {
    return JSON.parse(await readFile(join(registryRoot, 'index.json'), 'utf8'));
  } catch {
    return null;
  }
}

// Read a directory tree recursively into a map of relPath -> Buffer content.
async function readTree(dir) {
  const out = {};
  async function rec(base, rel) {
    const entries = await readdir(base, { withFileTypes: true });
    for (const e of entries) {
      const relPath = rel ? join(rel, e.name) : e.name;
      const full = join(base, e.name);
      if (e.isDirectory()) await rec(full, relPath);
      else out[relPath] = await readFile(full);
    }
  }
  await rec(dir, '');
  return out;
}

const REMOTE_SKILL_FILES = (slug) => [
  'SKILL.md',
  join('references', 'stack.md'),
  join('references', 'workflow.md'),
  join('references', 'sources.md'),
  join('agents', `${slug}-developer.md`),
];

// Resolve which files to install for `slug`, and where the registry/data came from.
// Returns { files: { relPath: Buffer } }.
async function loadSkillFiles({ slug, registryRoot, remote }) {
  if (remote) {
    const files = {};
    for (const rel of REMOTE_SKILL_FILES(slug)) {
      const text = await fetchText(`registry/${slug}/skill/develop-like-${slug}/${rel}`);
      files[rel] = Buffer.from(text, 'utf8');
    }
    return files;
  }

  const prebuiltDir = join(registryRoot, slug, 'skill', `develop-like-${slug}`);
  if (await pathExists(prebuiltDir)) {
    return readTree(prebuiltDir);
  }

  // Fall back to in-memory generation from profile.md + entry.json.
  const { renderSkill } = await import('../scripts/generate-skill.mjs');
  const rendered = await renderSkill(slug, registryRoot);
  const files = {};
  for (const [rel, content] of Object.entries(rendered)) {
    files[rel] = Buffer.from(content, 'utf8');
  }
  return files;
}

function toPosix(relPath) {
  return relPath.split(sep).join('/');
}

// Compare the on-disk target dir against the desired file set.
// Returns { status: 'missing' | 'match' | 'drift', differing: string[] }.
async function diffInstalled(targetDir, files) {
  if (!(await pathExists(targetDir))) return { status: 'missing', differing: [] };

  const differing = [];
  for (const [rel, content] of Object.entries(files)) {
    const full = join(targetDir, rel);
    let existing;
    try {
      existing = await readFile(full);
    } catch {
      differing.push(toPosix(rel));
      continue;
    }
    if (!existing.equals(content)) differing.push(toPosix(rel));
  }
  return { status: differing.length ? 'drift' : 'match', differing };
}

async function writeFiles(targetDir, files) {
  for (const [rel, content] of Object.entries(files)) {
    const full = join(targetDir, rel);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, content);
    console.log(`write ${toPosix(relative(process.cwd(), full))}`);
  }
}

async function ensureClaudeLink(projectRoot, dirName, dryRun) {
  const claudeDir = join(projectRoot, '.claude');
  if (!(await pathExists(claudeDir))) return;

  const linkPath = join(claudeDir, 'skills', dirName);
  const targetPath = join(projectRoot, '.agents', 'skills', dirName);
  const relTarget = relative(dirname(linkPath), targetPath);

  if (await pathExists(linkPath)) {
    try {
      const lst = await lstat(linkPath);
      if (lst.isSymbolicLink()) {
        const real = await realpath(linkPath).catch(() => null);
        const expectedReal = await realpath(targetPath).catch(() => null);
        if (real && expectedReal && real === expectedReal) return; // already correct
      }
    } catch {
      // fall through to recreate
    }
  }

  const relLabel = toPosix(join('.claude', 'skills', dirName));
  const relTargetLabel = toPosix(relTarget);

  if (dryRun) {
    console.log(`symlink ${relLabel} -> ${relTargetLabel}`);
    return;
  }

  await mkdir(dirname(linkPath), { recursive: true });
  await rm(linkPath, { recursive: true, force: true });
  try {
    await symlink(relTarget, linkPath, 'dir');
    console.log(`symlink ${relLabel} -> ${relTargetLabel}`);
  } catch {
    await cp(targetPath, linkPath, { recursive: true });
    console.log(`copy ${relLabel} <- ${toPosix(relative(process.cwd(), targetPath))}`);
  }
}

async function install({ slug, registryRoot, remote, projectRoot, dryRun, force }) {
  const files = await loadSkillFiles({ slug, registryRoot, remote });
  const dirName = `develop-like-${slug}`;
  const targetDir = join(projectRoot, '.agents', 'skills', dirName);

  const { status, differing } = await diffInstalled(targetDir, files);

  if (status === 'match') {
    if (dryRun) {
      console.log(`${dirName} already installed (up to date) — no changes planned`);
    } else {
      console.log(`${dirName} already installed (up to date)`);
    }
    await ensureClaudeLink(projectRoot, dirName, dryRun);
    printNextSteps(slug);
    return 0;
  }

  if (status === 'drift' && !force) {
    const label = dryRun ? 'would refuse' : 'refusing to overwrite';
    console.error(`${dirName} is installed but differs from the registry (${label} without --force):`);
    for (const rel of differing) console.error(`  ${rel}`);
    if (!dryRun) return 1;
    // dry-run still prints the plan then exits 0 as spec'd, but we must not proceed to write.
    return 0;
  }

  if (dryRun) {
    for (const rel of Object.keys(files)) {
      console.log(`write ${toPosix(join('.agents', 'skills', dirName, rel))}`);
    }
    await ensureClaudeLink(projectRoot, dirName, true);
    printNextSteps(slug);
    return 0;
  }

  await writeFiles(targetDir, files);
  await ensureClaudeLink(projectRoot, dirName, false);
  printNextSteps(slug);
  return 0;
}

function printNextSteps(slug) {
  console.log(`Done. Invoke /develop-like-${slug} or let it trigger implicitly in your agent.`);
}

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      help: { type: 'boolean', short: 'h' },
      'dry-run': { type: 'boolean' },
      force: { type: 'boolean' },
      dir: { type: 'string' },
      registry: { type: 'string' },
    },
  });
  if (values.help || positionals.length === 0) return console.log(HELP);

  const [cmd] = positionals;

  if (cmd === 'list') {
    const index = values.registry
      ? await readLocalIndex(values.registry)
      : await fetchJson('registry/index.json');
    for (const [slug, e] of Object.entries(index.entries)) {
      console.log(`${slug.padEnd(16)} ${e.kind.padEnd(7)} ${e.consentTier.padEnd(15)} ${e.name}`);
    }
    return;
  }

  if (cmd === 'validate') {
    const { validate } = await import('../scripts/validate.mjs');
    process.exitCode = (await validate()) ? 0 : 1;
    return;
  }

  const projectRoot = values.dir ? values.dir : process.cwd();
  const dryRun = Boolean(values['dry-run']);
  const force = Boolean(values.force);

  let registryRoot = values.registry ? values.registry : join(PKG_ROOT, 'registry');
  let remote = false;
  let index = await readLocalIndex(registryRoot);
  let slug = index ? resolve(index, cmd) : null;

  if (!slug && !values.registry) {
    // Local miss without an explicit --registry override: try the remote index.
    try {
      index = await fetchJson('registry/index.json');
      slug = resolve(index, cmd);
      if (slug) remote = true;
    } catch {
      // network unavailable or fetch failed — fall through to the not-found error.
    }
  }

  if (!slug) {
    console.error(`'${cmd}' is not in the registry. Run /dev-like ${cmd} in your agent to profile it live.`);
    process.exitCode = 1;
    return;
  }

  process.exitCode = await install({ slug, registryRoot, remote, projectRoot, dryRun, force });
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
