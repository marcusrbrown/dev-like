import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectUrls, classify } from '../scripts/check-links.mjs';

test('collectUrls finds >20 unique URLs from the real registry', async () => {
  const urls = await collectUrls();
  assert.ok(urls.size > 20, `expected >20 unique URLs, got ${urls.size}`);
});

test('collectUrls includes a known source URL', async () => {
  const urls = await collectUrls();
  assert.ok(urls.has('https://rfd.shared.oxide.computer/rfd/0001'));
});

test('classify: status codes', () => {
  assert.equal(classify(200), 'ok');
  assert.equal(classify(301), 'ok');
  assert.equal(classify(403), 'warn');
  assert.equal(classify(429), 'warn');
  assert.equal(classify(404), 'fail');
  assert.equal(classify(500), 'fail');
});

test('classify: network/timeout errors are fail', () => {
  assert.equal(classify(new Error('timeout')), 'fail');
});
