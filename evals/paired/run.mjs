#!/usr/bin/env node
// Paired eval: same fixture task, with vs. without develop-like-every installed.
// Zero runtime deps. Grades WORKFLOW SHAPE from claude -p JSONL tool traces, not prose vibes.
// n=1 per side — see report header for the determinism caveat.

import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const FIXTURE_DIR = join(HERE, 'fixture');
const RESULTS_DIR = join(HERE, 'results');
const REGISTRY_DIR = join(REPO_ROOT, 'registry');
const CLI_PATH = join(REPO_ROOT, 'bin', 'cli.mjs');

const TASK_PROMPT =
  "Fix the zero-quantity discount bug in src/orders.js and clean the function up. Do it the way Every's engineers would.";

const MAX_TURNS = 15;
const TIMEOUT_MS = 10 * 60 * 1000; // 10 min per side

function run(cmd, args, opts = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    const timer = opts.timeoutMs
      ? setTimeout(() => {
          child.kill('SIGKILL');
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

async function setupArm(name, { withSkill }) {
  const dir = await mkdtemp(join(tmpdir(), `dev-like-eval-${name}-`));
  await cp(FIXTURE_DIR, dir, { recursive: true });

  if (withSkill) {
    // Create .claude/ first so ensureClaudeLink() lands the symlink.
    await mkdir(join(dir, '.claude'), { recursive: true });
    const install = await run(
      process.execPath,
      [CLI_PATH, 'every', '--registry', REGISTRY_DIR, '--dir', dir],
      { timeoutMs: 60_000 },
    );
    if (install.code !== 0) {
      throw new Error(`install failed for ${name} (exit ${install.code}): ${install.stderr || install.stdout}`);
    }
  }

  return dir;
}

async function runClaude(cwd) {
  const args = [
    '-p',
    TASK_PROMPT,
    '--output-format', 'stream-json',
    '--verbose',
    '--max-turns', String(MAX_TURNS),
    '--dangerously-skip-permissions',
  ];
  const result = await run('claude', args, { cwd, timeoutMs: TIMEOUT_MS });
  return result;
}

// ---- Grader ----------------------------------------------------------------

function parseJsonl(text) {
  const events = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      events.push(JSON.parse(trimmed));
    } catch {
      // ignore malformed/partial lines
    }
  }
  return events;
}

// Extract a flat ordered list of tool_use blocks (with their containing message index)
// from the assistant messages in a stream-json transcript, plus assistant text blocks.
function extractTimeline(events) {
  const timeline = []; // { kind: 'text'|'tool_use', ... }
  for (const ev of events) {
    if (ev.type !== 'assistant' || !ev.message?.content) continue;
    for (const block of ev.message.content) {
      if (block.type === 'text' && block.text?.trim()) {
        timeline.push({ kind: 'text', text: block.text });
      } else if (block.type === 'tool_use') {
        timeline.push({ kind: 'tool_use', name: block.name, input: block.input ?? {} });
      }
    }
  }
  return timeline;
}

const MUTATING_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);

function toolPathString(entry) {
  const i = entry.input ?? {};
  return String(i.file_path ?? i.path ?? i.notebook_path ?? '');
}

function looksLikeTestFile(path) {
  return /(^|\/)tests?\//i.test(path) || /\.test\.[cm]?[jt]sx?$/i.test(path) || /\.spec\.[cm]?[jt]sx?$/i.test(path);
}

function looksLikePlanText(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 3) return false;
  const orderedMarkers = lines.filter((l) => /^(\d+[.)]|[-*]\s|step\s*\d+)/i.test(l));
  return orderedMarkers.length >= 3;
}

