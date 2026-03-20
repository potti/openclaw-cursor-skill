# AGENTS

This file is the project-level contract for how AI agents should work in this repository.

## Why This File Exists

- Define a single default delivery behavior for all agent runs.
- Keep implementation quality consistent across sessions and teammates.
- Prevent drift between "what we want" and "how the agent actually executes."

## Project Mission

`cursor-agent` should support this flow:

1. Receive OpenClaw development task.
2. Plan first for development-class work.
3. Implement automatically.
4. Run tests/checks.
5. Report result back in OpenClaw-friendly format.

## Default Command Workflow

- `/deliver`: main execution path (plan -> implement -> validate -> handoff report)
- `/explore`: investigation mode only (no feature implementation)

## Non-Negotiables

- Do not bypass plan-first for development tasks.
- Do not report success if validation fails.
- Do not hide blockers; report them with clear next actions.
- Keep changes minimal and scoped to the requested task.

## Completion Report Contract

Final response should include:

- Status: `SUCCESS | PARTIAL | BLOCKED`
- Task summary
- Changed files and key modifications
- Validation commands + outcomes
- Handoff readiness for OpenClaw

## Local Skills

Use only the local skills under `/.cursor/skills/` when relevant:

- `delivery-loop`
- `task-explore`
