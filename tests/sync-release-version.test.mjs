import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncReleaseVersion, isValidSemver } from '../scripts/sync-release-version.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SKILL_MD = (version) => `---
name: dev-like
description: >-
  Profile a tech company or developer's engineering culture from public sources and
  generate a develop-like-<target> skill that makes the agent work the way they do.
license: MIT
argument-hint: "<company | person | alias> (e.g. Every, Theo, theo.gg)"
metadata:
  author: marcusrbrown
  version: "${version}"
  repository: https://github.com/marcusrbrown/dev-like
---

# dev-like

Body content untouched by sync.
`;

async function makeFixture({ packageVersion = '0.4.0', pluginVersion = '0.1.0', skillVersion = '0.1.0', marketplaceVersion } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dev-like-sync-fixture-'));

  await fs.writeFile(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 'dev-like', version: packageVersion }, null, 2) + '\n',
    'utf8',
  );

  await fs.mkdir(path.join(root, '.claude-plugin'), { recursive: true });
  await fs.writeFile(
    path.join(root, '.claude-plugin', 'plugin.json'),
    JSON.stringify({ name: 'dev-like', description: 'desc', version: pluginVersion, license: 'MIT' }, null, 2) + '\n',
    'utf8',
  );

  const marketplaceEntry = { name: 'dev-like', source: './', description: 'desc' };
  if (marketplaceVersion !== undefined) marketplaceEntry.version = marketplaceVersion;
  await fs.writeFile(
    path.join(root, '.claude-plugin', 'marketplace.json'),
    JSON.stringify({ name: 'dev-like', owner: { name: 'x', url: 'https://x' }, description: 'desc', plugins: [marketplaceEntry] }, null, 2) + '\n',
    'utf8',
  );

  await fs.mkdir(path.join(root, 'skills', 'dev-like'), { recursive: true });
  await fs.writeFile(path.join(root, 'skills', 'dev-like', 'SKILL.md'), SKILL_MD(skillVersion), 'utf8');

  return root;
}

test('isValidSemver accepts canonical SemVer 2.0.0 examples', () => {
  assert.equal(isValidSemver('0.4.0'), true);
  assert.equal(isValidSemver('1.2.3-alpha.1+build.5'), true);
  assert.equal(isValidSemver('1.2.3+001'), true);
});

test('isValidSemver rejects malformed versions', () => {
  assert.equal(isValidSemver('01.2.3'), false, 'leading zero in numeric identifier must be rejected');
  assert.equal(isValidSemver('1.2.3-01'), false, 'leading zero in pre-release numeric identifier must be rejected');
  assert.equal(isValidSemver('banana'), false, 'non-semver string must be rejected');
});

test('--check identifies stale plugin.json and SKILL.md version surfaces', async () => {
  const root = await makeFixture({ packageVersion: '0.4.0', pluginVersion: '0.1.0', skillVersion: '0.1.0' });
  try {
    const result = await syncReleaseVersion({ root, check: true });
    assert.equal(result.ok, false);
    const drifted = result.drift.map((d) => d.path);
    assert.ok(drifted.some((p) => p.includes('plugin.json')), 'expected plugin.json drift reported');
    assert.ok(drifted.some((p) => p.includes('SKILL.md')), 'expected SKILL.md drift reported');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('write mode syncs plugin.json and SKILL.md metadata.version to package version', async () => {
  const root = await makeFixture({ packageVersion: '0.4.0', pluginVersion: '0.1.0', skillVersion: '0.1.0' });
  try {
    const result = await syncReleaseVersion({ root, check: false });
    assert.equal(result.ok, true);

    const plugin = JSON.parse(await fs.readFile(path.join(root, '.claude-plugin', 'plugin.json'), 'utf8'));
    assert.equal(plugin.version, '0.4.0');
    assert.equal(plugin.name, 'dev-like');
    assert.equal(plugin.description, 'desc');
    assert.equal(plugin.license, 'MIT');

    const skillText = await fs.readFile(path.join(root, 'skills', 'dev-like', 'SKILL.md'), 'utf8');
    assert.match(skillText, /version: "0\.4\.0"/);
    assert.match(skillText, /Body content untouched by sync\./);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('--check exits ok after sync', async () => {
  const root = await makeFixture({ packageVersion: '0.4.0', pluginVersion: '0.1.0', skillVersion: '0.1.0' });
  try {
    await syncReleaseVersion({ root, check: false });
    const result = await syncReleaseVersion({ root, check: true });
    assert.equal(result.ok, true);
    assert.equal(result.drift.length, 0);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('second sync is byte-idempotent', async () => {
  const root = await makeFixture({ packageVersion: '0.4.0', pluginVersion: '0.1.0', skillVersion: '0.1.0' });
  try {
    await syncReleaseVersion({ root, check: false });
    const pluginBefore = await fs.readFile(path.join(root, '.claude-plugin', 'plugin.json'), 'utf8');
    const skillBefore = await fs.readFile(path.join(root, 'skills', 'dev-like', 'SKILL.md'), 'utf8');

    const result = await syncReleaseVersion({ root, check: false });
    assert.equal(result.ok, true);
    assert.deepEqual(result.written, []);

    const pluginAfter = await fs.readFile(path.join(root, '.claude-plugin', 'plugin.json'), 'utf8');
    const skillAfter = await fs.readFile(path.join(root, 'skills', 'dev-like', 'SKILL.md'), 'utf8');
    assert.equal(pluginAfter, pluginBefore);
    assert.equal(skillAfter, skillBefore);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('marketplace entry stays byte-identical and unversioned; --check fails if a version key is present', async () => {
  const cleanRoot = await makeFixture({ packageVersion: '0.4.0', pluginVersion: '0.1.0', skillVersion: '0.1.0' });
  try {
    const before = await fs.readFile(path.join(cleanRoot, '.claude-plugin', 'marketplace.json'), 'utf8');
    await syncReleaseVersion({ root: cleanRoot, check: false });
    const after = await fs.readFile(path.join(cleanRoot, '.claude-plugin', 'marketplace.json'), 'utf8');
    assert.equal(after, before, 'marketplace.json must never be written by sync');
  } finally {
    await fs.rm(cleanRoot, { recursive: true, force: true });
  }

  const dirtyRoot = await makeFixture({ packageVersion: '0.4.0', pluginVersion: '0.4.0', skillVersion: '0.4.0', marketplaceVersion: '0.4.0' });
  try {
    const result = await syncReleaseVersion({ root: dirtyRoot, check: true });
    assert.equal(result.ok, false);
    assert.ok(
      result.drift.some((d) => d.path.includes('marketplace.json') && /version/i.test(d.message)),
      'expected marketplace.json entry-level version to be flagged as drift',
    );
  } finally {
    await fs.rm(dirtyRoot, { recursive: true, force: true });
  }
});

test('missing package.json version fails loudly with no partial writes', async () => {
  const root = await makeFixture({ packageVersion: '0.4.0', pluginVersion: '0.1.0', skillVersion: '0.1.0' });
  try {
    await fs.writeFile(
      path.join(root, 'package.json'),
      JSON.stringify({ name: 'dev-like' }, null, 2) + '\n',
      'utf8',
    );

    await assert.rejects(() => syncReleaseVersion({ root, check: false }));

    const plugin = await fs.readFile(path.join(root, '.claude-plugin', 'plugin.json'), 'utf8');
    const pluginJson = JSON.parse(plugin);
    assert.equal(pluginJson.version, '0.1.0', 'plugin.json must remain unwritten on failure');

    const skillText = await fs.readFile(path.join(root, 'skills', 'dev-like', 'SKILL.md'), 'utf8');
    assert.match(skillText, /version: "0\.1\.0"/, 'SKILL.md must remain unwritten on failure');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('malformed SKILL.md frontmatter version fails loudly before any write', async () => {
  const root = await makeFixture({ packageVersion: '0.4.0', pluginVersion: '0.1.0', skillVersion: '0.1.0' });
  try {
    const badSkill = SKILL_MD('0.1.0').replace('version: "0.1.0"', 'version: "0.1.0"\n  version: "0.1.1"');
    await fs.writeFile(path.join(root, 'skills', 'dev-like', 'SKILL.md'), badSkill, 'utf8');

    await assert.rejects(() => syncReleaseVersion({ root, check: false }));

    const plugin = JSON.parse(await fs.readFile(path.join(root, '.claude-plugin', 'plugin.json'), 'utf8'));
    assert.equal(plugin.version, '0.1.0', 'plugin.json must remain unwritten when SKILL.md is ambiguous');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('plugin.json sync updates only top-level version, preserving a nested object with its own "version" key', async () => {
  const root = await makeFixture({ packageVersion: '0.4.0', pluginVersion: '0.1.0', skillVersion: '0.1.0' });
  try {
    const pluginPath = path.join(root, '.claude-plugin', 'plugin.json');
    const pluginJson = JSON.parse(await fs.readFile(pluginPath, 'utf8'));
    pluginJson.nested = { version: '9.9.9', other: 'keep-me' };
    await fs.writeFile(pluginPath, JSON.stringify(pluginJson, null, 2) + '\n', 'utf8');

    const result = await syncReleaseVersion({ root, check: false });
    assert.equal(result.ok, true);

    const after = JSON.parse(await fs.readFile(pluginPath, 'utf8'));
    assert.equal(after.version, '0.4.0', 'top-level version must be synced');
    assert.equal(after.nested.version, '9.9.9', 'nested version must be preserved structurally');
    assert.equal(after.nested.other, 'keep-me');

    const check = await syncReleaseVersion({ root, check: true });
    assert.equal(check.ok, true, '--check must pass after sync even with a nested version field present');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('plugin.json with two top-level "version" keys rejects even when the last duplicate equals the package version', async () => {
  const root = await makeFixture({ packageVersion: '0.4.0', pluginVersion: '0.1.0', skillVersion: '0.1.0' });
  try {
    const pluginPath = path.join(root, '.claude-plugin', 'plugin.json');
    // JSON.parse silently collapses duplicate keys to the last one, so build the raw text
    // by hand — JSON.stringify can never produce duplicate keys.
    const rawText = [
      '{',
      '  "name": "dev-like",',
      '  "description": "desc",',
      '  "version": "0.1.0",',
      '  "version": "0.4.0",',
      '  "license": "MIT"',
      '}',
      '',
    ].join('\n');
    await fs.writeFile(pluginPath, rawText, 'utf8');
    const pluginBefore = rawText;
    const skillPath = path.join(root, 'skills', 'dev-like', 'SKILL.md');
    const skillBefore = await fs.readFile(skillPath, 'utf8');

    const checkResult = await syncReleaseVersion({ root, check: true });
    assert.equal(checkResult.ok, false, '--check must reject an ambiguous plugin.json with duplicate top-level version keys');

    await assert.rejects(() => syncReleaseVersion({ root, check: false }), /expected exactly one "version" field/);

    assert.equal(await fs.readFile(pluginPath, 'utf8'), pluginBefore, 'plugin.json must remain unwritten in write mode');
    assert.equal(await fs.readFile(skillPath, 'utf8'), skillBefore, 'SKILL.md must remain unwritten in write mode');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('plugin.json version-like text inside a string value is not miscounted as a top-level version key', async () => {
  const root = await makeFixture({ packageVersion: '0.4.0', pluginVersion: '0.1.0', skillVersion: '0.1.0' });
  try {
    const pluginPath = path.join(root, '.claude-plugin', 'plugin.json');
    const pluginJson = JSON.parse(await fs.readFile(pluginPath, 'utf8'));
    pluginJson.description = 'Mentions "version": "9.9.9" inside a string, not a real key';
    await fs.writeFile(pluginPath, JSON.stringify(pluginJson, null, 2) + '\n', 'utf8');

    const result = await syncReleaseVersion({ root, check: false });
    assert.equal(result.ok, true, 'a string value containing version-like text must not be miscounted');

    const after = JSON.parse(await fs.readFile(pluginPath, 'utf8'));
    assert.equal(after.version, '0.4.0');
    assert.equal(after.description, pluginJson.description, 'string content must be preserved verbatim');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('non-empty malformed plugin.json version fails loudly before any write', async () => {
  const root = await makeFixture({ packageVersion: '0.4.0', pluginVersion: 'banana', skillVersion: '0.1.0' });
  try {
    await assert.rejects(() => syncReleaseVersion({ root, check: false }));

    const plugin = JSON.parse(await fs.readFile(path.join(root, '.claude-plugin', 'plugin.json'), 'utf8'));
    assert.equal(plugin.version, 'banana', 'plugin.json must remain unwritten when its version is malformed');

    const skillText = await fs.readFile(path.join(root, 'skills', 'dev-like', 'SKILL.md'), 'utf8');
    assert.match(skillText, /version: "0\.1\.0"/, 'SKILL.md must remain unwritten when plugin.json is malformed');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('non-empty malformed SKILL.md metadata.version fails loudly before any write', async () => {
  const root = await makeFixture({ packageVersion: '0.4.0', pluginVersion: '0.1.0', skillVersion: 'banana' });
  try {
    await assert.rejects(() => syncReleaseVersion({ root, check: false }));

    const plugin = JSON.parse(await fs.readFile(path.join(root, '.claude-plugin', 'plugin.json'), 'utf8'));
    assert.equal(plugin.version, '0.1.0', 'plugin.json must remain unwritten when SKILL.md version is malformed');

    const skillText = await fs.readFile(path.join(root, 'skills', 'dev-like', 'SKILL.md'), 'utf8');
    assert.match(skillText, /version: "banana"/, 'SKILL.md must remain unwritten when its own version is malformed');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('SKILL.md with canonical double-quoted version plus a single-quoted duplicate rejects before any write', async () => {
  const root = await makeFixture({ packageVersion: '0.4.0', pluginVersion: '0.1.0', skillVersion: '0.1.0' });
  try {
    const badSkill = SKILL_MD('0.1.0').replace('version: "0.1.0"', "version: \"0.1.0\"\n  version: '0.1.1'");
    await fs.writeFile(path.join(root, 'skills', 'dev-like', 'SKILL.md'), badSkill, 'utf8');

    await assert.rejects(() => syncReleaseVersion({ root, check: false }));

    const plugin = JSON.parse(await fs.readFile(path.join(root, '.claude-plugin', 'plugin.json'), 'utf8'));
    assert.equal(plugin.version, '0.1.0', 'plugin.json must remain unwritten when SKILL.md has a duplicate version key');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('SKILL.md with canonical version plus a plain-scalar duplicate rejects before any write', async () => {
  const root = await makeFixture({ packageVersion: '0.4.0', pluginVersion: '0.1.0', skillVersion: '0.1.0' });
  try {
    const badSkill = SKILL_MD('0.1.0').replace('version: "0.1.0"', 'version: "0.1.0"\n  version: 0.1.1');
    await fs.writeFile(path.join(root, 'skills', 'dev-like', 'SKILL.md'), badSkill, 'utf8');

    await assert.rejects(() => syncReleaseVersion({ root, check: false }));

    const plugin = JSON.parse(await fs.readFile(path.join(root, '.claude-plugin', 'plugin.json'), 'utf8'));
    assert.equal(plugin.version, '0.1.0', 'plugin.json must remain unwritten when SKILL.md has a duplicate version key');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('duplicate "dev-like" marketplace entries reject, even when only the later one carries a version', async () => {
  const root = await makeFixture({ packageVersion: '0.4.0', pluginVersion: '0.4.0', skillVersion: '0.4.0' });
  try {
    const marketplacePath = path.join(root, '.claude-plugin', 'marketplace.json');
    const marketplace = JSON.parse(await fs.readFile(marketplacePath, 'utf8'));
    marketplace.plugins.push({ name: 'dev-like', source: './', description: 'dup', version: '0.4.0' });
    await fs.writeFile(marketplacePath, JSON.stringify(marketplace, null, 2) + '\n', 'utf8');

    const result = await syncReleaseVersion({ root, check: true });
    assert.equal(result.ok, false);
    assert.ok(
      result.drift.some((d) => d.path.includes('marketplace.json')),
      'expected duplicate dev-like marketplace entries to be flagged',
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('write mode with illegal marketplace version and stale plugin/SKILL rejects and leaves all three files byte-identical', async () => {
  const root = await makeFixture({ packageVersion: '0.4.0', pluginVersion: '0.1.0', skillVersion: '0.1.0', marketplaceVersion: '0.4.0' });
  try {
    const pluginPath = path.join(root, '.claude-plugin', 'plugin.json');
    const skillPath = path.join(root, 'skills', 'dev-like', 'SKILL.md');
    const marketplacePath = path.join(root, '.claude-plugin', 'marketplace.json');

    const pluginBefore = await fs.readFile(pluginPath, 'utf8');
    const skillBefore = await fs.readFile(skillPath, 'utf8');
    const marketplaceBefore = await fs.readFile(marketplacePath, 'utf8');

    await assert.rejects(() => syncReleaseVersion({ root, check: false }));

    assert.equal(await fs.readFile(pluginPath, 'utf8'), pluginBefore, 'plugin.json must remain unwritten');
    assert.equal(await fs.readFile(skillPath, 'utf8'), skillBefore, 'SKILL.md must remain unwritten');
    assert.equal(await fs.readFile(marketplacePath, 'utf8'), marketplaceBefore, 'marketplace.json must remain unwritten');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('CLI rejects unknown arguments', async () => {
  const root = await makeFixture();
  try {
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const run = promisify(execFile);
    await assert.rejects(
      run(process.execPath, [path.join(ROOT, 'scripts', 'sync-release-version.mjs'), '--root', root, '--bogus']),
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('CLI rejects "--root --check" — a following flag-like token must not be treated as the root path', async () => {
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const run = promisify(execFile);
  try {
    await run(process.execPath, [path.join(ROOT, 'scripts', 'sync-release-version.mjs'), '--root', '--check']);
    assert.fail('expected CLI to reject --root followed by a flag-like token');
  } catch (err) {
    assert.match(err.stderr ?? '', /--root requires a value/);
  }
});

test('CLI --check exits nonzero on drift and zero after sync', async () => {
  const root = await makeFixture({ packageVersion: '0.4.0', pluginVersion: '0.1.0', skillVersion: '0.1.0' });
  try {
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const run = promisify(execFile);

    await assert.rejects(
      run(process.execPath, [path.join(ROOT, 'scripts', 'sync-release-version.mjs'), '--check', '--root', root]),
    );

    await run(process.execPath, [path.join(ROOT, 'scripts', 'sync-release-version.mjs'), '--root', root]);

    await run(process.execPath, [path.join(ROOT, 'scripts', 'sync-release-version.mjs'), '--check', '--root', root]);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('root package.json wires validate/version-changesets/publish-changesets scripts', async () => {
  const pkg = JSON.parse(await fs.readFile(path.join(ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.validate, 'node scripts/validate.mjs && node scripts/sync-release-version.mjs --check');
  assert.equal(pkg.scripts['version-changesets'], 'changeset version && node scripts/sync-release-version.mjs');
  assert.equal(pkg.scripts['publish-changesets'], 'node scripts/sync-release-version.mjs --check && changeset publish');
});
