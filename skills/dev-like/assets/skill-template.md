---
name: develop-like-{{slug}}
description: >-
  Develop the way {{name}} ({{kindLabel}}) does: {{summary}}. Use when the user wants
  {{name}}-style engineering decisions, code review in {{name}}'s voice, or asks to
  "develop like {{name}}". Profiled {{profiled}} from public sources.
license: MIT
metadata:
  author: marcusrbrown
  generator: dev-like
  profiled: "{{profiled}}"
  consent-tier: "{{consentTier}}"
  source: https://github.com/marcusrbrown/dev-like/tree/main/registry/{{slug}}
---

# Develop like {{name}}

> Profiled as of {{profiled}} · consent tier: {{consentTier}} · full bibliography in [references/sources.md](references/sources.md). Cultures drift — if this is more than ~6 months old, re-run `/dev-like {{slug}}` to refresh.

## Core principle

{{corePrinciple}}

## Principles

{{principlesCited}}

## Workflow

Execute these checkpoints before and during the task. Treat them as required actions, not
background description:

{{workflowShape}}

See [references/stack.md](references/stack.md) for the stack and [references/workflow.md](references/workflow.md) for workflow detail.

## Tensions

{{tensions}}

Want a reviewer/pair persona in {{name}}'s voice? See [personas/{{slug}}-developer.md](personas/{{slug}}-developer.md) — it's reference material. Claude Code users can copy it to `.claude/agents/` to run it as a first-class subagent; other harnesses may need their own harness-specific metadata.
