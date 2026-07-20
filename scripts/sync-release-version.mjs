#!/usr/bin/env node
// Single-source release-version synchronization: package.json.version is canonical.
// Propagates it to .claude-plugin/plugin.json and skills/dev-like/SKILL.md frontmatter
// metadata.version. Deliberately does NOT write .claude-plugin/marketplace.json — Claude's
// plugin resolution precedence is plugin.json -> marketplace entry -> git SHA, so a
// marketplace-entry version would be a second, unnecessary source of truth. `--check`
// enforces that no such entry-level version exists.
//
// All target files are parsed and validated (structurally, before any write) up front,
// so malformed/ambiguous input fails loudly and no file is ever partially written. This
// is "plan fully, then write" ordering within a single process — it is not a cross-file
// filesystem transaction, so a crash between two writes can still leave them inconsistent;
// re-running the tool (idempotent) recovers.

import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const PACKAGE_JSON = 'package.json';
const PLUGIN_JSON = join('.claude-plugin', 'plugin.json');
const MARKETPLACE_JSON = join('.claude-plugin', 'marketplace.json');
const SKILL_MD = join('skills', 'dev-like', 'SKILL.md');

// Canonical SemVer 2.0.0 regex, from https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
const SEMVER_RE =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

export function isValidSemver(value) {
  return typeof value === 'string' && SEMVER_RE.test(value);
}

class SyncError extends Error {}

// Not a general JSON parser — JSON.parse already provides structural validation. This is
// a minimal lexical scanner that counts how many times a key named `keyName` appears at
// object depth 1 (i.e. directly inside the root `{ }`), so we can detect duplicate
// top-level keys that JSON.parse silently collapses to their last occurrence. It respects
// JSON string/escape syntax and object/array nesting depth so key-like text inside string
// values or nested objects is never miscounted.
function countTopLevelObjectKeys(text, keyName) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  let count = 0;
  const keyRe = new RegExp(`^"${keyName}"\\s*:`);

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      if (depth === 1 && keyRe.test(text.slice(i))) count++;
      continue;
    }

    if (ch === '{' || ch === '[') depth++;
    else if (ch === '}' || ch === ']') depth--;
  }

  return count;
}

async function readJson(root, rel) {
  const full = join(root, rel);
  let text;
  try {
    text = await readFile(full, 'utf8');
  } catch (err) {
    throw new SyncError(`${rel}: cannot read (${err.message})`);
  }
  let json;
  try {
    json = JSON.parse(text);
  } catch (err) {
    throw new SyncError(`${rel}: invalid JSON (${err.message})`);
  }
  return { rel, full, text, json };
}

function readPackageVersion(pkg) {
  const version = pkg.json.version;
  if (!isValidSemver(version)) {
    throw new SyncError(`${pkg.rel}: missing or malformed "version" field`);
  }
  return version;
}

function planPluginJsonUpdate(pluginFile, targetVersion) {
  const current = pluginFile.json.version;
  if (!isValidSemver(current)) {
    throw new SyncError(`${pluginFile.rel}: missing or malformed "version" field`);
  }

  // JSON.parse silently collapses duplicate top-level keys to the last occurrence, so an
  // ambiguous manifest with two "version" keys could otherwise pass unnoticed (worse, if
  // the last duplicate happens to already equal targetVersion, --check would pass too).
  // Surface this as drift (like the marketplace invariant) rather than throwing
  // immediately, so --check can report it without excepting.
  const topLevelVersionKeys = countTopLevelObjectKeys(pluginFile.text, 'version');
  if (topLevelVersionKeys !== 1) {
    return {
      rel: pluginFile.rel,
      full: pluginFile.full,
      ambiguous: true,
      message: `expected exactly one "version" field, found ${topLevelVersionKeys}`,
    };
  }

  if (current === targetVersion) return null;

  // Update only the top-level "version" key structurally (not a regex line count, which
  // can't distinguish top-level from nested "version" fields) and reserialize as
  // deterministic 2-space JSON + trailing newline. This is a one-time formatting
  // normalization of a tiny manifest — simpler and safer than a custom tokenizer that
  // preserves byte-for-byte formatting while still doing a structural edit.
  const updated = { ...pluginFile.json, version: targetVersion };
  const newText = `${JSON.stringify(updated, null, 2)}\n`;
  return { rel: pluginFile.rel, full: pluginFile.full, newText };
}

function planSkillMdUpdate(skillPath, text, targetVersion) {
  const fmMatch = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fmMatch) throw new SyncError(`${skillPath}: no YAML frontmatter found`);
  const frontmatter = fmMatch[1];

  // Narrow frontmatter parse: locate `metadata:` block and require exactly one
  // `version:` line within it (indented under metadata).
  const lines = frontmatter.split('\n');
  const metadataIdx = lines.findIndex((l) => /^metadata:\s*$/.test(l));
  if (metadataIdx === -1) throw new SyncError(`${skillPath}: frontmatter missing "metadata:" block`);

  // First pass: count ANY indented "version:" key within the metadata block, regardless
  // of value formatting (double-quoted, single-quoted, or plain scalar), so a duplicate
  // in any style is caught as ambiguous — not just a duplicate double-quoted line.
  const versionKeyRe = /^(\s+)version:\s*(.*)$/;
  const versionLineIdxs = [];
  for (let i = metadataIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^\S/.test(line)) break; // dedent = end of metadata block
    if (versionKeyRe.test(line)) versionLineIdxs.push(i);
  }
  if (versionLineIdxs.length === 0) {
    throw new SyncError(`${skillPath}: "metadata.version" field not found`);
  }
  if (versionLineIdxs.length > 1) {
    throw new SyncError(`${skillPath}: multiple "metadata.version" fields found`);
  }

  const versionLineIdx = versionLineIdxs[0];
  const m = lines[versionLineIdx].match(/^(\s+)version:\s*"([^"]*)"\s*$/);
  if (!m) {
    throw new SyncError(`${skillPath}: "metadata.version" must be a double-quoted string`);
  }
  const versionValue = m[2];
  if (!isValidSemver(versionValue)) {
    throw new SyncError(`${skillPath}: "metadata.version" is missing or malformed`);
  }

  if (versionValue === targetVersion) return null;

  const indent = lines[versionLineIdx].match(/^(\s+)/)[1];
  lines[versionLineIdx] = `${indent}version: "${targetVersion}"`;
  const newFrontmatter = lines.join('\n');
  const newText = text.slice(0, fmMatch.index) + `---\n${newFrontmatter}\n---\n` + text.slice(fmMatch.index + fmMatch[0].length);
  return { rel: skillPath, newText };
}

