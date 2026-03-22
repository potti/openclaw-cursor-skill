import { runCursorAgent } from "./runner.js";
import { formatRunResult, extractModifiedFiles } from "./formatter.js";
import { buildEffectiveProjects, resolveProjectPath } from "./project-path.js";
import { decideExecutionPolicy } from "./policy.js";
import { SessionStore } from "./session-store.js";
import { logger } from "./logger.js";
import type { CursorAgentConfig, ResolvedBinary } from "./types.js";

/**
 * PI Agent may still generate a reply to "summarize" or "explain" the tool result.
 * This directive must be assertive enough to prevent that behavior.
 */
const DO_NOT_SUMMARIZE_DIRECTIVE = [
  "",
  "─".repeat(40),
  "⚠️ CRITICAL INSTRUCTION — READ CAREFULLY ⚠️",
  "The COMPLETE analysis output from Cursor CLI is shown above.",
  "You MUST NOT summarize, rephrase, interpret, or comment on ANY of the above content.",
  "You MUST NOT add your own analysis, suggestions, or follow-up questions about the above output.",
  "Simply confirm that the Cursor CLI task has completed. Say ONLY something like:",
  '"Cursor CLI analysis completed, results shown above." — nothing more.',
  "Any additional commentary will corrupt the original output and confuse the user.",
  "─".repeat(40),
].join("\n");

interface ToolContext {
  config?: Record<string, unknown>;
  workspaceDir?: string;
  agentDir?: string;
  agentId?: string;
  sessionKey?: string;
  messageChannel?: string;
  agentAccountId?: string;
  sandboxed?: boolean;
}

interface SendMessageFn {
  (opts: { sessionKey: string; channel: string; text: string }): Promise<void>;
}

interface ToolResult {
  content: Array<{ type: string; text: string }>;
  details?: Record<string, unknown>;
}

