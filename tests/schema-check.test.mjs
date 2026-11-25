import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSchema } from '../scripts/schema-check.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA = JSON.parse(
  await fs.readFile(path.join(__dirname, '..', 'registry', 'schema', 'entry.schema.json'), 'utf8'),
);

const validEntry = () => ({
  slug: 'example',
  name: 'Example',
  kind: 'org',
  aliases: ['ex', 'eg'],
  consentTier: 'self-published',
  updated: '2026-02-28',
  homepage: 'https://example.com',
  sources: [{ url: 'https://example.com/source', fetched: '2026-02-28', tier: 'self-published' }],
});

const mentions = (errors, ...fragments) =>
  errors.some((line) => fragments.every((fragment) => line.includes(fragment)));

// ---- fail-loud: the checker must throw on anything it cannot enforce -------

test('checkSchema throws on an unsupported keyword (oneOf)', () => {
  assert.throws(() => checkSchema({ oneOf: [{ type: 'string' }] }, 'x'), /unsupported schema keyword "oneOf"/);
});

test('checkSchema throws on an unsupported format', () => {
  assert.throws(() => checkSchema({ type: 'string', format: 'email' }, 'a@example.com'), /unsupported format "email"/);
});

test('checkSchema throws on a type or format named after an Object.prototype member', () => {
  assert.throws(() => checkSchema({ type: 'toString' }, 'x'), /unsupported type "toString"/);
  assert.throws(() => checkSchema({ type: 'string', format: 'constructor' }, 'x'), /unsupported format "constructor"/);
});

test('checkSchema throws on "else", which is not implemented alongside if/then', () => {
  const schema = { if: { type: 'string' }, then: { minLength: 1 }, else: { type: 'number' } };
  assert.throws(() => checkSchema(schema, 'x'), /unsupported schema keyword "else"/);
});

// ---- the real entry schema: baseline + each keyword it actually uses -------

test('the real entry schema accepts a valid entry', () => {
  assert.deepEqual(checkSchema(SCHEMA, validEntry()), []);
});

test('format: date rejects an impossible calendar date (2026-02-30)', () => {
  const entry = validEntry();
  entry.updated = '2026-02-30';
  const errors = checkSchema(SCHEMA, entry);
  assert.ok(mentions(errors, '/updated', 'valid date'), errors.join('\n'));
});

test('format: date reports an out-of-range month as a violation instead of throwing', () => {
  const entry = validEntry();
  entry.updated = '2026-13-01';
  const errors = checkSchema(SCHEMA, entry);
  assert.ok(mentions(errors, '/updated', 'valid date'), errors.join('\n'));
});

test('format: date accepts a real leap day', () => {
  const entry = validEntry();
  entry.updated = '2028-02-29';
  assert.deepEqual(checkSchema(SCHEMA, entry), []);
});

test('format: uri rejects a malformed value', () => {
  const entry = validEntry();
  entry.homepage = 'not a uri';
  const errors = checkSchema(SCHEMA, entry);
  assert.ok(mentions(errors, '/homepage', 'valid uri'), errors.join('\n'));
});

test('minLength rejects an empty name', () => {
  const entry = validEntry();
  entry.name = '';
  const errors = checkSchema(SCHEMA, entry);
  assert.ok(mentions(errors, '/name', 'at least 1'), errors.join('\n'));
});

test('minItems rejects empty sources', () => {
  const entry = validEntry();
  entry.sources = [];
  const errors = checkSchema(SCHEMA, entry);
  assert.ok(mentions(errors, '/sources', 'at least 1'), errors.join('\n'));
});

test('uniqueItems rejects duplicate aliases', () => {
  const entry = validEntry();
  entry.aliases = ['ex', 'ex'];
  const errors = checkSchema(SCHEMA, entry);
  assert.ok(mentions(errors, '/aliases', 'unique'), errors.join('\n'));
});

// ---- own-property semantics: Object.prototype names are not "present" ------

test('additionalProperties:false flags extra keys named like Object.prototype members', () => {
  for (const key of ['constructor', 'toString']) {
    const entry = { ...validEntry(), [key]: 'x' };
    const errors = checkSchema(SCHEMA, entry);
    assert.ok(mentions(errors, `unexpected property "${key}"`), `${key}: ${errors.join('\n')}`);
  }
});

test('additionalProperties:false flags an own "__proto__" key', () => {
  // Object literals would set the prototype instead; JSON.parse creates an own key.
  const entry = JSON.parse(`{ "__proto__": "x", ${JSON.stringify(validEntry()).slice(1)}`);
  assert.ok(Object.hasOwn(entry, '__proto__'), 'fixture must carry an own "__proto__" key');
  const errors = checkSchema(SCHEMA, entry);
  assert.ok(mentions(errors, 'unexpected property "__proto__"'), errors.join('\n'));
});

test('required does not treat an inherited property as present', () => {
  const errors = checkSchema({ type: 'object', required: ['toString'] }, {});
  assert.ok(mentions(errors, 'required property "toString" is missing'), errors.join('\n'));
});

test('properties does not validate an inherited property as if it were set', () => {
  assert.deepEqual(checkSchema({ type: 'object', properties: { toString: { type: 'string' } } }, {}), []);
});