function grade(timeline) {
  const signals = {
    readSkillDocs: false,
    planBeforeFirstMutation: false,
    touchedTestFile: false,
    ranTests: false,
    fileMutationCount: 0,
    toolUseCount: 0,
  };

  let firstMutationIndex = -1;
  for (let idx = 0; idx < timeline.length; idx++) {
    const entry = timeline[idx];
    if (entry.kind !== 'tool_use') continue;
    signals.toolUseCount++;

    if (entry.name === 'Read') {
      const p = toolPathString(entry);
      if (/develop-like-every/i.test(p)) signals.readSkillDocs = true;
    }

    if (entry.name === 'Skill' && /develop-like-every/i.test(entry.input?.skill ?? '')) {
      signals.readSkillDocs = true;
    }

    if (MUTATING_TOOLS.has(entry.name)) {
      signals.fileMutationCount++;
      if (firstMutationIndex === -1) firstMutationIndex = idx;
      const p = toolPathString(entry);
      if (looksLikeTestFile(p)) signals.touchedTestFile = true;
    }

    if (entry.name === 'TodoWrite') {
      signals.planBeforeFirstMutation = signals.planBeforeFirstMutation || firstMutationIndex === -1;
    }

    if (entry.name === 'Bash') {
      const cmd = String(entry.input?.command ?? '');
      if (/node\s+--test|npm\s+(run\s+)?test|bun\s+test/.test(cmd)) signals.ranTests = true;
    }
  }

  // Plan-before-first-mutation: either a TodoWrite tool_use occurred before the first
  // mutation, or an assistant text block with >=3 ordered-step lines occurred before it.
  if (!signals.planBeforeFirstMutation) {
    const cutoff = firstMutationIndex === -1 ? timeline.length : firstMutationIndex;
    for (let idx = 0; idx < cutoff; idx++) {
      const entry = timeline[idx];
      if (entry.kind === 'tool_use' && entry.name === 'TodoWrite') {
        signals.planBeforeFirstMutation = true;
        break;
      }
      if (entry.kind === 'text' && looksLikePlanText(entry.text)) {
        signals.planBeforeFirstMutation = true;
        break;
      }
    }
  }

  return signals;
}

// Turn count approximated from raw events: count of distinct assistant message events.
function countTurns(events) {
  return events.filter((e) => e.type === 'assistant').length;
}

function formatBool(b) {
  return b ? 'yes' : 'no';
}

function buildReport({ arm, control, armMeta, controlMeta }) {
  const rows = [
    ['Loaded skill (Skill tool or docs read)', formatBool(arm.readSkillDocs), formatBool(control.readSkillDocs)],
    ['Plan before first mutation', formatBool(arm.planBeforeFirstMutation), formatBool(control.planBeforeFirstMutation)],
    ['Touched a test file', formatBool(arm.touchedTestFile), formatBool(control.touchedTestFile)],
    ['Ran tests (Bash)', formatBool(arm.ranTests), formatBool(control.ranTests)],
    ['File mutation count', String(arm.fileMutationCount), String(control.fileMutationCount)],
    ['Tool-use count', String(arm.toolUseCount), String(control.toolUseCount)],
    ['Turn count (assistant messages)', String(armMeta.turns), String(controlMeta.turns)],
  ];

  const header = `| Signal | ARM (with skill) | CONTROL (without skill) |\n| --- | --- | --- |`;
  const body = rows.map(([label, a, c]) => `| ${label} | ${a} | ${c} |`).join('\n');

  const skillLoaded = arm.readSkillDocs && !control.readSkillDocs;
  const workflowShapeSignals = [];
  if (arm.planBeforeFirstMutation && !control.planBeforeFirstMutation) workflowShapeSignals.push('planned before mutating');
  if (arm.touchedTestFile && !control.touchedTestFile) workflowShapeSignals.push('touched a test file');
  if (arm.ranTests && !control.ranTests) workflowShapeSignals.push('ran tests');

  let verdict;
  if (workflowShapeSignals.length > 0) {
    verdict = `ARM's workflow measurably shifted toward the skill's shape: it ${workflowShapeSignals.join(', ')} where CONTROL did not.`;
  } else if (skillLoaded) {
    verdict = `The skill loaded (ARM invoked it via the Skill tool / docs read; CONTROL did not) but did not measurably change workflow shape on this fixture: plan-before-mutation, test-file-touched, and ran-tests are flat across both arms. Tool-use and turn counts differ (${arm.toolUseCount} vs ${control.toolUseCount} tool calls, ${armMeta.turns} vs ${controlMeta.turns} turns), consistent with the skill's guidance consuming turns without altering the plan/test signals this grader tracks. This is an honest null result on the behaviors that matter for n=1 — a single run cannot separate skill effect from model/task variance, and a richer fixture may be needed to surface a difference in plan/test discipline.`;
  } else {
    verdict = `No measurable shift: on every binary signal captured (skill loaded, plan-first, tests written, tests run), ARM and CONTROL behaved the same in this run. This is an honest null result for n=1, not evidence the skill is inert — a single run cannot separate skill effect from model/task variance.`;
  }

  return `# Paired eval: develop-like-every workflow shape

**Determinism caveat:** single run per side (n=1). These numbers are one sample, not
a statistically powered comparison. Re-run several times before drawing strong conclusions.

**Design note:** the task prompt carries an explicit "Every's engineers" cue because
skills load on description relevance — a generic bug-fix prompt correctly loads nothing
(verified: previous n=1 run, both sides identical, since there was no trigger for either
side to react to). This eval measures behavior shift WHEN THE CUE IS PRESENT. CONTROL gets
the identical cue but has no skill installed, so its run shows the cue's effect on the base
model without the skill — isolating what the skill itself adds on top of the prompt wording.

- Task prompt (identical both sides): "${TASK_PROMPT}"
- Model/tooling: \`claude -p\` with \`--output-format stream-json --verbose --max-turns ${MAX_TURNS} --dangerously-skip-permissions\`
- ARM: fixture with \`develop-like-every\` installed via \`bin/cli.mjs every --registry registry --dir <tmp>\`
- CONTROL: identical fixture, no skill installed

## Signal table

${header}
${body}

## Verdict

${verdict}
`;
}

