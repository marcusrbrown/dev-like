import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import fss from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const GENERATOR = path.join(ROOT, 'scripts', 'generate-skill.mjs');
const SLUG = 'every';

const entry = JSON.parse(
  await fs.readFile(path.join(ROOT, 'registry', SLUG, 'entry.json'), 'utf8'),
);
const profileMd = await fs.readFile(
  path.join(ROOT, 'registry', SLUG, 'profile.md'),
  'utf8',
);

async function mktmp(prefix = 'dev-like-skillgen-') {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

function runGenerator(args, opts = {}) {
  return spawnSync('node', [GENERATOR, ...args], {
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

function parseFrontmatter(md) {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(md);
  assert.ok(match, 'SKILL.md must have a frontmatter block delimited by ---');
  return { frontmatter: match[1], body: match[2] };
}

test('generates the full tree', async () => {
  const outDir = await mktmp();
  try {
    const res = runGenerator([SLUG, '--out', outDir]);
    assert.equal(res.status, 0, `generator failed: ${res.stderr}`);

    const skillRoot = path.join(outDir, `develop-like-${SLUG}`);
    const files = (await walk(skillRoot)).map((f) => path.relative(skillRoot, f)).sort();

    const expected = [
      'SKILL.md',
      path.join('references', 'stack.md'),
      path.join('references', 'workflow.md'),
      path.join('references', 'sources.md'),
      path.join('personas', `${SLUG}-developer.md`),
    ].sort();

    assert.deepEqual(files, expected, 'output tree must contain exactly the expected files');
  } finally {
    await fs.rm(outDir, { recursive: true, force: true });
  }
});

test('SKILL.md frontmatter invariants', async () => {
  const outDir = await mktmp();
  try {
    const res = runGenerator([SLUG, '--out', outDir]);
    assert.equal(res.status, 0, `generator failed: ${res.stderr}`);

    const skillMd = await fs.readFile(
      path.join(outDir, `develop-like-${SLUG}`, 'SKILL.md'),
      'utf8',
    );
    const { frontmatter } = parseFrontmatter(skillMd);

    assert.match(frontmatter, new RegExp(`^name:\\s*develop-like-${SLUG}\\s*$`, 'm'));

    // Handle plain and folded (>-) YAML scalars: join indented continuation lines.
    const descMatch = /^description:[^\S\n]*(.*)((?:\n[^\S\n]+\S.*)*)/m.exec(frontmatter);
    assert.ok(descMatch, 'frontmatter must contain a description field');
    const description = [descMatch[1].replace(/^>-?$/, ''), ...descMatch[2].split('\n').map((l) => l.trim())]
      .filter(Boolean)
      .join(' ')
      .trim();
    assert.ok(
      description.length >= 20 && description.length <= 1024,
      `description length ${description.length} must be within 20..1024`,
    );
    assert.ok(
      description.includes('develop like Every'),
      'description must contain the trigger phrase "develop like Every"',
    );
    assert.ok(
      description.includes(entry.updated),
      'description must contain the profiled date from entry.json',
    );

    assert.match(frontmatter, /generator:\s*dev-like/);
    assert.match(
      frontmatter,
      new RegExp(`consent-tier:\\s*"?${entry.consentTier}"?`),
    );
    assert.match(frontmatter, new RegExp(`profiled:\\s*"?${entry.updated}"?`));
  } finally {
    await fs.rm(outDir, { recursive: true, force: true });
  }
});

test('SKILL.md body <= 150 lines', async () => {
  const outDir = await mktmp();
  try {
    const res = runGenerator([SLUG, '--out', outDir]);
    assert.equal(res.status, 0, `generator failed: ${res.stderr}`);

    const skillMd = await fs.readFile(
      path.join(outDir, `develop-like-${SLUG}`, 'SKILL.md'),
      'utf8',
    );
    const { body } = parseFrontmatter(skillMd);
    const lineCount = body.split('\n').length;
    assert.ok(lineCount <= 150, `body has ${lineCount} lines, expected <= 150`);
  } finally {
    await fs.rm(outDir, { recursive: true, force: true });
  }
});

test('Tensions survive verbatim', async () => {
  const outDir = await mktmp();
  try {
    const res = runGenerator([SLUG, '--out', outDir]);
    assert.equal(res.status, 0, `generator failed: ${res.stderr}`);

    const skillMd = await fs.readFile(
      path.join(outDir, `develop-like-${SLUG}`, 'SKILL.md'),
      'utf8',
    );

    const tensionsMatch = /## Tensions\n([\s\S]*?)(?:\n## |$)/.exec(profileMd);
    assert.ok(tensionsMatch, 'profile.md must contain a ## Tensions section');
    const tensionLines = tensionsMatch[1]
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    assert.ok(tensionLines.length > 0, 'expected at least one Tensions line to verify');
    for (const line of tensionLines) {
      assert.ok(
        skillMd.includes(line),
        `generated SKILL.md must contain Tensions line verbatim: ${line}`,
      );
    }
  } finally {
    await fs.rm(outDir, { recursive: true, force: true });
  }
});

test('provenance closure', async () => {
  const outDir = await mktmp();
  try {
    const res = runGenerator([SLUG, '--out', outDir]);
    assert.equal(res.status, 0, `generator failed: ${res.stderr}`);

    const skillRoot = path.join(outDir, `develop-like-${SLUG}`);
    const files = [
      path.join(skillRoot, 'SKILL.md'),
      path.join(skillRoot, 'references', 'stack.md'),
      path.join(skillRoot, 'references', 'workflow.md'),
    ];

    const urlRe = /\((https:\/\/[^\s)]+)\)/g;
    const foundUrls = new Set();
    for (const f of files) {
      const content = await fs.readFile(f, 'utf8');
      let m;
      while ((m = urlRe.exec(content))) {
        foundUrls.add(m[1]);
      }
    }

    const allowedExact = new Set(entry.sources.map((s) => s.url));
    allowedExact.add(entry.homepage);
    const repoPrefix = 'https://github.com/marcusrbrown/dev-like';

    assert.ok(foundUrls.size > 0, 'expected at least one URL in generated docs');
    for (const url of foundUrls) {
      const allowed = allowedExact.has(url) || url.startsWith(repoPrefix);
      assert.ok(allowed, `URL not in provenance closure: ${url}`);
    }
  } finally {
    await fs.rm(outDir, { recursive: true, force: true });
  }
});

test('sources.md is the full bibliography', async () => {
  const outDir = await mktmp();
  try {
    const res = runGenerator([SLUG, '--out', outDir]);
    assert.equal(res.status, 0, `generator failed: ${res.stderr}`);

    const sourcesMd = await fs.readFile(
      path.join(outDir, `develop-like-${SLUG}`, 'references', 'sources.md'),
      'utf8',
    );

    for (const source of entry.sources) {
      assert.ok(sourcesMd.includes(source.url), `sources.md missing URL: ${source.url}`);
      assert.ok(
        sourcesMd.includes(source.fetched),
        `sources.md missing fetched date ${source.fetched} for ${source.url}`,
      );
      assert.ok(
        sourcesMd.includes(source.tier),
        `sources.md missing tier ${source.tier} for ${source.url}`,
      );
    }
  } finally {
    await fs.rm(outDir, { recursive: true, force: true });
  }
});

test('deterministic', async () => {
  const outDirA = await mktmp();
  const outDirB = await mktmp();
  try {
    const resA = runGenerator([SLUG, '--out', outDirA]);
    const resB = runGenerator([SLUG, '--out', outDirB]);
    assert.equal(resA.status, 0, `generator failed: ${resA.stderr}`);
    assert.equal(resB.status, 0, `generator failed: ${resB.stderr}`);

    const skillRootA = path.join(outDirA, `develop-like-${SLUG}`);
    const skillRootB = path.join(outDirB, `develop-like-${SLUG}`);

    const filesA = (await walk(skillRootA)).map((f) => path.relative(skillRootA, f)).sort();
    const filesB = (await walk(skillRootB)).map((f) => path.relative(skillRootB, f)).sort();
    assert.deepEqual(filesA, filesB);

    for (const rel of filesA) {
      const bufA = await fs.readFile(path.join(skillRootA, rel));
      const bufB = await fs.readFile(path.join(skillRootB, rel));
      assert.ok(bufA.equals(bufB), `file ${rel} differs between runs`);
    }
  } finally {
    await fs.rm(outDirA, { recursive: true, force: true });
    await fs.rm(outDirB, { recursive: true, force: true });
  }
});

test('committed prebuilt matches regeneration (snapshot)', () => {
  const committedSkillMd = path.join(
    ROOT,
    'registry',
    SLUG,
    'skill',
    `develop-like-${SLUG}`,
    'SKILL.md',
  );
  assert.ok(
    fss.existsSync(committedSkillMd),
    `expected committed artifact at ${committedSkillMd}`,
  );

  const res = runGenerator([SLUG, '--check']);
  assert.equal(
    res.status,
    0,
    `--check should exit 0 when committed artifact matches regeneration; stderr: ${res.stderr}`,
  );
});

test('missing section fails loud', async () => {
  const registryDir = await mktmp('dev-like-registryoverride-');
  try {
    const slugDir = path.join(registryDir, SLUG);
    await fs.mkdir(slugDir, { recursive: true });

    await fs.copyFile(
      path.join(ROOT, 'registry', SLUG, 'entry.json'),
      path.join(slugDir, 'entry.json'),
    );

    const strippedProfile = profileMd.replace(/## Tensions\n[\s\S]*?(?=\n## |$)/, '');
    await fs.writeFile(path.join(slugDir, 'profile.md'), strippedProfile, 'utf8');

    const res = runGenerator([SLUG, '--registry', registryDir]);
    assert.notEqual(res.status, 0, 'generator must fail when a required section is missing');
    assert.match(res.stderr, /Tensions/i);
  } finally {
    await fs.rm(registryDir, { recursive: true, force: true });
  }
});
