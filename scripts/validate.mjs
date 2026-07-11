#!/usr/bin/env node
// Deterministic repo validation: skill frontmatter, registry entries, index sync,
// provenance (every profile claim-link resolves to a sources[] URL is v0.2; here: presence).
// Zero deps by design — this doubles as the contributor pre-PR check and the CI gate.

import { readFile, readdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TIERS = ['self-published', 'stated', 'observed', 'social'];
const PERSON_TIERS = ['self-published', 'stated'];
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

let failures = 0;
const fail = (msg) => { failures++; console.error(`FAIL ${msg}`); };
const ok = (msg) => console.log(`  ok ${msg}`);

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  // Minimal YAML subset: top-level scalar keys only (enough for name/description checks).
  const fm = {};
  let currentKey = null;
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([A-Za-z-]+):\s*(.*)$/);
    if (kv) {
      currentKey = kv[1];
      fm[currentKey] = kv[2].replace(/^>-?\s*$/, '');
    } else if (currentKey && /^\s+\S/.test(line)) {
      fm[currentKey] = ((fm[currentKey] ?? '') + ' ' + line.trim()).trim();
    }
  }
  return fm;
}

async function validateSkills() {
  const skillsDir = join(ROOT, 'skills');
  for (const name of await readdir(skillsDir)) {
    const dir = join(skillsDir, name);
    if (!(await stat(dir)).isDirectory()) continue;
    const path = join(dir, 'SKILL.md');
    const text = await readFile(path, 'utf8').catch(() => null);
    if (text === null) { fail(`${name}: missing SKILL.md`); continue; }
    const fm = parseFrontmatter(text);
    if (!fm) { fail(`${name}: no YAML frontmatter`); continue; }
    if (fm.name !== name) fail(`${name}: frontmatter name '${fm.name}' != directory name`);
    if (!fm.description || fm.description.length < 20) fail(`${name}: description missing/too short`);
    if (fm.description && fm.description.length > 1024) fail(`${name}: description > 1024 chars`);
    if (!SLUG_RE.test(fm.name ?? '')) fail(`${name}: name violates spec pattern`);
    const body = text.replace(/^---\n[\s\S]*?\n---/, '');
    if (body.split('\n').length > 500) fail(`${name}: SKILL.md > 500 lines (spec guidance)`);
    ok(`skill ${name}`);
  }
}

async function validateRegistry() {
  const regDir = join(ROOT, 'registry');
  const index = JSON.parse(await readFile(join(regDir, 'index.json'), 'utf8'));
  const dirs = [];
  for (const name of await readdir(regDir)) {
    const p = join(regDir, name);
    if ((await stat(p)).isDirectory() && name !== 'schema') dirs.push(name);
  }

  for (const slug of dirs) {
    const entryPath = join(regDir, slug, 'entry.json');
    const entry = JSON.parse(await readFile(entryPath, 'utf8').catch(() => 'null'));
    if (!entry) { fail(`${slug}: missing entry.json`); continue; }

    if (entry.slug !== slug) fail(`${slug}: entry.slug mismatch`);
    if (!SLUG_RE.test(slug)) fail(`${slug}: invalid slug`);
    if (!['org', 'person'].includes(entry.kind)) fail(`${slug}: bad kind`);
    if (!TIERS.includes(entry.consentTier)) fail(`${slug}: bad consentTier`);
    if (entry.kind === 'person' && !PERSON_TIERS.includes(entry.consentTier))
      fail(`${slug}: persons require consentTier stated or better`);
    if (!DATE_RE.test(entry.updated ?? '')) fail(`${slug}: bad updated date`);
    if (!Array.isArray(entry.sources) || entry.sources.length === 0)
      fail(`${slug}: sources[] required`);
    for (const s of entry.sources ?? []) {
      if (!s.url?.startsWith('http')) fail(`${slug}: bad source url ${s.url}`);
      if (!DATE_RE.test(s.fetched ?? '')) fail(`${slug}: source missing fetched date`);
      if (!TIERS.includes(s.tier)) fail(`${slug}: bad source tier`);
    }

    const profile = await readFile(join(regDir, slug, 'profile.md'), 'utf8').catch(() => null);
    if (!profile) fail(`${slug}: missing profile.md`);
    else if (!/\[\[?.+?\]?\]\(https?:\/\//.test(profile)) fail(`${slug}: profile.md has no source links`);

    if (!index.entries[slug]) fail(`${slug}: not in index.json`);
    else {
      const ie = index.entries[slug];
      if (ie.consentTier !== entry.consentTier) fail(`${slug}: index/entry consentTier drift`);
      if (ie.updated !== entry.updated) fail(`${slug}: index/entry updated drift`);
    }
    ok(`registry ${slug}`);
  }

  for (const slug of Object.keys(index.entries)) {
    if (!dirs.includes(slug)) fail(`index.json references missing dir registry/${slug}/`);
  }
}

export async function validate() {
  await validateSkills();
  await validateRegistry();
  if (failures) console.error(`\n${failures} failure(s)`);
  else console.log('\nAll checks passed.');
  return failures === 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  validate().then((passed) => { process.exitCode = passed ? 0 : 1; });
}
