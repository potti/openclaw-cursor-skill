---
name: /deliver
id: deliver
category: Workflow
description: One-command delivery flow: plan, implement, test, and report
---

Execute the default delivery pipeline for this project.

## Pipeline

1. Understand task scope.
2. Plan first (mandatory for development tasks).
3. Implement with minimal scoped changes.
4. Run tests/checks.
5. Return a concise OpenClaw-ready completion report.

## Rules

- Do not skip plan-first.
- Do not skip tests.
- Do not report SUCCESS when validation fails.
- If blocked, return BLOCKED with clear reason and next options.
- Keep all changes inside current agent workspace `projects/` scope unless user explicitly authorizes otherwise.

## Final report template

```md
## OpenClaw Delivery Report

Status: SUCCESS | PARTIAL | BLOCKED
Task: <short summary>

Changes:
- <file>: <what changed>

Validation:
- <command>: <pass/fail>

Handoff:
- Ready for OpenClaw follow-up: yes/no
```

## Task closure

After successful delivery, append a short closure note in the same response:

- `Task closed: yes`
- `Next action owner: OpenClaw`
