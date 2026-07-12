#!/usr/bin/env node
// Deterministic skill generator: registry/<slug>/{profile.md,entry.json} + assets templates
// -> develop-like-<slug>/ skill tree. Zero deps by design (mirrors scripts/validate.mjs).
//
// Usage: node scripts/generate-skill.mjs <slug> [--out <dir>] [--check] [--registry <dir>]

import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'skills', 'dev-like', 'assets');
const REQUIRED_SECTIONS = ['Core principle', 'Workflow shape', 'Stack', 'Principles (cited)', 'Tensions'];

function parseArgs(argv) {
  const args = { slug: null, out: null, check: false, registry: null };
  const rest = [...argv];
  while (rest.length) {
    const tok = rest.shift();
    if (tok === '--out') args.out = rest.shift();
    else if (tok === '--check') args.check = true;
    else if (tok === '--registry') args.registry = rest.shift();
    else if (!args.slug) args.slug = tok;
  }
  return args;
}

// Split profile.md on `## ` headings into a map of heading text -> trimmed body.
function parseSections(text) {
  const sections = {};
  const parts = text.split(/^## /m).slice(1); // drop content before first '## '
  for (const part of parts) {
    const nl = part.indexOf('\n');
    const heading = (nl === -1 ? part : part.slice(0, nl)).trim();
    const body = (nl === -1 ? '' : part.slice(nl + 1)).trim();
    sections[heading] = body;
  }
  return sections;
}

function render(template, vars) {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{{${key}}}`).join(value);
  }
  return out;
}

function withTrailingNewline(text) {
  return text.replace(/\n*$/, '\n');
}

function renderSourcesRows(sources) {
  return sources
    .map((s) => {
      const note = s.note ? `, ${s.note}` : '';
      return `- ${s.url} — fetched ${s.fetched} · tier: ${s.tier}${note}`;
    })
    .join('\n');
}

async function loadTemplates() {
  const [skill, reference, sourcesTpl, persona] = await Promise.all([
    readFile(join(ASSETS, 'skill-template.md'), 'utf8'),
    readFile(join(ASSETS, 'reference-template.md'), 'utf8'),
    readFile(join(ASSETS, 'sources-template.md'), 'utf8'),
    readFile(join(ASSETS, 'persona-template.md'), 'utf8'),
  ]);
  return { skill, reference, sourcesTpl, persona };
}

// Build the in-memory file map for develop-like-<slug>/. Throws with a FAIL-prefixed
// message (caller decides how to report) if profile.md is missing a required section.
export async function renderSkill(slug, registryDir) {
  const entry = JSON.parse(await readFile(join(registryDir, slug, 'entry.json'), 'utf8'));
  const profileText = await readFile(join(registryDir, slug, 'profile.md'), 'utf8');
  const sections = parseSections(profileText);

  for (const name of REQUIRED_SECTIONS) {
    if (sections[name] === undefined) {
      const err = new Error(`FAIL ${slug}: profile.md missing section '${name}'`);
      err.isSectionError = true;
      throw err;
    }
  }

  const { skill, reference, sourcesTpl, persona } = await loadTemplates();

  const vars = {
    slug,
    name: entry.name,
    summary: entry.summary ?? '',
    kindLabel: entry.kind === 'person' ? 'the developer' : 'the company',
    profiled: entry.updated,
    consentTier: entry.consentTier,
    corePrinciple: sections['Core principle'],
    workflowShape: sections['Workflow shape'],
    principlesCited: sections['Principles (cited)'],
    tensions: sections['Tensions'],
  };

  const skillMd = withTrailingNewline(render(skill, vars));
  const stackMd = withTrailingNewline(
    render(reference, { title: 'Stack', name: vars.name, profiled: vars.profiled, consentTier: vars.consentTier, body: sections['Stack'] }),
  );
  const workflowMd = withTrailingNewline(
    render(reference, { title: 'Workflow', name: vars.name, profiled: vars.profiled, consentTier: vars.consentTier, body: sections['Workflow shape'] }),
  );
  const sourcesMd = withTrailingNewline(
    render(sourcesTpl, { name: vars.name, profiled: vars.profiled, consentTier: vars.consentTier, rows: renderSourcesRows(entry.sources ?? []) }),
  );
  const personaMd = withTrailingNewline(render(persona, { slug, name: vars.name }));

  return {
    'SKILL.md': skillMd,
    'references/stack.md': stackMd,
    'references/workflow.md': workflowMd,
    'references/sources.md': sourcesMd,
    [`agents/${slug}-developer.md`]: personaMd,
  };
}

async function writeFiles(baseDir, files) {
  for (const [rel, content] of Object.entries(files)) {
    const full = join(baseDir, rel);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, content, 'utf8');
  }
}

async function readCommitted(baseDir, files) {
  const out = {};
  for (const rel of Object.keys(files)) {
    out[rel] = await readFile(join(baseDir, rel), 'utf8').catch(() => null);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.slug) {
    console.error('Usage: node scripts/generate-skill.mjs <slug> [--out <dir>] [--check] [--registry <dir>]');
    process.exitCode = 1;
    return;
  }

  const registryDir = args.registry ? args.registry : join(ROOT, 'registry');
  const dirName = `develop-like-${args.slug}`;

  let files;
  try {
    files = await renderSkill(args.slug, registryDir);
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
    return;
  }

  if (args.check) {
    const committedBase = join(registryDir, args.slug, 'skill', dirName);
    const committed = await readCommitted(committedBase, files);
    const offending = [];
    for (const [rel, content] of Object.entries(files)) {
      if (committed[rel] === null) offending.push(`${rel} (missing)`);
      else if (committed[rel] !== content) offending.push(`${rel} (drift)`);
    }
    if (offending.length) {
      console.error(`FAIL ${args.slug}: generated output does not match committed skill:`);
      for (const o of offending) console.error(`  ${o}`);
      process.exitCode = 1;
      return;
    }
    console.log(`ok ${args.slug}: generated output matches committed skill`);
    return;
  }

  const outRoot = args.out ? args.out : join(registryDir, args.slug, 'skill');
  const baseDir = join(outRoot, dirName);
  await writeFiles(baseDir, files);
  console.log(`Wrote ${baseDir}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
