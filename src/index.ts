import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import { runCursorAgent } from "./runner.js";
import { formatRunResult } from "./formatter.js";
import { ensureShutdownHook, setMaxConcurrent } from "./process-registry.js";
import { createCursorAgentTool } from "./tool.js";
import { resolveAgentBinary } from "./resolve-binary.js";
import { resolveProjectPath } from "./project-path.js";
import { decideExecutionPolicy } from "./policy.js";
import { SessionStore } from "./session-store.js";
import type { CursorAgentConfig, ParsedCommand, ResolvedBinary } from "./types.js";

const PLUGIN_ID = "cursor-agent";

const DEFAULT_TIMEOUT_SEC = 600;
const DEFAULT_NO_OUTPUT_TIMEOUT_SEC = 120;
const DEFAULT_ENABLE_MCP = true;
const DEFAULT_MODE = "ask" as const;

/** Auto-detect agent command path */
function detectAgentPath(): string | null {
  try {
    const cmd = process.platform === "win32" ? "where agent" : "which agent";
    const result = execSync(cmd, { encoding: "utf-8", timeout: 5000 }).trim();
    const first = result.split(/\r?\n/)[0]?.trim();
    if (first) return first;
  } catch { /* ignore */ }

  const home = process.env.HOME || process.env.USERPROFILE || "";
  if (!home) return null;

  if (process.platform === "win32") {
    const candidates = [
      resolve(home, "AppData/Local/cursor-agent/agent.cmd"),
      resolve(home, ".cursor/bin/agent.cmd"),
    ];
    for (const p of candidates) {
      if (existsSync(p)) return p;
    }
  } else {
    const candidates = [
      resolve(home, ".cursor/bin/agent"),
      resolve(home, ".local/bin/agent"),
    ];
    for (const p of candidates) {
      if (existsSync(p)) return p;
    }
  }

  return null;
}

/**
 * Parse /cursor command arguments.
 *
 * Format:
 *   /cursor <project> <prompt>
 *   /cursor <project> --continue <prompt>
 *   /cursor <project> --resume <chatId> <prompt>
 *   /cursor <project> --mode ask|plan|agent <prompt>
 *   /cursor <project> --model <model> <prompt>
 *   /cursor <project> --reset-plan-gate [<prompt>]
 */
export function parseCommandArgs(args: string): ParsedCommand | { error: string } {
  if (!args?.trim()) {
    return { error: "Usage: /cursor <project> <prompt>\n\nOptions:\n  --continue            Continue previous session\n  --resume <chatId>     Resume a specific session\n  --mode <mode>         Set mode (agent|ask|plan)\n  --model <model>       Specify model (e.g. claude-4-sonnet)\n  --reset-plan-gate     Reset plan-first gate for this project" };
  }

  const tokens = tokenize(args.trim());
  if (tokens.length === 0) {
    return { error: "Missing project parameter" };
  }

  const project = tokens[0]!;
  let mode: "agent" | "ask" | "plan" = DEFAULT_MODE;
  let model: string | undefined;
  let continueSession = false;
  let resumeSessionId: string | undefined;
  let resetPlanGate = false;
  const promptParts: string[] = [];

  let i = 1;
  while (i < tokens.length) {
    const token = tokens[i]!;
    if (token === "--continue") {
      continueSession = true;
      i++;
    } else if (token === "--resume") {
      i++;
      if (i >= tokens.length) return { error: "--resume requires a chatId" };
      resumeSessionId = tokens[i]!;
      i++;
    } else if (token === "--mode") {
      i++;
      if (i >= tokens.length) return { error: "--mode requires a mode (agent|ask|plan)" };
      const m = tokens[i]! as "agent" | "ask" | "plan";
      if (!["agent", "ask", "plan"].includes(m)) {
        return { error: `Unsupported mode: ${m}, available: agent, ask, plan` };
      }
      mode = m;
      i++;
    } else if (token === "--model") {
      i++;
      if (i >= tokens.length) return { error: "--model requires a model name" };
      model = tokens[i]!;
      i++;
    } else if (token === "--reset-plan-gate") {
      resetPlanGate = true;
      i++;
    } else {
      promptParts.push(tokens.slice(i).join(" "));
      break;
    }
  }

  const prompt = promptParts.join(" ").trim();
  if (!prompt && !resetPlanGate) {
    return { error: "Missing prompt parameter" };
  }

  return { project, prompt, mode, model, continueSession, resumeSessionId, resetPlanGate };
}

