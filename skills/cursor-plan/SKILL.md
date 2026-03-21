---
name: cursor-plan
description: Architecture planning and technical design skill using Cursor Agent in plan mode. Use when the user wants to design a feature, plan an implementation approach, explore trade-offs, get a technical proposal, or prepare a plan before coding begins. Produces a written plan without modifying files. Also used as the mandatory first step when enforcePlanBeforeDevelopment is enabled and the project has not yet been plan-approved.
---

# Architecture Planning and Technical Design (Plan Mode)

> `cursor_agent` is an MCP tool. All planning operations go through this tool with `mode: plan`.

> ⚠️ **Prerequisite**: If this is the first `cursor_agent` call in this session and you are not sure the tool is available, follow the `cursor-preflight` skill first.

> ⚠️ **Path and stop rules**:
> - Read this skill only using the exact absolute path from `<available_skills>` or `skillsSnapshot`.
> - Do not use `exec` + `ls/find` to explore project paths.
> - Results from `cursor_agent` are verbatim — **do NOT summarize, rephrase, or add your own commentary**.

## When to Use

Trigger this skill when the user's request requires **planning or designing** before any code is written:

- "How should I implement feature X?"
- "Design the architecture for Y"
- "What's the best approach to refactor Z?"
- "Plan the migration from A to B"
- "What changes would be needed to add authentication?"
- "Give me a technical proposal for this feature"

Also use this skill when:

- The plugin's `enforcePlanBeforeDevelopment` policy is active and this project has not been plan-approved yet. In this case, calling `cursor_agent` with `mode: agent` is automatically downgraded to `mode: plan` by the plugin. **Explicitly use plan mode** to be transparent about the gate.
- The user explicitly says "plan first" or "don't make changes yet, just design it".

## Plan-First Gate Explained

When `enforcePlanBeforeDevelopment: true` (the default), the plugin enforces a two-step workflow:

1. **Step 1 — Plan** (this skill): `cursor_agent` runs in plan mode and produces a written plan.
   - If the plan run succeeds, the project becomes **plan-approved**.
2. **Step 2 — Develop** (`cursor-develop` skill): subsequent `agent` mode calls are now allowed for this project.

The approval is scoped per-project and persists until the gateway restarts or `resetPlanGate: true` is passed.

**You do not need to manage this gate manually.** The plugin handles the downgrade and approval automatically. Just be transparent with the user that a plan is being produced first.

## Tool Call

Call `cursor_agent` with `mode: plan`:

```
cursor_agent(
  project: "<project-name>",
  prompt:  "<design or planning question>",
  mode:    "plan"
)
```

**`mode: plan` does not modify files.** It produces a written plan, architecture proposal, or change outline.

## Prompt Construction Guidelines

Write the prompt to extract a concrete, actionable plan from Cursor Agent:

| User request | Example prompt |
|---|---|
| "How to add OAuth?" | "Design a plan to add OAuth2 authentication to this project. Include: which files to change, new components needed, data model changes, and migration steps." |
| "Refactor the service layer" | "Create a refactoring plan for the service layer. Identify coupling issues, propose the new structure, and list the steps to migrate without breaking existing functionality." |
| "Add rate limiting" | "Plan the implementation of per-user rate limiting. Cover: where to add middleware, storage mechanism, config options, and how to test it." |
| "Migrate to TypeScript" | "Plan the migration of this JavaScript project to TypeScript. List files in priority order, identify risky areas, and outline the incremental steps." |

## Response Handling

- Return the `cursor_agent` plan output **exactly as received**.
- Do not summarize, condense, or rewrite the plan.
- After returning the plan, offer the user the option to proceed with implementation using `cursor-develop`.

Suggested follow-up message (after returning the plan verbatim):

```text
The plan above was produced by Cursor Agent. 
Would you like to proceed with the implementation? 
I can run the development step now (cursor-develop skill).
```

## Typical Workflow

### Workflow 1: Feature design

User: "I want to add email notifications to the order system."

1. Call `cursor_agent` with `mode: plan` and prompt:
   `"Design a plan to add email notification support to the order system. Include: trigger points, email service integration options, template management, retry logic, and required config changes."`
2. Return the plan verbatim.
3. Ask user if they want to proceed with implementation.

---

### Workflow 2: Plan-first gate (auto-downgrade)

User: "Implement the new user profile page."

Plugin policy downgrades the request to plan mode (project not yet approved).

1. Inform the user: "The plan-first gate is active for this project. Running a plan step first..."
2. Call `cursor_agent` with `mode: plan` and prompt derived from the user's request:
   `"Plan the implementation of the new user profile page. Include: UI components needed, API endpoints required, data model changes, and integration with the auth system."`
3. Return the plan verbatim.
4. Inform the user: "Plan complete. The project is now approved for development. Reply to proceed with implementation."

---

### Workflow 3: Architecture exploration before refactor

User: "I want to refactor how we handle database connections."

1. Call `cursor_agent` with `mode: plan` and prompt:
   `"Analyze the current database connection handling approach. Identify problems. Design a better approach using connection pooling and centralized config. List specific files to change."`
2. Return the plan verbatim.
3. Offer to implement when ready.

---

## Notes

- `mode: plan` does not start a development session and does not modify any files.
- The plan output may include file paths, code snippets, and change lists — these are proposals only.
- After a successful plan run, the plan-first gate is cleared for this project. The next development call (`cursor-develop`) will run in agent mode.
- Use project key `workspace` if no explicit project name is given.

## Quick Reference

| Parameter | Value |
|---|---|
| Tool | `cursor_agent` |
| Mode | `plan` |
| File changes | None (planning only) |
| Plan gate | Clears the gate on success |
| Typical next step | `cursor-develop` |
