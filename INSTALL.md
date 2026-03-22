# Installation

This is an OpenClaw **Plugin**, not a Skill.

## Required install method

```bash
# 1. Build
cd /path/to/openclaw-cursor-skill
npm ci && npm run build

# 2. Install as a plugin (link mode — no copy needed)
openclaw plugins install -l /path/to/openclaw-cursor-skill

# 3. Restart Gateway
openclaw gateway restart

# 4. Verify
openclaw plugins list
openclaw plugins inspect cursor-cli
```

## Why not ~/.openclaw/skills/?

Placing this directory in `~/.openclaw/skills/` only loads `SKILL.md` files.
It will NOT register the `/cursor` command or `cursor_cli` tool.
The plugin runtime (`dist/index.js`) only loads via `openclaw plugins install`.

## Minimal openclaw.json entry (all other fields have defaults)

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

## Update

```bash
cd /path/to/openclaw-cursor-skill
git pull
npm ci && npm run build
openclaw gateway restart
```
