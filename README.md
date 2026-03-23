# OpenClaw Cursor CLI Plugin

Invoke local Cursor CLI from OpenClaw, with policy-controlled plan-first delivery flow.

English | [Chinese](README_CN.md)

> **This is an OpenClaw Plugin, not a Skill.**
> Install it with `openclaw plugins install`, not by copying to `~/.openclaw/skills/`.
> Installing to the skills folder will not register the `/cursor` command or `cursor_cli` tool.

---

## Overview

`OpenClaw Cursor CLI Plugin` is an OpenClaw Gateway plugin that bridges chat tasks to local Cursor CLI execution.

It provides:

- direct command invocation via `/cursor`
- optional tool-based invocation via `cursor_cli`
- policy gate enforcement (plan-first for development tasks)
- session and project-scoped state persistence
- transparent execution output and validation reporting

---

## Core Workflow

For development-class tasks, recommended workflow is:

1. receive OpenClaw task
2. generate plan first
3. implement changes
4. run tests/checks
5. return completion report to OpenClaw

---

## Features

- **Direct `/cursor` command**: explicit user-triggered invocation
- **`cursor_cli` tool path**: PI Agent fallback/automation path
- **Three execution modes**: `ask`, `plan`, `agent`
- **Policy controls**: mapped-project requirement, allow/deny task patterns, mode downgrade
- **Plan-first gate**: development task forced to `plan` until project is approved
- **Session persistence**: resume by project/session state
- **Process safety**: concurrency control, timeout handling, graceful cleanup

---

## Install

### 1) Install Cursor CLI

macOS / Linux:

```bash
curl https://cursor.com/install -fsSL | bash
```

If `agent` is not found after install, add common binary paths to your shell profile:

```bash
echo 'export PATH="$HOME/.cursor/bin:$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

Windows PowerShell:

```powershell
irm https://cursor.com/install | iex
```

If `agent` is not found in a new PowerShell session, reopen terminal first, then verify.

Verify installation:

```bash
agent --version
```

### 2) Authenticate

```bash
agent login
```

Or set `CURSOR_API_KEY` for non-interactive environments:

```bash
export CURSOR_API_KEY="your-api-key"
```

Quick sanity check before using this plugin:

```bash
agent -p "Reply with: CLI ready" --mode ask
```

### 3) Install Plugin into OpenClaw

> **Important:** This is a Plugin. Use `openclaw plugins install`, not `~/.openclaw/skills/`.
> The skills directory is for `SKILL.md`-based skills only and will not register the `/cursor` command or `cursor_cli` tool.

**Recommended: link install from local directory (no copy, easiest to update)**

```bash
# Build first
cd /path/to/openclaw-cursor-skill
npm ci && npm run build

# Link-install into OpenClaw as a plugin
openclaw plugins install -l /path/to/openclaw-cursor-skill

# Restart Gateway
openclaw gateway restart

