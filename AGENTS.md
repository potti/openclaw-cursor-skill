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

#### 5) Step E — named progress poll (recurring until done)

**When:** As soon as the task is classified as **development** and the feature
**slug** is known (after **Rule 1** + **§1 Branch name**). Register the poll
**before** Step C if possible, so the first tick can fire while work runs.

**Name:** `cursor_progress_<slug>` (same `<slug>` as the branch, without the
`feature_` prefix is OK, e.g. `cursor_progress_health_check`).

**Interval (pick one):**

| Task size | Interval |
|-----------|----------|
| Small (single module, few files, local change) | **3 minutes** |
| Large (many packages, migrations, integration, unclear scope) | **5 minutes** |

**What each tick does:**

1. Obtain the **latest Cursor CLI outcome** for this feature, using one of:
   - The **last completed** `cursor_cli` tool result in this session (if any), **or**
   - A fresh **`cursor_cli`** call with **`mode: "ask"`**, **`project`**: `"workspace"`,
     **do not** set `newSession` (default **resumes** the Cursor session for that project),
     **`prompt`**: e.g. *“Summarize current progress on `feature_<slug>`: files touched,
     tests run, errors, and what remains. If nothing is in progress, say COMPLETE.”*
   - If your OpenClaw host exposes **gateway logs**, you may append relevant
     `[cursor-cli]` lines as extra context (optional).

2. **Post** that text into the **same dialog / channel** as the user (short
   header line + verbatim body).

3. **Completion:** If the summary indicates work is finished (tests OK, user
   confirmed, or the ask output says **COMPLETE** / no further work), **delete
   or cancel** the recurring task `cursor_progress_<slug>` immediately and
   tell the user the poll stopped.

4. **Failure:** If `cursor_cli` errors, post the error once; cancel the poll if
   the task is aborted.

**How to register the schedule:** Use whatever your OpenClaw / channel stack
provides (built-in scheduler, cron hook, reminder bot, etc.). If **no**
scheduler exists, simulate by telling the user you will **re-check every N
minutes** until done (and do so when the next assistant turn is allowed).

**Limitation:** A **single** long `cursor_cli` `agent` call **blocks** until the
Cursor CLI process exits — there is no partial result inside that one call.
Split large work into **smaller agent prompts** or accept that polls mainly
reflect **between** calls or **after** each call returns.

#### 6) Step D — optional verification

- `cursor_cli` with **`mode: "ask"`** to review what changed or to answer
  follow-up questions.

#### 7) Step F — push branch and merge into remote `test`

After tests pass, perform Git delivery using `cursor_cli` with **`mode: "agent"`**:

1. Ensure current branch is `feature_<slug>`.
2. Commit all intended changes with a clear message.
3. Push `feature_<slug>` to remote.
4. Update local `test` from remote (`fetch` + checkout/pull).
5. Merge `feature_<slug>` into local `test`.
6. Resolve conflicts if any, re-run required tests.
7. Push merged `test` branch to remote.
8. Report final commit SHAs (feature head + test head) to the user.

If merge/push fails, report the exact error and stop (do not force-push unless
the user explicitly requests it).

---

### Output handling

Return `cursor_cli` output **verbatim** unless the user explicitly asks for a
short summary after a long run.

---

### End-to-end example (development)

User: “Add `/healthz` to the API.”

1. **Slug**: `health_check` → branch `feature_health_check`
2. **Register poll** `cursor_progress_health_check` every **3 min** (small task)
3. **Step A (agent)**: git branch only — create/checkout `feature_health_check`
4. **Step B (plan)**: plan the endpoint, middleware, tests
5. **Step C (agent)**: implement + run tests on `feature_health_check`
6. **Poll ticks**: post latest ask-summary to the dialog until **COMPLETE**
7. **Cancel** `cursor_progress_health_check`
8. **Step D (ask, optional)**: quick review of the diff
9. **Step F (agent)**: push `feature_health_check`, merge into remote `test`, push `test`

## END COPY HERE ↑

---

## Notes for plugin maintainers

- `cursor_cli` is registered by the `cursor-cli` OpenClaw plugin (`dist/index.js`)
- The `/cursor` slash command is an alternative entry point for manual testing
- Gateway logs use `[cursor-cli]` prefix; set `CURSOR_AGENT_LOG_LEVEL=debug` for verbose output
- `project: "workspace"` resolves to `<agent-workspace>/projects` — each agent is isolated
- **Progress polling (Step E)** is an agent/AGENTS convention: OpenClaw must supply a
  real timer (or the agent manually re-enters on a schedule). This repo does not yet
  implement a gateway cron for `cursor_progress_*`.
