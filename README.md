# OpenClaw Cursor Skill

Invoke local Cursor Agent CLI from OpenClaw, with policy-controlled plan-first delivery flow.

English | [Chinese](README_CN.md)

---

## Overview

`OpenClaw Cursor Skill` is an OpenClaw Gateway plugin that bridges chat tasks to local Cursor Agent CLI execution.

It provides:

- direct command invocation via `/cursor`
- optional tool-based invocation via `cursor_agent`
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

Project-level command conventions:

- `/deliver`: default delivery loop (plan -> implement -> validate -> report)
- `/explore`: investigation only, no feature implementation

Note: runtime plugin entry points remain `/cursor` and `cursor_agent`.

---

## Features

- **Direct `/cursor` command**: explicit user-triggered invocation
- **`cursor_agent` tool path**: PI Agent fallback/automation path
- **Three execution modes**: `ask`, `plan`, `agent`
- **Policy controls**: mapped-project requirement, allow/deny task patterns, mode downgrade
- **Plan-first gate**: development task forced to `plan` until project is approved
- **Session persistence**: resume by project/session state
- **Process safety**: concurrency control, timeout handling, graceful cleanup

---

## Install

### 1) Install Cursor Agent CLI

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

### 3) Load Plugin into OpenClaw

Source path mode (set this to the real plugin directory on your OpenClaw host):

```json
{
  "plugins": {
    "load": {
      "paths": ["/workspace/plugins/openclaw-cursor-skill"]
    }
  }
}
```

Package mode:

```bash
npm ci && npm run build && npm pack
openclaw plugins install cursor-agent-0.1.0.tgz
```

---

## Minimal Configuration

```json
{
  "plugins": {
    "entries": {
      "cursor-agent": {
        "enabled": true,
        "config": {
          "defaultTimeoutSec": 600,
          "noOutputTimeoutSec": 120,
          "enableMcp": true,
          "enableAgentTool": true,
          "allowAbsoluteProjectPath": false,
          "requireMappedProjectForAgent": true,
          "enforcePlanBeforeDevelopment": true,
          "verboseLogs": false
        }
      }
    }
  }
}
```

Default project scope (no `projects` config needed):

- The plugin auto-infers project key `workspace` -> `<current-agent-workspace>/projects`.
- This keeps each agent scoped to its own workspace root by default.

Optional override (`projects`) is only needed when you want custom aliases:

```json
{
  "projects": {
    "backend": "/workspace-agent-a/projects/backend",
    "manager": "/workspace-agent-a/projects/manager"
  }
}
```

If you need arbitrary absolute paths, set `allowAbsoluteProjectPath: true` (less strict).

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

For delivery tasks, final response should include:

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
├── tool.ts             # cursor_agent tool entry
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
- user uses regular chat -> PI Agent may call `cursor_agent` -> policy -> runner

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

### Source Path Mode (development)

If OpenClaw loads this plugin from `plugins.load.paths`, update flow is:

```bash
cd /path/to/openclaw-cursor-skill
git pull
npm run build
```

Then restart OpenClaw Gateway (or reload plugins if your deployment supports hot reload).

### tgz Package Mode (release)

If plugin was installed via `.tgz`, update flow is:

```bash
cd /path/to/openclaw-cursor-skill
npm version patch
npm run build
npm pack
openclaw plugins install cursor-agent-<new-version>.tgz
```

Then restart OpenClaw Gateway (or reload plugins).

---

## Release Readiness

Before publishing, run:

- [Release Checklist](docs/release-checklist.md)

---

## License

[Apache-2.0](LICENSE)