async function regrade() {
  const [armRaw, controlRaw] = await Promise.all([
    readFile(join(RESULTS_DIR, 'arm.jsonl'), 'utf8'),
    readFile(join(RESULTS_DIR, 'control.jsonl'), 'utf8'),
  ]);

  const armEvents = parseJsonl(armRaw);
  const controlEvents = parseJsonl(controlRaw);

  const armTimeline = extractTimeline(armEvents);
  const controlTimeline = extractTimeline(controlEvents);

  const armSignals = grade(armTimeline);
  const controlSignals = grade(controlTimeline);

  const armMeta = { turns: countTurns(armEvents) };
  const controlMeta = { turns: countTurns(controlEvents) };

  const report = buildReport({
    arm: armSignals,
    control: controlSignals,
    armMeta,
    controlMeta,
  });

  await writeFile(join(RESULTS_DIR, 'report.md'), report);
  console.log('\n' + report);
}

async function main() {
  await mkdir(RESULTS_DIR, { recursive: true });

  if (process.argv.includes('--regrade')) {
    await regrade();
    return;
  }

  console.log('Setting up ARM (with skill)...');
  const armDir = await setupArm('arm', { withSkill: true });
  console.log('Setting up CONTROL (no skill)...');
  const controlDir = await setupArm('control', { withSkill: false });

  console.log(`ARM dir: ${armDir}`);
  console.log(`CONTROL dir: ${controlDir}`);

  console.log('Running ARM task...');
  const armResult = await runClaude(armDir);
  await writeFile(join(RESULTS_DIR, 'arm.jsonl'), armResult.stdout);
  if (armResult.code !== 0) {
    console.error(`ARM claude run exited ${armResult.code}`);
    console.error(armResult.stderr.slice(0, 4000));
  }

  console.log('Running CONTROL task...');
  const controlResult = await runClaude(controlDir);
  await writeFile(join(RESULTS_DIR, 'control.jsonl'), controlResult.stdout);
  if (controlResult.code !== 0) {
    console.error(`CONTROL claude run exited ${controlResult.code}`);
    console.error(controlResult.stderr.slice(0, 4000));
  }

  const armEvents = parseJsonl(armResult.stdout);
  const controlEvents = parseJsonl(controlResult.stdout);

  const armTimeline = extractTimeline(armEvents);
  const controlTimeline = extractTimeline(controlEvents);

  const armSignals = grade(armTimeline);
  const controlSignals = grade(controlTimeline);

  const armMeta = { turns: countTurns(armEvents) };
  const controlMeta = { turns: countTurns(controlEvents) };

  const report = buildReport({
    arm: armSignals,
    control: controlSignals,
    armMeta,
    controlMeta,
  });

  await writeFile(join(RESULTS_DIR, 'report.md'), report);
  console.log('\n' + report);

  // Cleanup tmp dirs; the JSONL + report are the evidence, not the tmp trees.
  await rm(armDir, { recursive: true, force: true }).catch(() => {});
  await rm(controlDir, { recursive: true, force: true }).catch(() => {});

  if (armResult.code !== 0 || controlResult.code !== 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
