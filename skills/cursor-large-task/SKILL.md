---
name: cursor-large-task
description: Orchestrate large or multi-phase requirements using Cursor CLI in small steps with optional task state under .cursor/. Use when the user has an epic feature, long-running implementation, or wants phased plan → implement → review → test with checkpoints and session continuity. Composes cursor-plan, cursor-develop, and cursor-ask; does not replace the plugin.
---

# Large / Persistent Task Orchestration

> This skill is **convention + workflow** for the OpenClaw agent. The `cursor-cli` plugin still exposes only `cursor_cli` (and `/cursor`). There is no separate `executeLargeTask` API — you **simulate** persistence by updating a task file and issuing **one** `cursor_cli` call per step (or per user turn).

> ⚠️ **Prerequisite**: Use `cursor-preflight` if needed, then `cursor-plan` / `cursor-develop` / `cursor-ask` as appropriate for each step.

> ⚠️ **Path and stop rules**:
> - Read this skill only using the exact absolute path from `<available_skills>` or `skillsSnapshot`.
> - Scope remains `<agent-workspace>/projects` — same as other cursor skills.
> - Return `cursor_cli` output **verbatim** unless the user explicitly asks for a short summary.

## When to Use

- User describes a **large** or **multi-milestone** requirement (weeks of work, many modules).
- User asks for **phased delivery**, **checkpoints**, or **resume after interruption**.
- User wants a pattern similar to **plan → implement → review → test → done** with traceability.

Do **not** use this skill for a single small change — use `cursor-develop` or `cursor-ask` directly.

## Core Idea

| Concept | How you implement it (no new MCP tool) |
|--------|----------------------------------------|
| `taskId` | Stable string you choose (e.g. `feat-billing-2026`) and store in the task file |
| `sessionId` | **Do not set** `newSession: true` between steps on the same project — the plugin persists and passes `--resume` automatically |
| Phases | Map to `cursor_cli` **mode** + focused **prompt** per step |
| `progress` (0–100) | Your estimate after each step; update the task file for the user |
| `checkpoint` | Optional: git commit hash or note after a milestone (record in task file; commits via `cursor_cli` `mode: agent` only when the user wants git history) |
| `lastEvent` | Optional: last meaningful line from output or `sessionId` from tool `details` if exposed — do not fabricate stream events |

**Hard rule:** Never describe a single `cursor_cli` call that is supposed to run an unbounded `while` loop until `done`. The plugin **blocks** until the CLI exits and has **timeouts**. Large work = **many** calls across **multiple** agent turns or scheduled follow-ups (see parent AGENTS.md progress polling if applicable).

## Task State File (recommended)

Maintain **one JSON file per large task** inside the repo so work can resume across conversations:

- **Path:** `.cursor/openclaw-task.<taskId>.json` (or a single `.cursor/openclaw-task.json` if only one active epic).
- **Create/update** via `cursor_cli` `mode: agent` with an explicit prompt: "Create or update this file with the following JSON shape ..." OR maintain it yourself in the host agent and only use the file as a handoff artifact.

### Suggested schema

```json
{
  "taskId": "feat-example",
  "title": "Short title of the epic",
  "phase": "plan",
  "progress": 0,
  "milestones": [
    { "id": "m1", "description": "Data model + migrations", "done": false },
    { "id": "m2", "description": "API + tests", "done": false }
  ],
  "currentMilestoneId": "m1",
  "checkpoint": "",
  "lastCursorSessionNote": "Plugin resumes by project; optional paste from tool details.sessionId if needed for debugging",
  "updatedAt": "2026-04-02T12:00:00.000Z"
}
```

Allowed `phase` values (adjust labels to match your process):

| phase | Meaning | Typical skill / `cursor_cli` mode |
|-------|---------|-----------------------------------|
| `plan` | Written plan, no implementation | `cursor-plan` → `mode: plan` |
| `implement` | Code changes per milestone | `cursor-develop` → `mode: agent` |
| `review` | Read-only review of diff / design | `cursor-ask` → `mode: ask` |
| `test` | Run/fix tests, harden | `cursor-develop` → `mode: agent` |
| `done` | All milestones satisfied | No further `cursor_cli` unless user extends scope |

## Phase Workflow

### 1. Start or resume

1. If `.cursor/openclaw-task.<taskId>.json` exists, read it (host filesystem or ask user to paste).
2. If missing, create `taskId`, initial `milestones`, `phase: plan`, `progress: 0`.
3. **Do not** pass `newSession: true` if continuing the same epic on the same `project` key.

### 2. Plan phase

1. Follow `cursor-plan`: one `cursor_cli` call, `mode: plan`, prompt includes full epic + deliverables + milestone list request.
2. Optionally ask Cursor CLI to also write `.cursor/plan-<taskId>.md` in the same run (single prompt, still one call).
3. On success: set `phase` → `implement`, bump `progress` (e.g. 15–25), update task file (next implement call or host agent).

### 3. Implement loop (logical, not one MCP call)

For **each** milestone:

1. One `cursor_cli` call, `mode: agent`, prompt = only that milestone + acceptance criteria + paths.
2. On success: mark milestone `done`, update `checkpoint` (e.g. `git rev-parse HEAD` via prompt inside Cursor or note "after M1"), increase `progress`.
3. If blocked, stay on same milestone; narrow the next prompt.

### 4. Review phase

1. `cursor-ask` / `mode: ask`: summarize risks, diff review, security or API consistency — **read-only**.
2. If issues found, set `phase` back to `implement` for targeted fixes.

### 5. Test phase

1. `cursor-develop` / `mode: agent`: run suite, fix failures, narrow scope per call.

### 6. Done

Set `phase: done`, `progress: 100`, summarize milestones for the user (without rephrasing raw `cursor_cli` logs unless asked).

## Session and Resume

- **Same project key** (e.g. `workspace`) for all steps of one epic.
- **Default** `cursor_cli` behavior already resumes Cursor's session per project path — keep `newSession` **false** (omit or false).
- **Model**: keep `model: auto` (default) unless you have a specific reason to pin a different model for the project.
- **Reset** only when the user explicitly wants a fresh Cursor session (`newSession: true`) — then treat as a new conversation line in the task file.

## Checkpoints and Git

- Prefer **small, milestone-sized** agent prompts that end in a stable state.
- Commits: only when the user wants them; include in the prompt: *"Commit with message `...`"* or *"Do not commit; leave changes unstaged"* per user preference.
- Record the resulting commit hash in `checkpoint` when useful.

## Relation to Plan-First Gate

If `enforcePlanBeforeDevelopment` is on, the **first** `agent` call may be downgraded to plan — same as `cursor-develop`. Your explicit `plan` phase aligns with that. After plan approval, milestone `agent` calls run as normal.

## Quick Reference

| Item | Value |
|------|--------|
| Tool | `cursor_cli` only |
| Large task pattern | Many calls, one milestone per `agent` call |
| State | `.cursor/openclaw-task.<taskId>.json` (recommended) |
| Session | Reuse default; avoid `newSession` between steps |
| Plans | `cursor-plan` |
| Code | `cursor-develop` |
| Review | `cursor-ask` |

## What This Skill Does **Not** Do

- Does not add a new OpenClaw plugin entrypoint or background job queue.
- Does not stream partial `stream-json` events to the user in real time (the plugin returns when the CLI finishes).
- Does not guarantee OpenClaw-level `taskId` — use your own string and file for correlation.
