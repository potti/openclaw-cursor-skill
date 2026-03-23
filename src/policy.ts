import type { CursorAgentConfig, PolicyDecision, PolicyInput } from "./types.js";

const MODE_PRIORITY: Array<"ask" | "plan" | "agent"> = ["ask", "plan", "agent"];
const DEFAULT_ALLOWED_MODES: Array<"agent" | "ask" | "plan"> = ["agent", "ask", "plan"];
const DEFAULT_WRITABLE_PATTERNS = [
  "fix",
  "implement",
  "refactor",
  "write",
  "add test",
  "test",
  "lint",
  "build",
  "ci",
];

function asRegExp(pattern: string): RegExp {
  return new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

function includesAny(text: string, patterns: string[]): boolean {
  if (patterns.length === 0) return true;
  return patterns.some((p) => asRegExp(p).test(text));
}

function chooseSafeMode(allowedModes: Set<"agent" | "ask" | "plan">): "agent" | "ask" | "plan" {
  for (const mode of MODE_PRIORITY) {
    if (allowedModes.has(mode)) return mode;
  }
  return "ask";
}

function forcePlanOrFallback(
  allowedModes: Set<"agent" | "ask" | "plan">,
  reason: string,
): PolicyDecision {
  if (allowedModes.has("plan")) {
    return {
      mode: "plan",
      downgraded: true,
      reason,
      grantProjectApprovalOnSuccess: true,
    };
  }
  const mode = chooseSafeMode(allowedModes);
  return {
    mode,
    downgraded: true,
    reason: `${reason}; fallback to ${mode} because plan mode is not allowed`,
  };
}

export function decideExecutionPolicy(
  cfg: CursorAgentConfig,
  input: PolicyInput,
): PolicyDecision {
  const allowedModes = new Set(cfg.allowedModes ?? DEFAULT_ALLOWED_MODES);
  const enforcePlanBeforeDevelopment = cfg.enforcePlanBeforeDevelopment ?? true;
  const prompt = input.prompt.toLowerCase();
  const allowPatterns = cfg.writableTaskPatterns ?? DEFAULT_WRITABLE_PATTERNS;
  const isDevelopmentTask = includesAny(prompt, allowPatterns);
  const projectPlanApproved = input.projectPlanApproved === true;

  if (!allowedModes.has(input.requestedMode)) {
    const mode = chooseSafeMode(allowedModes);
    return { mode, downgraded: true, reason: `mode ${input.requestedMode} is not allowed` };
  }

  if (input.requestedMode === "plan") {
    return {
      mode: "plan",
      downgraded: false,
      grantProjectApprovalOnSuccess: isDevelopmentTask,
    };
  }

  if (input.requestedMode === "ask") {
    if (enforcePlanBeforeDevelopment && isDevelopmentTask && !projectPlanApproved) {
      return forcePlanOrFallback(
        allowedModes,
        "development task requires plan before development",
      );
    }
    return { mode: input.requestedMode, downgraded: false };
  }

  if (input.source === "command" && cfg.allowAgentModeForCommand === false) {
    return { mode: "ask", downgraded: true, reason: "agent mode disabled for /cursor command" };
  }
  if (input.source === "tool" && cfg.allowAgentModeForTool === false) {
    return { mode: "ask", downgraded: true, reason: "agent mode disabled for cursor_cli tool" };
  }
  if ((cfg.requireMappedProjectForAgent ?? true) && !input.matchedMappedProject) {
    return { mode: "ask", downgraded: true, reason: "agent mode requires mapped project" };
  }

  const denyPatterns = cfg.denyTaskPatterns ?? [];
  if (denyPatterns.length > 0 && includesAny(prompt, denyPatterns)) {
    return { mode: "ask", downgraded: true, reason: "prompt matched denyTaskPatterns" };
  }

  if (!isDevelopmentTask) {
    return {
      mode: "plan",
      downgraded: true,
      reason: "prompt does not match writableTaskPatterns, downgraded to plan",
    };
  }

  if (enforcePlanBeforeDevelopment && !projectPlanApproved) {
    return forcePlanOrFallback(
      allowedModes,
      "development task requires plan before development",
    );
  }

  return { mode: "agent", downgraded: false };
}
