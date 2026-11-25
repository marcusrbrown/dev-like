// Spawn-with-timeout helper for the paired eval, split out so it can be tested
// without importing run.mjs (which runs the whole eval on import). Zero deps.

import { spawn } from 'node:child_process';

const POSIX = process.platform !== 'win32';

// Kill the whole process group (the child is its group leader via `detached`), so
// descendants the child spawned die with it. Falls back to the direct child on
// Windows, and tolerates a group that has already exited.
function killTree(child) {
  if (!POSIX || !child.pid) {
    child.kill('SIGKILL');
    return;
  }
  try {
    process.kill(-child.pid, 'SIGKILL');
  } catch (err) {
    if (err.code !== 'ESRCH') throw err;
  }
}

export function run(cmd, args, opts = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], detached: POSIX, ...opts });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    const timer = opts.timeoutMs
      ? setTimeout(() => {
          killTree(child);
          reject(new Error(`timed out after ${opts.timeoutMs}ms running ${cmd} ${args.join(' ')}`));
        }, opts.timeoutMs)
      : null;
    child.on('error', (err) => { if (timer) clearTimeout(timer); reject(err); });
    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      resolvePromise({ code, stdout, stderr });
    });
  });
}