# Verify plugin is registered
openclaw plugins list
openclaw plugins inspect cursor-cli
```

**Alternative: tgz package install**

```bash
cd /path/to/openclaw-cursor-skill
npm ci && npm run build && npm pack
openclaw plugins install cursor-cli-0.1.0.tgz
openclaw gateway restart
```

**Alternative: manual `plugins.load.paths` config** (if CLI install is unavailable)

Add to `~/.openclaw/openclaw.json`, then restart Gateway:

```json
{
  "plugins": {
    "load": {
      "paths": ["/path/to/openclaw-cursor-skill"]
    }
  }
}
```

---

## Minimal Configuration

All config fields have built-in defaults declared in `openclaw.plugin.json` (`configSchema.properties.*.default`).
After installing the plugin, the minimum required entry in `~/.openclaw/openclaw.json` is just:

```json
{
  "plugins": {
    "entries": {
      "cursor-cli": {
        "enabled": true
      }
    }
  }
}
```

OpenClaw will automatically apply the following defaults without any explicit config:

| Field | Default |
|---|---|
| `defaultTimeoutSec` | `600` |
| `noOutputTimeoutSec` | `120` |
| `enableMcp` | `true` |
| `mcpApprovalMode` | `"approve"` |
| `enableAgentTool` | `true` |
| `enableTrust` | `false` |
| `allowAbsoluteProjectPath` | `false` |
| `allowAgentModeForCommand` | `false` |
| `allowAgentModeForTool` | `true` |
| `requireMappedProjectForAgent` | `true` |
| `enforcePlanBeforeDevelopment` | `true` |
| `verboseLogs` | `false` |
| `maxConcurrent` | `3` |
| `commandRequireAuth` | `true` |
| `toolDefaultMode` | `"agent"` |

Override only the fields you want to change. For example, to enable verbose logs for troubleshooting:

```json
{
  "plugins": {
    "entries": {
      "cursor-cli": {
        "enabled": true,
        "config": {
          "verboseLogs": true
        }
      }
    }
  }
}
```

Default project scope (no `projects` config needed):

- The plugin auto-infers project key `workspace` -> `<current-agent-workspace>/projects`.
- This keeps each agent scoped to its own workspace root by default.

Override `projects` only when you need custom path aliases:

```json
{
  "plugins": {
    "entries": {
      "cursor-cli": {
        "enabled": true,
        "config": {
          "projects": {
            "backend": "/workspace/projects/backend"
          }
        }
      }
    }
  }
}
```

---

## Usage

### `/cursor` format

```text
/cursor <project> [options] <prompt>
```

Options:

- `--mode <ask|plan|agent>`
- `--continue`
- `--resume <chatId>`
- `--model <model>`
- `--reset-plan-gate`

Examples:

```bash
/cursor workspace --mode ask explain current project architecture
/cursor workspace --mode plan design cache strategy
/cursor workspace --mode agent implement auth token refresh
/cursor workspace --reset-plan-gate
```

---

## Completion Report Contract

For development tasks, final response should include:

- `Status`: `SUCCESS | PARTIAL | BLOCKED`
- task summary
- changed files and key modifications
- validation commands with outcomes
- OpenClaw handoff readiness

---

## Logging and Troubleshooting

This plugin emits runtime logs via `console.log` / `console.warn` / `console.error`.
In OpenClaw deployments, these logs are captured by the default gateway log output.

Set `verboseLogs: true` to enable detailed lifecycle logs. Keep `verboseLogs: false` for normal operation; only warnings/errors will be emitted.

Use logs to locate where execution stopped:

- command/tool request received (resolved project, requested mode)
- policy downgrade reason (`ask/plan/agent` transitions)
- process spawn details (run id, pid, timeout settings)
- timeout / abort / force-kill escalation
- final completion or classified failure reason

---

## Architecture

```text
src/
├── index.ts            # plugin entry, /cursor command registration
├── tool.ts             # cursor_cli tool entry
├── policy.ts           # mode + plan gate policy decisions
├── runner.ts           # Cursor CLI process invocation and stream handling
├── parser.ts           # stream-json event parsing
├── formatter.ts        # result formatting
├── session-store.ts    # session and project approval persistence
├── process-registry.ts # process lifecycle and concurrency management
└── types.ts            # shared types
```

Invocation paths:

- user uses `/cursor` -> command handler -> policy -> runner
- user uses regular chat -> PI Agent may call `cursor_cli` -> policy -> runner

---

## Development

```bash
npm install
npm run dev
npm run build
npm test
```

---

## Upgrade Plugin

### Link install mode (recommended)

If installed via `openclaw plugins install -l <dir>` or `plugins.load.paths`:

```bash
cd /path/to/openclaw-cursor-skill
git pull
npm ci
npm run build
openclaw gateway restart
```

### tgz package mode

If installed via `.tgz`:

```bash
cd /path/to/openclaw-cursor-skill
git pull
npm ci
npm run build
npm pack
openclaw plugins install cursor-agent-<new-version>.tgz
openclaw gateway restart
```

---

## Release Readiness

Before publishing, run:

- [Release Checklist](docs/release-checklist.md)

---

## License

[Apache-2.0](LICENSE)
