---
name: cursor-preflight
description: Cursor CLI tool availability check. Use before the first cursor_cli call in a session, or when cursor_cli returns a tool-not-found or permission error. Verifies the tool is registered, the target project exists, and Cursor CLI is reachable. Do NOT run openclaw config or gateway restart commands from inside a sandbox.
---

# Cursor CLI Preflight Check

> This skill only determines whether `cursor_cli` is available and properly configured in the current session.
> Inside an agent sandbox, **do not** run host-level commands like `openclaw config ...` or `openclaw gateway restart`.

> ⚠️ **Path and stop rules**:
> - Read this skill only using the exact absolute path provided in `<available_skills>` or `skillsSnapshot`.
> - Do not guess alternative paths such as `/workspace/.openclaw/skills/...` or use `exec` + `ls/find` to search for it.
> - If `cursor_cli` returns `unknown tool` or `tool not available`, the issue is host-side plugin registration — stop retrying and tell the user to fix it on the host.

## When to Use

Use this skill in these situations:

1. First time you are about to call `cursor_cli` in the current session.
2. `cursor_cli` returns `unknown tool`, `tool not available`, `not permitted`, or `permission denied`.
3. You suspect the Cursor CLI CLI is not installed or the plugin is not loaded.

If `cursor_cli` has already been called successfully in the current session, skip this skill.

## What Proper Configuration Looks Like

`cursor_cli` availability depends on **host-side OpenClaw plugin configuration**, not anything the agent sandbox can change dynamically.

Therefore:

- You can proceed with `cursor_cli` if: the tool already appears in the current session's available tools list, or it was called successfully earlier in this session.
- You must NOT: run `openclaw config get/set` or `openclaw plugins ...` from inside the sandbox.
- If the tool is unavailable, stop retrying and clearly tell the user or admin to fix it on the host.

## Check Flow

### Case A: `cursor_cli` is available

Either of these conditions confirms availability:

- `cursor_cli` appears in the current session's tool list.
- `cursor_cli` was already called successfully earlier in this session.

Action: proceed directly with the original task; no further checks needed.

### Case B: Tool permission / not-found error

If you receive errors like:

- `unknown tool: cursor_cli`
- `tool not available`
- `not permitted`
- `permission denied`

This means the **host-side plugin is not loaded or the tool is not whitelisted**.

Action:

- Stop retrying immediately.
- Tell the user clearly: the `cursor-agent` plugin needs to be installed and enabled in the host OpenClaw configuration, and the gateway may need to be restarted.
- Do not attempt to fix this from inside the sandbox.

Suggested message to user:

```text
The cursor_cli tool is not available in this session. This must be fixed on the host:
1. Ensure the cursor-agent plugin is installed: openclaw plugins install -l <plugin-dir>
2. Enable it: openclaw config set plugins.entries.cursor-cli.enabled true
3. Restart the gateway: openclaw gateway restart
I cannot perform these steps from inside the agent sandbox.
```

### Case C: Cursor CLI not found

If `cursor_cli` is callable but returns an error indicating Cursor CLI binary is not found:

```text
Cursor CLI CLI not found
```

This means the Cursor CLI is not installed on the host, or the `agentPath` config is wrong.

Action:

- Stop and tell the user to install Cursor CLI on the host machine.
- Provide the install command: `npm install -g @cursor/agent` or the relevant install method.

### Case D: Project not found

If `cursor_cli` returns `Project not found: <name>`:

- The requested project key is not configured and does not match `<workspace>/projects/<name>`.
- Advise the user to use `workspace` as the project key (maps to `<agent-workspace>/projects`) or configure a named project in the plugin config.

## Decision Table

| Symptom | Conclusion | Action |
|---|---|---|
| `cursor_cli` already called successfully | Preflight passed | Continue original task |
| `unknown tool` / `tool not available` | Host plugin not loaded | Stop, tell user to fix host config |
| `Cursor CLI CLI not found` | Cursor CLI not installed | Stop, tell user to install CLI |
| `Project not found: X` | Project key not mapped | Tell user to use `workspace` key or configure the project |
| Other runtime error | Execution failure | Handle per specific error message |

## Key Constraints

1. This skill is for **diagnosis and routing** only — it does not auto-repair host configuration.
2. Never run host-level OpenClaw commands from the sandbox.
3. Once confirmed as a host-side issue, stop retrying and give a clear conclusion to the user.