export function createCursorAgentTool(params: {
  agentPath: string;
  resolvedBinary?: ResolvedBinary;
  projects: Record<string, string>;
  cfg: CursorAgentConfig;
  sendMessage?: SendMessageFn;
}) {
  const projectNames = Object.keys(params.projects);
  const projectListStr = projectNames.join(", ");

  const sessionStore = new SessionStore({
    path: params.cfg.sessionStatePath,
    ttlSec: params.cfg.sessionTtlSec,
    maxEntries: params.cfg.maxSessionEntries,
  });

  return (ctx: ToolContext) => ({
    name: "cursor_cli",
    label: "Cursor CLI",
    description:
      `Invoke the local Cursor CLI to analyze, diagnose, or modify code in a project on the host machine. ` +
      `Use this when the user asks about code analysis, debugging, or changes for a specific project. ` +
      (projectListStr
        ? `Available projects: ${projectListStr}. `
        : "If no projects configured, use project `workspace` to target <agent-workspace>/projects. ") +
      `IMPORTANT: Results are returned verbatim from Cursor CLI. You MUST NOT summarize, rephrase, or add commentary to the output.`,
    parameters: {
      type: "object" as const,
      properties: {
        project: {
          type: "string" as const,
          description: projectListStr
            ? `Project name (one of: ${projectListStr}) or absolute path to project directory`
            : "Project name (`workspace` by default) or absolute path to project directory",
        },
        prompt: {
          type: "string" as const,
          description: "Task description for Cursor CLI — be specific about what to analyze or change",
        },
        mode: {
          type: "string" as const,
          enum: ["agent", "ask", "plan"],
          description: "Execution mode: agent / ask / plan. If omitted, uses config `toolDefaultMode` (default agent) and policy gate.",
        },
        newSession: {
          type: "boolean" as const,
          description: "Force start a fresh session, discarding previous Cursor CLI context. Default false (auto-resumes last session for the project).",
        },
        resetPlanGate: {
          type: "boolean" as const,
          description: "Reset plan-first gate approval for this project before this run. Default false.",
        },
      },
      required: ["project", "prompt"],
    },

    async execute(
      _toolCallId: string,
      args: Record<string, unknown>,
      signal?: AbortSignal,
    ): Promise<ToolResult> {
      const project = String(args.project ?? "");
      const prompt = String(args.prompt ?? "");
      const requestedMode = (args.mode as "agent" | "ask" | "plan") ?? (params.cfg.toolDefaultMode ?? "agent");
      const forceNew = args.newSession === true;
      const resetPlanGate = args.resetPlanGate === true;

      if (!project || !prompt) {
        return {
          content: [{ type: "text", text: "Missing required parameters: project and prompt" }],
        };
      }

      const effectiveProjects = buildEffectiveProjects(
        params.projects,
        ctx.workspaceDir ?? ctx.agentDir,
      );
      const effectiveProjectNames = Object.keys(effectiveProjects);
      const effectiveProjectListStr = effectiveProjectNames.join(", ");

      const resolvedProject = resolveProjectPath(
        project,
        effectiveProjects,
        params.cfg.allowAbsoluteProjectPath ?? false,
      );
      if (!resolvedProject) {
        return {
          content: [{
            type: "text",
            text: effectiveProjectListStr
              ? `Project not found: ${project}. Available projects: ${effectiveProjectListStr}`
              : `Project not found: ${project}. If no config projects are set, use project key "workspace".`,
          }],
        };
      }
      const projectPath = resolvedProject.path;
      logger.info(
        `tool request project=${project} resolved=${projectPath} ` +
        `requestedMode=${requestedMode} workspace=${ctx.workspaceDir ?? "unknown"}`,
      );
      if (resetPlanGate) {
        sessionStore.clearApproval(projectPath);
        logger.info(`tool plan gate reset project=${projectPath}`);
      }
      const policy = decideExecutionPolicy(params.cfg, {
        source: "tool",
        requestedMode,
        prompt,
        matchedMappedProject: resolvedProject.matchedMapping,
        projectPlanApproved: sessionStore.getApproval(projectPath),
      });
      if (policy.downgraded && policy.reason) {
        logger.info(
          `policy downgraded source=tool from=${requestedMode} to=${policy.mode} reason=${policy.reason}`,
        );
      }

      // Session tracking: reuse the latest session for the same project by default.
      let resumeSessionId: string | undefined;
      if (!forceNew) {
        resumeSessionId = sessionStore.get(projectPath);
      }

      const result = await runCursorAgent({
        agentPath: params.agentPath,
        resolvedBinary: params.resolvedBinary,
        projectPath,
        prompt,
        mode: policy.mode,
        timeoutSec: params.cfg.defaultTimeoutSec ?? 600,
        noOutputTimeoutSec: params.cfg.noOutputTimeoutSec ?? 120,
        enableMcp: params.cfg.enableMcp ?? true,
        model: params.cfg.model,
        prefixArgs: params.cfg.prefixArgs,
        enableTrust: params.cfg.enableTrust ?? false,
        mcpApprovalMode: params.cfg.mcpApprovalMode ?? "approve",
        verboseLogs: params.cfg.verboseLogs,
        resumeSessionId,
        signal,
      });

      // Update session tracking state.
      if (result.sessionId) {
        sessionStore.set(projectPath, result.sessionId);
        logger.info(`tool session tracked project=${projectPath} session=${result.sessionId}`);
      }
      if (result.success && policy.grantProjectApprovalOnSuccess) {
        sessionStore.setApproval(projectPath);
        logger.info(`tool plan gate approved project=${projectPath}`);
      }

      const messages = formatRunResult(result);
      const combined = messages.join("\n\n---\n\n");
      const modifiedFiles = extractModifiedFiles(result.events);

      // Future phase: direct messaging delivery
      if (params.sendMessage && ctx.sessionKey && ctx.messageChannel) {
        try {
          await params.sendMessage({
            sessionKey: ctx.sessionKey,
            channel: ctx.messageChannel,
            text: combined,
          });
          return {
            content: [{
              type: "text",
              text: [
                `Cursor CLI task completed (${policy.mode} mode).`,
                policy.downgraded && policy.reason
                  ? `Policy: ${policy.reason} (mode: ${requestedMode} -> ${policy.mode})`
                  : "",
                `Results have been sent directly to the user.`,
                result.sessionId ? `Session: ${result.sessionId}` : "",
                modifiedFiles.length > 0 ? `Modified files: ${modifiedFiles.join(", ")}` : "",
                "",
                "⚠️ The results are ALREADY delivered. Do NOT repeat, summarize, or rephrase any of the output.",
              ].filter(Boolean).join("\n"),
            }],
            details: {
              success: result.success,
              sessionId: result.sessionId,
              modifiedFiles,
              sentDirectly: true,
            },
          };
        } catch {
          // Send failed, fall back to tool result
        }
      }

      // Current phase / fallback: return full content via tool result
      return {
        content: [{
          type: "text",
          text: combined + DO_NOT_SUMMARIZE_DIRECTIVE,
        }],
        details: {
          success: result.success,
          sessionId: result.sessionId,
          modifiedFiles,
          policy,
          sentDirectly: false,
        },
      };
    },
  });
}
