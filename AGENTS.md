# cursor-cli Plugin — OpenClaw AGENTS.md Reference

This file shows the recommended snippet to paste into your **OpenClaw project `AGENTS.md`**
(typically `~/.openclaw/projects/<your-project>/AGENTS.md` or the workspace-level `AGENTS.md`)
so the agent explicitly knows when and how to use the `cursor_cli` tool.

---

## Paste this block into your project AGENTS.md

```markdown
## Code Development — cursor-cli

You have access to the `cursor_cli` MCP tool. It invokes the local Cursor CLI to read, plan,
and modify code in the project workspace.

### When to use cursor_cli

| User intent | Tool call |
|-------------|-----------|
| Understand code, trace a bug, explain logic | `cursor_cli` with `mode: ask` |
| Design a feature, plan an implementation | `cursor_cli` with `mode: plan` |
| Implement a feature, fix a bug, write tests | `cursor_cli` with `mode: agent` |
| Re-plan after the first plan is stale | `cursor_cli` with `mode: plan` + `resetPlanGate: true` |

**Do NOT** use your own LLM to read or modify project files directly.
Always go through `cursor_cli` for anything related to the codebase.

### Required parameters

- `project` — the project key. Use `workspace` if no explicit key is configured.
  This maps to `<agent-workspace>/projects` on the host.
- `prompt` — a specific, actionable description of what to analyze or implement.
- `mode` — one of `ask` | `plan` | `agent` (default: `agent`).

### Plan-first policy

If `enforcePlanBeforeDevelopment` is enabled on the host (default: on), the first
`agent`-mode call for a project is automatically downgraded to `plan` mode.
The plugin returns a written plan. After you confirm the plan looks correct,
call `cursor_cli` again with `mode: agent` — the gate is now open for this project.

To reset the gate (start over with a new plan):

- project: workspace
- mode: plan
- resetPlanGate: true
- prompt: <describe what needs replanning>

### Output handling

Return `cursor_cli` output **verbatim** — do NOT summarize, rephrase, or add commentary.
If the output is a plan (gate triggered), present it to the user and ask for confirmation
before proceeding with implementation.

### Example — ask

- project: workspace
- mode: ask
- prompt: Explain how the funding rate calculation works in internal/services/funding_rate_service.go

### Example — plan

- project: workspace
- mode: plan
- prompt: We need to replace the Binance funding rate source with OKX and Bybit. Design the approach: what to remove, what to add, interface changes, and migration steps.

### Example — implement

- project: workspace
- mode: agent
- prompt: Implement the plan: remove Binance funding rate client, add OKX and Bybit clients following the same interface, update the aggregation logic, add unit tests.
```

---

## Notes

- **`cursor_cli` is a Plugin tool**, not a Skill. It appears in the session tool list when
  the `cursor-cli` plugin is installed and enabled in OpenClaw.
- If `cursor_cli` does not appear in the tool list, the plugin is not loaded. Ask the user to
  run `openclaw plugins install -l <plugin-dir>` and restart the gateway.
- The `project: workspace` key resolves to `<agent-workspace>/projects` on the host.
  Each agent workspace is isolated — agents cannot accidentally modify each other's files.
- Gateway logs show `[cursor-cli]` prefixed entries for debugging.
  Set `CURSOR_AGENT_LOG_LEVEL=debug` on the host for verbose output.
