---
name: cursor-ask
description: Code analysis and Q&A skill using Cursor Agent in read-only ask mode. Use when the user wants to understand code, get an explanation, trace a bug, review logic, answer "what does this do", "why does this fail", "how does X work", "find all usages of Y", or any question about a codebase that does not require making file changes. Does NOT modify files.
---

# Code Analysis and Q&A (Ask Mode)

> `cursor_agent` is an MCP tool. All code analysis operations go through this tool with `mode: ask`.

> ⚠️ **Prerequisite**: If this is the first `cursor_agent` call in this session and you are not sure the tool is available, follow the `cursor-preflight` skill first.

> ⚠️ **Path and stop rules**:
> - Read this skill only using the exact absolute path from `<available_skills>` or `skillsSnapshot`.
> - Do not use `exec` + `ls/find` to explore project paths — the project scope is `<agent-workspace>/projects` by default.
> - If `cursor_agent` returns `Project not found`, use project key `workspace` (maps to `<agent-workspace>/projects`) or ask the user for the correct project name.
> - Results from `cursor_agent` are verbatim — **do NOT summarize, rephrase, or add your own commentary**.

## When to Use

Trigger this skill when the user's request is about **understanding code** without changing it:

- "What does this function do?"
- "Why is this failing?"
- "How does the authentication flow work?"
- "Find all places where X is called"
- "Explain the data model"
- "Review this code and tell me what it does"
- "What tests exist for module Y?"
- "What are the potential issues in this file?"

Do **not** use this skill when the user wants changes made to files — use `cursor-develop` instead.

## Tool Call

Use the `cursor_agent` tool with:

- `project`: `workspace` (or the configured project key, e.g. `my-api`)
- `prompt`: a specific question about the code
- `mode`: `ask`

**`mode: ask` is read-only** — Cursor Agent will not modify any files.

## Prompt Construction Guidelines

Write the prompt to be specific and actionable for Cursor Agent:

| User request | Example prompt |
|---|---|
| "What does UserService do?" | "Explain what the UserService class does, its public methods, and how it interacts with the database." |
| "Why does login fail?" | "Trace the login flow from the API endpoint to the auth check. Identify what could cause a 401 response." |
| "How is config loaded?" | "Describe how application configuration is loaded at startup. Which files are read and in what order?" |
| "Find all API endpoints" | "List all HTTP API endpoint definitions in this project with their methods and paths." |
| "Review this module" | "Review src/payments/processor.ts and explain its logic, potential edge cases, and any obvious issues." |

## Response Handling

- Return the `cursor_agent` output **exactly as received** — do not summarize or interpret.
- If the result is very long, you may prefix it with a brief one-line label like "Here is the Cursor Agent analysis:", then include the full content.
- Never trim, paraphrase, or add conclusions that are not in the output.

## Typical Workflow

### Workflow 1: Direct code question

User: "What does the `processPayment` function do?"

1. Call `cursor_agent` with `mode: ask` and prompt: `"Explain what the processPayment function does, its parameters, return value, and any side effects."`
2. Return the result verbatim.

---

### Workflow 2: Bug investigation

User: "Why does the order total calculation give wrong results?"

1. Call `cursor_agent` with `mode: ask` and prompt: `"Trace the order total calculation logic. Find where the total is computed and identify any conditions that could cause incorrect results."`
2. Return the result verbatim.
3. If the user then wants a fix applied, switch to `cursor-develop`.

---

### Workflow 3: Codebase exploration

User: "What's the overall architecture of this backend?"

1. Call `cursor_agent` with `mode: ask` and prompt: `"Describe the overall architecture of this backend: main modules, how they communicate, entry points, and data flow."`
2. Return the result verbatim.

---

## Notes

- `mode: ask` does not start a development session and does not trigger the plan-first gate.
- Project scope is limited to `<agent-workspace>/projects` — `cursor_agent` cannot access files outside this boundary.
- If the user asks about a specific file, include the file path in the prompt (relative to the project root).
- Use project key `workspace` if no explicit project name is given and no projects are pre-configured.

## Quick Reference

| Parameter | Value |
|---|---|
| Tool | `cursor_agent` |
| Mode | `ask` |
| File changes | None (read-only) |
| Plan gate | Not triggered |
| Session reuse | Automatic (same project continues previous session) |
