import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../scripts/validate.mjs';

test('repo passes its own validation', async () => {
  assert.equal(await validate(), true);
});
