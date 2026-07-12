import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CLI = path.join(ROOT, 'bin', 'cli.mjs');
const REGISTRY = path.join(ROOT, 'registry');
const SLUG = 'every';
const DIRNAME = `develop-like-${SLUG}`;

async function mktmp(prefix = 'dev-like-cli-') {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

function runCli(args, opts = {}) {
  return spawnSync('node', [CLI, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    ...opts,
  });
}

async function walk(dir) {
  const out = [];
  async function rec(d) {
    const entries = await fs.readdir(d, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) await rec(full);
      else out.push(full);
    }
  }
  await rec(dir);
  return out;
}

test('fresh install: writes all files byte-identical to registry', async () => {
  const tmp = await mktmp();
  try {
    const res = runCli([SLUG, '--registry', REGISTRY, '--dir', tmp]);
    assert.equal(res.status, 0, `cli failed: ${res.stderr}`);

    const target = path.join(tmp, '.agents', 'skills', DIRNAME);
    const files = (await walk(target)).map((f) => path.relative(target, f)).sort();

    const srcRoot = path.join(REGISTRY, SLUG, 'skill', DIRNAME);
    const srcFiles = (await walk(srcRoot)).map((f) => path.relative(srcRoot, f)).sort();

    assert.deepEqual(files, srcFiles);

    for (const rel of srcFiles) {
      const a = await fs.readFile(path.join(target, rel));
      const b = await fs.readFile(path.join(srcRoot, rel));
      assert.ok(a.equals(b), `file ${rel} differs`);
    }
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('.claude symlink created when .claude exists', async () => {
  const tmp = await mktmp();
  try {
    await fs.mkdir(path.join(tmp, '.claude'), { recursive: true });
    const res = runCli([SLUG, '--registry', REGISTRY, '--dir', tmp]);
    assert.equal(res.status, 0, `cli failed: ${res.stderr}`);

    const linkPath = path.join(tmp, '.claude', 'skills', DIRNAME);
    const lst = await fs.lstat(linkPath);
    assert.ok(lst.isSymbolicLink(), 'expected a symlink');

    const real = await fs.realpath(linkPath);
    const expected = await fs.realpath(path.join(tmp, '.agents', 'skills', DIRNAME));
    assert.equal(real, expected);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('no .claude dir -> no .claude output', async () => {
  const tmp = await mktmp();
  try {
    const res = runCli([SLUG, '--registry', REGISTRY, '--dir', tmp]);
    assert.equal(res.status, 0, `cli failed: ${res.stderr}`);

    const exists = await fs.access(path.join(tmp, '.claude')).then(() => true).catch(() => false);
    assert.equal(exists, false);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('idempotent reinstall: exits 0, mentions up to date, mtimes unchanged', async () => {
  const tmp = await mktmp();
  try {
    const res1 = runCli([SLUG, '--registry', REGISTRY, '--dir', tmp]);
    assert.equal(res1.status, 0, `cli failed: ${res1.stderr}`);

    const target = path.join(tmp, '.agents', 'skills', DIRNAME);
    const files = (await walk(target)).sort();
    const before = {};
    for (const f of files) before[f] = (await fs.stat(f)).mtimeMs;

    const res2 = runCli([SLUG, '--registry', REGISTRY, '--dir', tmp]);
    assert.equal(res2.status, 0, `cli failed: ${res2.stderr}`);
    assert.match(res2.stdout, /up to date/i);

    for (const f of files) {
      const after = (await fs.stat(f)).mtimeMs;
      assert.equal(after, before[f], `mtime changed for ${f}`);
    }
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('drift without --force: refuses, names the differing path, does not overwrite', async () => {
  const tmp = await mktmp();
  try {
    const res1 = runCli([SLUG, '--registry', REGISTRY, '--dir', tmp]);
    assert.equal(res1.status, 0, `cli failed: ${res1.stderr}`);

    const target = path.join(tmp, '.agents', 'skills', DIRNAME);
    const skillMdPath = path.join(target, 'SKILL.md');
    await fs.writeFile(skillMdPath, 'CORRUPTED CONTENT', 'utf8');

    const res2 = runCli([SLUG, '--registry', REGISTRY, '--dir', tmp]);
    assert.equal(res2.status, 1);
    assert.match(res2.stderr + res2.stdout, /SKILL\.md/);

    const contents = await fs.readFile(skillMdPath, 'utf8');
    assert.equal(contents, 'CORRUPTED CONTENT');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('--force overwrites drifted file', async () => {
  const tmp = await mktmp();
  try {
    const res1 = runCli([SLUG, '--registry', REGISTRY, '--dir', tmp]);
    assert.equal(res1.status, 0, `cli failed: ${res1.stderr}`);

    const target = path.join(tmp, '.agents', 'skills', DIRNAME);
    const skillMdPath = path.join(target, 'SKILL.md');
    await fs.writeFile(skillMdPath, 'CORRUPTED CONTENT', 'utf8');

    const res2 = runCli([SLUG, '--registry', REGISTRY, '--dir', tmp, '--force']);
    assert.equal(res2.status, 0, `cli failed: ${res2.stderr}`);

    const expected = await fs.readFile(
      path.join(REGISTRY, SLUG, 'skill', DIRNAME, 'SKILL.md'),
      'utf8',
    );
    const actual = await fs.readFile(skillMdPath, 'utf8');
    assert.equal(actual, expected);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('--dry-run: prints plan, writes nothing', async () => {
  const tmp = await mktmp();
  try {
    const res = runCli([SLUG, '--registry', REGISTRY, '--dir', tmp, '--dry-run']);
    assert.equal(res.status, 0, `cli failed: ${res.stderr}`);
    assert.match(res.stdout, /SKILL\.md/);

    const exists = await fs.access(path.join(tmp, '.agents')).then(() => true).catch(() => false);
    assert.equal(exists, false);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('unknown target with --registry (no network): exit 1, mentions /dev-like', async () => {
  const tmp = await mktmp();
  try {
    const res = runCli(['definitely-not-a-real-slug', '--registry', REGISTRY, '--dir', tmp]);
    assert.equal(res.status, 1);
    assert.match(res.stderr, /\/dev-like/);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('alias resolution: every.to resolves and installs same as every', async () => {
  const tmp = await mktmp();
  try {
    const res = runCli(['every.to', '--registry', REGISTRY, '--dir', tmp]);
    assert.equal(res.status, 0, `cli failed: ${res.stderr}`);

    const target = path.join(tmp, '.agents', 'skills', DIRNAME);
    const exists = await fs.access(target).then(() => true).catch(() => false);
    assert.ok(exists, 'expected skill dir to exist');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
