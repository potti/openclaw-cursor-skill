---
name: cursor-develop
description: Code implementation and modification skill using Cursor CLI in agent mode. Use when the user wants to implement a feature, fix a bug, apply code changes, create files, refactor code, or run tests. Modifies files in the project. Requires a prior plan step (cursor-plan) if the project has not been plan-approved yet — the plugin enforces this automatically. After a successful plan, development proceeds automatically without user confirmation.
---

# Code Implementation and Modification (Agent Mode)

> `cursor_cli` is an MCP tool. All code modification operations go through this tool with `mode: agent`.

> ⚠️ **Prerequisite**: If this is the first `cursor_cli` call in this session and you are not sure the tool is available, follow the `cursor-preflight` skill first.

> ⚠️ **Path and stop rules**:
> - Read this skill only using the exact absolute path from `<available_skills>` or `skillsSnapshot`.
> - Project scope is `<agent-workspace>/projects` — Cursor CLI cannot modify files outside this boundary.
> - Results from `cursor_cli` are verbatim — **do NOT summarize, rephrase, or add your own commentary to the output**.
> - If `cursor_cli` output contains a plan instead of implementation output, the plan-first gate was triggered. Return the plan verbatim, then offer to proceed.

## When to Use

Trigger this skill when the user's request requires **file changes**:

- "Implement feature X"
- "Fix bug Y"
- "Add a test for Z"
- "Refactor this module"
- "Create the API endpoint for ..."
- "Apply these changes: ..."
- "Make it work"

Use `cursor-ask` for read-only questions. Use `cursor-plan` for design-only work.

## Plan-First Gate

When `enforcePlanBeforeDevelopment: true` (the default plugin config), the plugin enforces that each project must complete a successful plan step before development is allowed.

**How it works automatically:**

1. First development request for a project → plugin downgrades to `mode: plan`.
   - Cursor CLI produces a written plan.
   - On plan success, the project is marked as **plan-approved**.
2. Subsequent development requests → plugin allows `mode: agent`.
   - Cursor CLI makes actual file changes.

**You do not manage this gate.** Just call `cursor_cli` with `mode: agent` — the plugin handles the rest.

**What to tell the user when the gate triggers:**

```text
The plan-first gate is active for this project. Running a plan step first.
[Return plan output verbatim]
Plan complete. The project is now approved for development.
Shall I proceed with the implementation now?
```

**To reset the gate** (e.g., user wants to re-plan): use the `cursor_cli` tool with `resetPlanGate: true`:

- `project`: `workspace`
- `prompt`: the task description
- `mode`: `agent`
- `resetPlanGate`: `true`

## Tool Call

Use the `cursor_cli` tool with:

- `project`: `workspace` (or the configured project key)
- `prompt`: a specific implementation task
- `mode`: `agent`

## Prompt Construction Guidelines

Write prompts that give Cursor CLI clear, specific, testable instructions:

| User request | Example prompt |
|---|---|
| "Add email notifications" | "Implement email notification sending when an order is placed. Trigger in OrderService.create(), use the existing EmailClient, send to order.user.email. Add a unit test in tests/order.test.ts." |
| "Fix the login bug" | "Fix the bug where login returns 401 when the email contains uppercase letters. The auth check is in src/auth/validator.ts. Normalize email to lowercase before comparison. Update the existing test." |
| "Refactor the config module" | "Refactor src/config/loader.ts to use a class-based approach. Expose a singleton Config instance. Update all import sites. Keep backward compatibility." |
| "Add rate limiting" | "Implement per-user rate limiting middleware in src/middleware/rateLimit.ts. Limit: 100 requests per minute per user ID. Use an in-memory store. Register in app.ts before route handlers." |
| "Run tests" | "Run the full test suite and report which tests fail and why." |

## Response Handling

- Return the `cursor_cli` output **exactly as received** — do not summarize, trim, or add your own conclusions.
- If the output contains a plan (gate was triggered), return it verbatim and offer to proceed with implementation.
- If the output indicates success, confirm completion to the user without rephrasing the details.

## Typical Workflow

### Workflow 1: Normal development (project already plan-approved)

User: "Add a health check endpoint to the API."

1. Call `cursor_cli` with `mode: agent` and prompt:
   `"Add a GET /health endpoint to the Express API in src/app.ts. Return {status: 'ok', timestamp: <ISO string>} with HTTP 200. Add a test in tests/health.test.ts."`
2. Return the result verbatim.

---

### Workflow 2: First development task (plan-first gate triggers)

User: "Implement the user profile feature."

1. Call `cursor_cli` with `mode: agent` (plugin will downgrade to plan).
2. Return plan output verbatim.
3. Inform user: "Plan complete. The project is now approved for development."
4. On user confirmation (or automatically if configured), call `cursor_cli` again with `mode: agent` and the same task.
5. Return implementation output verbatim.

---

### Workflow 3: Bug fix with test

User: "The cart total is wrong when a discount is applied."

1. Call `cursor_cli` with `mode: agent` and prompt:
   `"Debug and fix the cart total calculation when a discount coupon is applied. The issue is in src/cart/calculator.ts. Ensure the discount is applied after tax calculation. Add or update tests to cover the discount scenario."`
2. Return the result verbatim.

---

### Workflow 4: Reset plan gate and re-plan

User: "The architecture changed, let's re-plan the auth feature."

1. Call `cursor_cli` with `mode: plan` and `resetPlanGate: true`:
   `"Re-plan the authentication feature from scratch given the new microservice architecture..."`
2. Return plan verbatim.
3. Offer to implement when ready.

---

## Multi-Step Tasks

For complex tasks that span multiple areas, break the prompt into numbered steps and let Cursor CLI handle the sequence.

Use the `cursor_cli` tool with:

- `project`: `workspace`
- `mode`: `agent`
- `prompt`:
  ```
  1. Create the UserProfile model in src/models/userProfile.ts with fields: id, userId, bio, avatarUrl, createdAt.
  2. Add a ProfileRepository in src/repositories/profileRepository.ts with CRUD methods.
  3. Add API endpoints in src/routes/profile.ts: GET /users/:id/profile, PUT /users/:id/profile.
  4. Register the routes in src/app.ts.
  5. Write tests for all new endpoints in tests/profile.test.ts.
  ```

## Notes

- `mode: agent` makes real file changes in the project directory.
- Scope is strictly `<agent-workspace>/projects` — no files outside this boundary are accessible.
- Use `newSession: true` only if you want Cursor CLI to start fresh without context from previous runs.
- Use project key `workspace` when no explicit project name is given.
- If development fails (timeout, error), check gateway logs for `[cursor-cli]` entries with `ERROR` level.

## Quick Reference

| Parameter | Value |
|---|---|
| Tool | `cursor_cli` |
| Mode | `agent` |
| File changes | Yes — modifies files in the project |
| Plan gate | Auto-enforced on first call per project |
| Gate reset | Pass `resetPlanGate: true` |
| Session reuse | Automatic (unless `newSession: true`) |
