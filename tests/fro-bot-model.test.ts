import {describe, expect, test} from 'bun:test'
import {readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const WORKFLOW = join(ROOT, '.github', 'workflows', 'fro-bot.yaml')

type Vars = {
  FRO_BOT_MODEL: string
  FRO_BOT_MODEL_REVIEW: string
  FRO_BOT_MODEL_ACT: string
  FRO_BOT_MODEL_LIGHT: string
}

type Scenario = {
  name: string
  eventName: string
  tier: 'review' | 'act' | 'light' | 'none'
  inputs?: {mode: string; prompt: string}
  onPullRequest?: boolean
}

// The `model:` input of the Run Fro Bot step, without the `${{ }}` wrapper. It uses only `&&`,
// `||`, `!`, `==`, parentheses, single-quoted strings and `github.*` / `vars.*` property reads, which
// mean the same thing in JavaScript for the values the scenarios feed it.
function readModelExpression(): string {
  const text = readFileSync(WORKFLOW, 'utf8')
  const match = text.match(/^\s*model: >-\n\s*\$\{\{([\s\S]*?)\}\}\n/m)
  if (match === null) throw new Error('model: expression not found in fro-bot.yaml')
  return match[1]!.replaceAll(/\s+/g, ' ').trim()
}

function evaluate(expression: string, scenario: Scenario, vars: Vars): unknown {
  const github = {
    event_name: scenario.eventName,
    event: {
      inputs: scenario.inputs ?? {},
      issue: scenario.onPullRequest === undefined ? {} : scenario.onPullRequest ? {pull_request: {}} : {},
    },
  }
  // eslint-disable-next-line no-new-func
  return new Function('github', 'vars', `return (${expression})`)(github, {...vars})
}

const SCENARIOS: Scenario[] = [
  {name: 'pull_request', eventName: 'pull_request', tier: 'review'},
  {name: 'pull_request_review_comment', eventName: 'pull_request_review_comment', tier: 'review'},
  {name: 'issue_comment on a pull request', eventName: 'issue_comment', onPullRequest: true, tier: 'review'},
  {
    name: 'workflow_dispatch pr-review, empty prompt',
    eventName: 'workflow_dispatch',
    inputs: {mode: 'pr-review', prompt: ''},
    tier: 'review',
  },
  {name: 'schedule', eventName: 'schedule', tier: 'act'},
  {
    name: 'workflow_dispatch autoheal, empty prompt',
    eventName: 'workflow_dispatch',
    inputs: {mode: 'autoheal', prompt: ''},
    tier: 'act',
  },
  {
    name: 'workflow_dispatch autoheal, custom prompt',
    eventName: 'workflow_dispatch',
    inputs: {mode: 'autoheal', prompt: 'do the thing'},
    tier: 'act',
  },
  {
    name: 'workflow_dispatch pr-review, custom prompt',
    eventName: 'workflow_dispatch',
    inputs: {mode: 'pr-review', prompt: 'do the thing'},
    tier: 'act',
  },
  {name: 'issues', eventName: 'issues', tier: 'light'},
  {name: 'issue_comment on an issue', eventName: 'issue_comment', onPullRequest: false, tier: 'light'},
  {name: 'unlisted event', eventName: 'push', tier: 'none'},
]

const TIER_VAR = {
  review: 'FRO_BOT_MODEL_REVIEW',
  act: 'FRO_BOT_MODEL_ACT',
  light: 'FRO_BOT_MODEL_LIGHT',
} as const

// Every combination of "variable set" / "variable empty" over the four variables.
function allVarCombinations(): Vars[] {
  const combos: Vars[] = []
  for (let bits = 0; bits < 16; bits += 1) {
    combos.push({
      FRO_BOT_MODEL: bits & 1 ? 'fallback-model' : '',
      FRO_BOT_MODEL_REVIEW: bits & 2 ? 'review-model' : '',
      FRO_BOT_MODEL_ACT: bits & 4 ? 'act-model' : '',
      FRO_BOT_MODEL_LIGHT: bits & 8 ? 'light-model' : '',
    })
  }
  return combos
}

describe('fro-bot.yaml model tier selection', () => {
  const expression = readModelExpression()

  for (const scenario of SCENARIOS) {
    test(`${scenario.name}: uses its own tier, else FRO_BOT_MODEL, never another tier`, () => {
      for (const vars of allVarCombinations()) {
        const expected = scenario.tier === 'none' ? vars.FRO_BOT_MODEL : vars[TIER_VAR[scenario.tier]] || vars.FRO_BOT_MODEL
        expect(evaluate(expression, scenario, vars), JSON.stringify(vars)).toBe(expected)
      }
    })
  }
})
