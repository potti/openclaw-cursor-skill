# OpenClaw Agent — cursor_cli Usage Instructions

Copy the content below into your OpenClaw agent's AGENTS.md file
(e.g. the agent workspace AGENTS.md, or your project-level AGENTS.md).

---

## START COPY HERE ↓

## MANDATORY: Use cursor_cli for ALL code work (never use your own LLM for repo files)

You have the `cursor_cli` MCP tool. It runs the same Cursor CLI as the `/cursor`
slash command. Treat it as follows:

| What you want (same as slash command) | How to call `cursor_cli` |
|----------------|---------------------------|
| Read-only Q&A (`/cursor … ask …`) | `mode: "ask"` |
| Plan only (`/cursor … plan …`) | `mode: "plan"` |
| Implement changes (`/cursor … agent …`) | `mode: "agent"` |

- `project`: usually `"workspace"` (maps to the agent's project directory)
- `prompt`: concrete, with file paths and requirements

### Rule 1: Classify the user task first

1. **Inquiry / analysis-only** — questions, explanations, code review without edits,
   tracing bugs, “what does X do”, “how does Y work” → **inquiry flow** (see below).
2. **Development** — new feature, bugfix that changes code, refactor, tests,
   migrations → **development flow** (see below).

If you are unsure, ask one short clarifying question or default to **inquiry**
with `ask` when no code change is clearly requested.

---

### Inquiry flow (equivalent to `/cursor workspace ask …`)

- Call `cursor_cli` with **`mode: "ask"`** only.
- Do **not** switch branches or run the development flow for pure questions.

Example (same intent as `/cursor workspace ask list how routing is wired`):

- `project`: `"workspace"`
- `mode`: `"ask"`
- `prompt`: full user question with context (paths, modules, error messages).

---

### Development flow (branch → plan → implement)

Use this for any task that will change the repository.

#### 1) Branch name

Derive a short English slug from the feature or bugfix:

- `feature_<slug>` — e.g. `feature_health_check`, `feature_funding_rate_okx`
- Use lowercase letters, digits, `_` only. No spaces.
- If the user gave a name, normalize it to this pattern.

#### 2) Step A — switch branch (Git)

Before planning or coding, ensure work happens on **`feature_<slug>`**:

- `cursor_cli` with **`mode: "agent"`**
- `prompt` must **only** handle Git, e.g.:

  “**Implement** this git-only step: from the default branch (`main` or
  `master`), fetch latest, create branch `feature_<slug>` if missing or checkout
  it if it exists. Do not modify application source files except for merge
  conflicts.”

(Start the prompt with **Implement** so the host plugin keeps `agent` mode;
branch-only text without a development keyword may be downgraded to `plan`.)

If Git is not available or the command fails, stop and report verbatim.

#### 3) Step B — plan (equivalent to `/cursor workspace plan …`)

- `cursor_cli` with **`mode: "plan"`**
- `prompt`: full technical plan request — scope, files to touch, APIs,
  data model, migration, tests, rollout.

Present the plan output to the user. If the plugin enforces plan-first gate,
follow its output (often a plan on the first `agent` call — treat like Step B).

#### 4) Step C — implement and test (equivalent to `/cursor workspace agent …`)

- `cursor_cli` with **`mode: "agent"`**
- `prompt`: implement the agreed plan, run tests, fix failures. Stay on
  `feature_<slug>`.

#### 5) Step D — optional verification

- `cursor_cli` with **`mode: "ask"`** to review what changed or to answer
  follow-up questions.

---

### Output handling

Return `cursor_cli` output **verbatim** unless the user explicitly asks for a
short summary after a long run.

---

### End-to-end example (development)

User: “Add `/healthz` to the API.”

1. **Slug**: `health_check` → branch `feature_health_check`
2. **Step A (agent)**: git branch only — create/checkout `feature_health_check`
3. **Step B (plan)**: plan the endpoint, middleware, tests
4. **Step C (agent)**: implement + run tests on `feature_health_check`
5. **Step D (ask, optional)**: quick review of the diff

## END COPY HERE ↑

---

## Notes for plugin maintainers

- `cursor_cli` is registered by the `cursor-cli` OpenClaw plugin (`dist/index.js`)
- The `/cursor` slash command is an alternative entry point for manual testing
- Gateway logs use `[cursor-cli]` prefix; set `CURSOR_AGENT_LOG_LEVEL=debug` for verbose output
- `project: "workspace"` resolves to `<agent-workspace>/projects` — each agent is isolated
