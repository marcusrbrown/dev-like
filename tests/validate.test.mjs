import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from '../scripts/validate.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

test('repo passes its own validation', async () => {
  assert.equal(await validate(), true);
});

// Suppress the FAIL/ok console noise from the deliberately-broken fixture run below;
// the assertions on the return value are what matter.
async function silently(fn) {
  const origLog = console.log;
  const origErr = console.error;
  console.log = () => {};
  console.error = () => {};
  try {
    return await fn();
  } finally {
    console.log = origLog;
    console.error = origErr;
  }
}

test('validate fails when a registry entry is missing a required generation section', async () => {
  const regDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dev-like-validate-fixture-'));
  try {
    const slug = 'broken';
    const slugDir = path.join(regDir, slug);
    await fs.mkdir(slugDir, { recursive: true });

    const entry = {
      slug,
      name: 'Broken Fixture',
      kind: 'org',
      consentTier: 'self-published',
      updated: '2026-07-11',
      sources: [
        { url: 'https://example.com/source', fetched: '2026-07-11', tier: 'self-published' },
      ],
    };
    await fs.writeFile(path.join(slugDir, 'entry.json'), JSON.stringify(entry, null, 2), 'utf8');

    // Missing the required 'Core principle' section entirely.
    const profile = [
      '# Broken Fixture — dev culture profile',
      '',
      '## Identity',
      '',
      'A fixture entry with no Core principle section.',
      '[[source]](https://example.com/source)',
      '',
      '## Workflow shape',
      '',
      'n/a',
      '',
      '## Stack',
      '',
      'n/a',
      '',
      '## Principles (cited)',
      '',
      '1. n/a',
      '',
      '## Tensions',
      '',
      'n/a',
      '',
    ].join('\n');
    await fs.writeFile(path.join(slugDir, 'profile.md'), profile, 'utf8');

    const index = { entries: { [slug]: { consentTier: entry.consentTier, updated: entry.updated } } };
    await fs.writeFile(path.join(regDir, 'index.json'), JSON.stringify(index, null, 2), 'utf8');

    const passed = await silently(() => validate({ regDir }));
    assert.equal(passed, false, 'validate() must fail when an entry cannot generate cleanly');
  } finally {
    await fs.rm(regDir, { recursive: true, force: true });
  }
});

test('validate fails when a committed prebuilt skill/ tree has drifted from profile.md', async () => {
  // Real fixture: copy the `every` registry entry, then hand-edit the committed
  // SKILL.md so it no longer matches fresh regeneration.
  const regDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dev-like-validate-drift-'));
  try {
    const slug = 'every';
    await fs.cp(path.join(ROOT, 'registry', slug), path.join(regDir, slug), { recursive: true });
    await fs.writeFile(path.join(regDir, 'index.json'), await fs.readFile(path.join(ROOT, 'registry', 'index.json'), 'utf8'));

    const skillMdPath = path.join(regDir, slug, 'skill', `develop-like-${slug}`, 'SKILL.md');
    const original = await fs.readFile(skillMdPath, 'utf8');
    await fs.writeFile(skillMdPath, original + '\ntampered\n', 'utf8');

    const passed = await silently(() => validate({ regDir }));
    assert.equal(passed, false, 'validate() must fail when the committed skill/ tree drifts from regeneration');
  } finally {
    await fs.rm(regDir, { recursive: true, force: true });
  }
});
