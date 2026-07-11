#!/usr/bin/env node
// dev-like CLI — thin, deterministic plumbing. The agent skill does the smart work.
//
// v0.1: resolve + install from the registry. No telemetry, no postinstall, no network
// beyond raw.githubusercontent.com. See DESIGN.md §3.4.

import { parseArgs } from 'node:util';

const RAW = 'https://raw.githubusercontent.com/marcusrbrown/dev-like/main';

const HELP = `dev-like — develop like the shops you admire, with receipts.

Usage:
  npx dev-like <target>          Install develop-like-<target> from the registry
  npx dev-like list              List registry entries
  npx dev-like validate          Validate local registry + skill (contributors/CI)
  npx dev-like --help

Uncached targets: run /dev-like <target> in your agent instead — live profiling
needs an LLM. This CLI only installs cached profiles.`;

async function fetchJson(path) {
  const res = await fetch(`${RAW}/${path}`);
  if (!res.ok) throw new Error(`fetch ${path}: ${res.status}`);
  return res.json();
}

function resolve(index, query) {
  const q = query.toLowerCase().trim();
  for (const [slug, e] of Object.entries(index.entries)) {
    if (slug === q || e.name.toLowerCase() === q || (e.aliases ?? []).includes(q)) return slug;
  }
  return null;
}

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { help: { type: 'boolean', short: 'h' } },
  });
  if (values.help || positionals.length === 0) return console.log(HELP);

  const [cmd] = positionals;

  if (cmd === 'list') {
    const index = await fetchJson('registry/index.json');
    for (const [slug, e] of Object.entries(index.entries)) {
      console.log(`${slug.padEnd(16)} ${e.kind.padEnd(7)} ${e.consentTier.padEnd(15)} ${e.name}`);
    }
    return;
  }

  if (cmd === 'validate') {
    const { validate } = await import('../scripts/validate.mjs');
    process.exitCode = await validate() ? 0 : 1;
    return;
  }

  // TODO(v0.2): install path — resolve alias, fetch registry/<slug>/skill/ or generate from
  // profile.md template, write to .agents/skills/, symlink .claude/skills/. See DESIGN.md.
  const index = await fetchJson('registry/index.json');
  const slug = resolve(index, cmd);
  if (!slug) {
    console.error(`'${cmd}' is not in the registry. Run /dev-like ${cmd} in your agent to profile it live.`);
    process.exitCode = 1;
    return;
  }
  console.log(`Resolved '${cmd}' -> ${slug} (${index.entries[slug].consentTier}, updated ${index.entries[slug].updated})`);
  console.log('Install path lands in v0.2 — for now: npx skills add marcusrbrown/dev-like');
}

main().catch((err) => { console.error(err.message); process.exitCode = 1; });