/** Simple tokenizer that preserves spaces within quotes */
export function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inQuote: string | null = null;

  for (const ch of input) {
    if (inQuote) {
      if (ch === inQuote) {
        inQuote = null;
      } else {
        current += ch;
      }
    } else if (ch === '"' || ch === "'") {
      inQuote = ch;
    } else if (ch === " " || ch === "\t") {
      if (current) {
        tokens.push(current);
        current = "";
      }
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}

export default {
  id: PLUGIN_ID,
  configSchema: { type: "object" as const },

  register(api: any) {
    const cfg: CursorAgentConfig = api.pluginConfig ?? {};
    console.log(`[${PLUGIN_ID}] register start`);

    const agentPath = cfg.agentPath || detectAgentPath();
    if (!agentPath) {
      console.warn(`[${PLUGIN_ID}] Cursor Agent CLI not found, plugin disabled`);
      return;
    }

    // 解析底层 node + index.js，优先使用配置，其次自动解析
    let resolvedBinary: ResolvedBinary | undefined;
    if (cfg.agentNodeBin && cfg.agentEntryScript) {
      if (existsSync(cfg.agentNodeBin) && existsSync(cfg.agentEntryScript)) {
        resolvedBinary = { nodeBin: cfg.agentNodeBin, entryScript: cfg.agentEntryScript };
        console.log(`[${PLUGIN_ID}] using configured binary: ${cfg.agentNodeBin}`);
      } else {
        console.warn(`[${PLUGIN_ID}] configured agentNodeBin/agentEntryScript not found, falling back to auto-resolve`);
      }
    }
    if (!resolvedBinary) {
      resolvedBinary = resolveAgentBinary(agentPath) ?? undefined;
      if (resolvedBinary) {
        console.log(`[${PLUGIN_ID}] resolved binary: ${resolvedBinary.nodeBin} ${resolvedBinary.entryScript}`);
      } else {
        console.log(`[${PLUGIN_ID}] binary resolve failed, will invoke agentPath directly: ${agentPath}`);
      }
    }

    if (cfg.maxConcurrent) setMaxConcurrent(cfg.maxConcurrent);
    ensureShutdownHook();

    const projects = cfg.projects ?? {};
    const sessionStore = new SessionStore({
      path: cfg.sessionStatePath,
      ttlSec: cfg.sessionTtlSec,
      maxEntries: cfg.maxSessionEntries,
    });
    const projectNames = Object.keys(projects);
    const projectListStr = projectNames.length > 0
      ? `Available projects: ${projectNames.join(", ")}`
      : "No pre-configured projects. Enable allowAbsoluteProjectPath to use full paths";

    // ── Path 1: /cursor command (explicit invocation, bypasses PI Agent) ──
    api.registerCommand({
      name: "cursor",
      description: `Invoke Cursor Agent for code analysis and modification. ${projectListStr}`,
      acceptsArgs: true,
      requireAuth: cfg.commandRequireAuth ?? true,

      async handler(ctx: any) {
        const parsed = parseCommandArgs(ctx.args ?? "");

        if ("error" in parsed) {
          return { text: parsed.error };
        }

        const resolvedProject = resolveProjectPath(
          parsed.project,
          projects,
          cfg.allowAbsoluteProjectPath ?? false,
        );
        if (!resolvedProject) {
          return {
            text: `Project not found: ${parsed.project}\n${projectListStr}`,
          };
        }

        if (parsed.resetPlanGate) {
          sessionStore.clearApproval(resolvedProject.path);
          if (!parsed.prompt) {
            return { text: `Plan-first gate reset for project: ${parsed.project}` };
          }
        }

        const policy = decideExecutionPolicy(cfg, {
          source: "command",
          requestedMode: parsed.mode,
          prompt: parsed.prompt,
          matchedMappedProject: resolvedProject.matchedMapping,
          projectPlanApproved: sessionStore.getApproval(resolvedProject.path),
        });

        const result = await runCursorAgent({
          agentPath,
          resolvedBinary,
          projectPath: resolvedProject.path,
          prompt: parsed.prompt,
          mode: policy.mode,
          timeoutSec: cfg.defaultTimeoutSec ?? DEFAULT_TIMEOUT_SEC,
          noOutputTimeoutSec: cfg.noOutputTimeoutSec ?? DEFAULT_NO_OUTPUT_TIMEOUT_SEC,
          enableMcp: cfg.enableMcp ?? DEFAULT_ENABLE_MCP,
          model: parsed.model ?? cfg.model,
          prefixArgs: cfg.prefixArgs,
          enableTrust: cfg.enableTrust ?? false,
          mcpApprovalMode: cfg.mcpApprovalMode ?? "approve",
          continueSession: parsed.continueSession,
          resumeSessionId: parsed.resumeSessionId,
        });

        if (result.success && policy.grantProjectApprovalOnSuccess) {
          sessionStore.setApproval(resolvedProject.path);
        }

        const messages = formatRunResult(result);
        if (policy.downgraded && policy.reason) {
          messages.unshift(`⚠️ Policy applied: ${policy.reason} (mode: ${parsed.mode} -> ${policy.mode})`);
        }
        const combined = messages.join("\n\n---\n\n");
        return { text: combined };
      },
    });

    // ── Path 2: Agent Tool (PI Agent fallback invocation) ──
    if (cfg.enableAgentTool !== false && projectNames.length > 0) {
      api.registerTool(
        createCursorAgentTool({ agentPath, resolvedBinary, projects, cfg }),
        { name: "cursor_agent", optional: true },
      );
      console.log(`[${PLUGIN_ID}] registered cursor_agent tool`);
    }

    console.log(`[${PLUGIN_ID}] registered /cursor command (agent: ${agentPath}, projects: ${projectNames.join(", ") || "none"})`);
  },
};

export { resolveProjectPath } from "./project-path.js";
