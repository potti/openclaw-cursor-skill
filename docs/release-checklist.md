# Release Checklist

Use this checklist before publishing a new `cursor-agent` version.

## 1) Workflow Consistency

- `AGENTS.md` reflects current project mission and command conventions.
- `/.cursor/commands/` contains only active commands (`/deliver`, `/explore`).
- No stale OpenSpec-specific workflow files remain in active usage.

## 2) Runtime/Config Consistency

- `src/types.ts` config fields are aligned with `openclaw.plugin.json` schema.
- `openclaw.plugin.json` descriptions and UI hints match current behavior.
- `README.md` and `README_CN.md` are aligned with actual runtime entry points (`/cursor`, `cursor_agent`).

## 3) Quality Gates

- `npm test` passes.
- Policy behavior is verified:
  - development task without approval -> forced `plan`
  - after successful plan -> allowed `agent`
  - reset gate -> forced `plan` again

## 4) Packaging

- `npm run build` succeeds.
- `openclaw.plugin.json` version matches `package.json` version.
- `npm pack` artifact generated and installable.

## 5) Handoff Validation

- Final delivery report format includes:
  - `Status: SUCCESS | PARTIAL | BLOCKED`
  - changed files summary
  - validation command results
  - OpenClaw handoff readiness