function checkMarketplaceHasNoVersion(marketplaceFile) {
  const plugins = marketplaceFile.json.plugins;
  if (!Array.isArray(plugins)) {
    throw new SyncError(`${marketplaceFile.rel}: missing "plugins" array`);
  }
  const entries = plugins.filter((p) => p && p.name === 'dev-like');
  if (entries.length === 0) {
    throw new SyncError(`${marketplaceFile.rel}: no "dev-like" plugin entry found`);
  }
  if (entries.length > 1) {
    return {
      path: marketplaceFile.rel,
      message: `expected exactly one "dev-like" plugin entry, found ${entries.length}`,
    };
  }
  const [entry] = entries;
  if (Object.prototype.hasOwnProperty.call(entry, 'version')) {
    return {
      path: marketplaceFile.rel,
      message:
        '"dev-like" plugin entry must not declare a "version" field ' +
        '(canonical version comes from plugin.json; duplicating it here creates drift risk)',
    };
  }
  return null;
}

/**
 * Synchronize (or check) release-version metadata across plugin.json and SKILL.md,
 * treating package.json.version as canonical. Never writes marketplace.json.
 *
 * @param {{ root?: string, check?: boolean }} [opts]
 * @returns {Promise<{ ok: boolean, drift: Array<{ path: string, message: string }>, written: string[] }>}
 */
export async function syncReleaseVersion({ root = DEFAULT_ROOT, check = false } = {}) {
  const [pkg, pluginFile, marketplaceFile] = await Promise.all([
    readJson(root, PACKAGE_JSON),
    readJson(root, PLUGIN_JSON),
    readJson(root, MARKETPLACE_JSON),
  ]);

  const skillFull = join(root, SKILL_MD);
  let skillText;
  try {
    skillText = await readFile(skillFull, 'utf8');
  } catch (err) {
    throw new SyncError(`${SKILL_MD}: cannot read (${err.message})`);
  }

  const targetVersion = readPackageVersion(pkg);

  const marketplaceDrift = checkMarketplaceHasNoVersion(marketplaceFile);
  const pluginPlan = planPluginJsonUpdate(pluginFile, targetVersion);
  const skillPlan = planSkillMdUpdate(SKILL_MD, skillText, targetVersion);

  const drift = [];
  if (marketplaceDrift) drift.push(marketplaceDrift);
  if (pluginPlan?.ambiguous) drift.push({ path: pluginPlan.rel, message: pluginPlan.message });
  else if (pluginPlan) drift.push({ path: pluginPlan.rel, message: `version differs from package.json (${targetVersion})` });
  if (skillPlan) drift.push({ path: skillPlan.rel, message: `metadata.version differs from package.json (${targetVersion})` });

  if (check || drift.length === 0) {
    return { ok: drift.length === 0, drift, written: [] };
  }

  if (pluginPlan?.ambiguous) {
    // Never write when plugin.json's top-level "version" key is ambiguous — this is a
    // design violation the tool must not "fix" by writing around it.
    throw new SyncError(`${pluginPlan.rel}: ${pluginPlan.message}`);
  }

  if (marketplaceDrift) {
    // Never write when the marketplace invariant is violated — this is a design
    // violation the tool must not "fix" by writing around it.
    throw new SyncError(`${marketplaceDrift.path}: ${marketplaceDrift.message}`);
  }

  const written = [];
  if (pluginPlan) {
    await writeFile(pluginPlan.full, pluginPlan.newText, 'utf8');
    written.push(pluginPlan.rel);
  }
  if (skillPlan) {
    await writeFile(skillFull, skillPlan.newText, 'utf8');
    written.push(skillPlan.rel);
  }

  return { ok: true, drift: [], written };
}

function parseArgs(argv) {
  const opts = { check: false, root: undefined };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--check') {
      opts.check = true;
    } else if (arg === '--root') {
      const value = argv[i + 1];
      if (!value || value.startsWith('-')) throw new SyncError('--root requires a value');
      opts.root = value;
      i++;
    } else {
      throw new SyncError(`unknown argument: ${arg}`);
    }
  }
  return opts;
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`FAIL ${err.message}`);
    process.exitCode = 1;
    return;
  }

  try {
    const result = await syncReleaseVersion(opts);
    if (opts.check) {
      if (result.ok) {
        console.log('OK release-version metadata is in sync');
      } else {
        for (const d of result.drift) console.error(`FAIL ${d.path}: ${d.message}`);
        process.exitCode = 1;
      }
    } else {
      if (result.written.length === 0) console.log('OK release-version metadata already in sync');
      else for (const w of result.written) console.log(`  ok synced ${w}`);
    }
  } catch (err) {
    console.error(`FAIL ${err.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
