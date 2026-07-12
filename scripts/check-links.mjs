#!/usr/bin/env node
// Provenance link-rot checker: every URL cited in registry/ must still resolve.
// Zero deps by design — mirrors validate.mjs conventions (plain node, exported fns for tests).

import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONCURRENCY = 4;
const STAGGER_MS = 250;
const TIMEOUT_MS = 15_000;
const MD_LINK_RE = /\]\((https:\/\/[^)\s]+)\)/g;

// Collect every URL cited from a registry entry.json/profile.md pair, tagged with citing file.
async function collectUrls() {
  const regDir = join(ROOT, 'registry');
  const found = new Map(); // url -> Set of citing file paths (relative to ROOT)

  const add = (url, file) => {
    if (!found.has(url)) found.set(url, new Set());
    found.get(url).add(file);
  };

  for (const name of await readdir(regDir)) {
    const dir = join(regDir, name);
    if (!(await stat(dir)).isDirectory() || name === 'schema') continue;

    const entryPath = join(dir, 'entry.json');
    const entryRel = `registry/${name}/entry.json`;
    const entryText = await readFile(entryPath, 'utf8').catch(() => null);
    if (entryText) {
      const entry = JSON.parse(entryText);
      if (entry.homepage) add(entry.homepage, entryRel);
      for (const s of entry.sources ?? []) {
        if (s.url) add(s.url, entryRel);
      }
    }

    const profilePath = join(dir, 'profile.md');
    const profileRel = `registry/${name}/profile.md`;
    const profileText = await readFile(profilePath, 'utf8').catch(() => null);
    if (profileText) {
      for (const m of profileText.matchAll(MD_LINK_RE)) {
        add(m[1], profileRel);
      }
    }
  }

  return found;
}

// Classify a check outcome into ok | warn | fail.
// Pass either an HTTP status or an Error (network/timeout).
export function classify(statusOrError) {
  if (statusOrError instanceof Error) return 'fail';
  const status = statusOrError;
  if (status >= 200 && status < 400) return 'ok';
  if (status === 403 || status === 429) return 'warn';
  return 'fail'; // 404/410/5xx/other 4xx
}

async function checkUrl(url) {
  const attempt = async (method) =>
    fetch(url, { method, redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS) });

  try {
    let res = await attempt('HEAD');
    if (res.status === 405 || res.status === 403) {
      res = await attempt('GET');
    }
    return { url, status: res.status, classification: classify(res.status) };
  } catch (err) {
    return { url, error: err.message, classification: classify(err) };
  }
}

// Run checks with bounded concurrency and a stagger between dispatches.
async function checkAll(urls) {
  const results = [];
  let i = 0;
  let inFlight = 0;
  let resolveDone;
  const done = new Promise((r) => { resolveDone = r; });

  function launchNext() {
    if (i >= urls.length) {
      if (inFlight === 0) resolveDone();
      return;
    }
    const url = urls[i++];
    inFlight++;
    checkUrl(url).then((r) => {
      results.push(r);
      inFlight--;
      if (i < urls.length) setTimeout(launchNext, STAGGER_MS);
      else if (inFlight === 0) resolveDone();
    });
  }

  for (let c = 0; c < Math.min(CONCURRENCY, urls.length); c++) {
    launchNext();
  }
  if (urls.length === 0) resolveDone();

  await done;
  return results;
}

export async function run({ json = false } = {}) {
  const urlMap = await collectUrls();
  const urls = [...urlMap.keys()];
  const results = await checkAll(urls);
  results.sort((a, b) => a.url.localeCompare(b.url));

  const counts = { ok: 0, warn: 0, fail: 0 };
  const failures = [];
  const warnings = [];

  for (const r of results) {
    counts[r.classification]++;
    const citedBy = [...urlMap.get(r.url)].sort();
    if (r.classification === 'fail') failures.push({ ...r, citedBy });
    if (r.classification === 'warn') warnings.push({ ...r, citedBy });
  }

  if (json) {
    console.log(JSON.stringify({ counts, results: results.map((r) => ({ ...r, citedBy: [...urlMap.get(r.url)].sort() })) }, null, 2));
  } else {
    for (const r of results) {
      if (r.classification === 'ok') {
        console.log(`  ok ${r.url} (${r.status})`);
      } else if (r.classification === 'warn') {
        console.warn(`WARN ${r.url} (${r.status ?? r.error}) — cited by: ${[...urlMap.get(r.url)].sort().join(', ')}`);
      } else {
        console.error(`FAIL ${r.url} (${r.status ?? r.error}) — cited by: ${[...urlMap.get(r.url)].sort().join(', ')}`);
      }
    }
    console.log(`\n${counts.ok} ok, ${counts.warn} warn, ${counts.fail} fail (of ${urls.length} unique URLs)`);
  }

  if (failures.length) {
    const lines = [`# Link rot detected — ${failures.length} failure(s)`, ''];
    for (const f of failures) {
      lines.push(`- ${f.url} (${f.status ?? f.error})`);
      for (const c of f.citedBy) lines.push(`  - cited by \`${c}\``);
    }
    await writeFile(join(ROOT, 'link-failures.md'), lines.join('\n') + '\n', 'utf8');
  }

  return failures.length === 0;
}

export { collectUrls };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const json = process.argv.includes('--json');
  run({ json }).then((passed) => { process.exitCode = passed ? 0 : 1; });
}
