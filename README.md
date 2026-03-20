# Cursor Agent — OpenClaw Plugin

Invoke local Cursor Agent CLI from OpenClaw, with policy-controlled plan-first delivery flow.

English | [中文](README_CN.md)

---

## Overview

`cursor-agent` is an OpenClaw Gateway plugin that bridges chat tasks to local Cursor Agent CLI execution.

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

Windows PowerShell:

```powershell
irm https://cursor.com/install | iex
```

Verify:

```bash
agent --version
```

### 2) Authenticate

```bash
agent login
```

or set `CURSOR_API_KEY`.

### 3) Load Plugin into OpenClaw

Source path mode:

```json
{
  "plugins": {
    "load": {
      "paths": ["/path/to/cursor-agent"]
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
          "projects": {
            "my-project": "/abs/path/to/my-project"
          },
          "defaultTimeoutSec": 600,
          "noOutputTimeoutSec": 120,
          "enableMcp": true,
          "enableAgentTool": true,
          "enforcePlanBeforeDevelopment": true
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
/cursor my-project --mode ask explain auth architecture
/cursor my-project --mode plan design cache strategy
/cursor my-project --mode agent implement auth token refresh
/cursor my-project --reset-plan-gate
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

## Release Readiness

Before publishing, run:

- [Release Checklist](docs/release-checklist.md)

---

## License

[Apache-2.0](LICENSE)
