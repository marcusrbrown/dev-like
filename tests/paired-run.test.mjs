import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { run } from '../evals/paired/run-process.mjs';

const posix = process.platform !== 'win32';

function isAlive(pid) {
  try {
    process.kill(pid, 0);
  } catch {
    return false;
  }
  // A killed-but-unreaped process still answers signal 0; count zombies as dead.
  try {
    return !execFileSync('ps', ['-o', 'stat=', '-p', String(pid)], { encoding: 'utf8' }).trim().startsWith('Z');
  } catch {
    return false;
  }
}

test('run() returns code, stdout and stderr on normal exit', async () => {
  const result = await run(process.execPath, ['-e', 'console.log("out"); console.error("err"); process.exit(3)']);
  assert.deepEqual(result, { code: 3, stdout: 'out\n', stderr: 'err\n' });
});

test('run() rejects on timeout and leaves no descendant processes behind', { skip: !posix }, async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dev-like-paired-run-'));
  const pidFile = path.join(dir, 'grandchild.pid');
  let grandchild = null;
  try {
    // outer sh -> inner sh -> sleep: the sleep is a grandchild of the spawned process.
    const script = `sh -c 'sleep 30 & echo $! > "$1"; wait' sh "$1" & wait`;
    await assert.rejects(run('sh', ['-c', script, 'sh', pidFile], { timeoutMs: 1500 }), /timed out after 1500ms/);

    grandchild = Number((await fs.readFile(pidFile, 'utf8')).trim());
    assert.ok(Number.isInteger(grandchild) && grandchild > 0, 'fixture must record the grandchild pid before timing out');

    for (let i = 0; i < 30 && isAlive(grandchild); i++) await sleep(100);
    assert.equal(isAlive(grandchild), false, `grandchild ${grandchild} survived the timeout kill`);
  } finally {
    if (grandchild) {
      try { process.kill(grandchild, 'SIGKILL'); } catch { /* already gone */ }
    }
    await fs.rm(dir, { recursive: true, force: true });
  }
});
