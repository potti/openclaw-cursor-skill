/** Resolved Cursor CLI executable information */
export interface ResolvedBinary {
  /** Node.js executable path (e.g. .../versions/xxx/node.exe) */
  nodeBin: string;
  /** Agent entry script path (e.g. .../versions/xxx/index.js) */
  entryScript: string;
}

/** Plugin configuration */
export interface CursorAgentConfig {
  agentPath?: string;
  /** Node.js executable path; with agentEntryScript, bypasses .cmd/shell resolution */
  agentNodeBin?: string;
  /** Agent entry JS path, used with agentNodeBin */
  agentEntryScript?: string;
  defaultTimeoutSec?: number;
  noOutputTimeoutSec?: number;
  model?: string;
  enableMcp?: boolean;
  projects?: Record<string, string>;
  /** Maximum concurrent CLI processes, default 3 */
  maxConcurrent?: number;
  /** Whether to register Agent Tool for PI Agent auto-invocation, default true */
  enableAgentTool?: boolean;
  /** Extra args inserted after agentPath and before standard args (testing/advanced) */
  prefixArgs?: string[];
  /** Require auth for /cursor command, default true */
  commandRequireAuth?: boolean;
  /** Allow absolute path project input outside projects mapping, default false */
  allowAbsoluteProjectPath?: boolean;
  /** Allowed execution modes (agent/ask/plan). Default all */
  allowedModes?: Array<"agent" | "ask" | "plan">;
  /** Whether /cursor command can run in agent mode, default false */
  allowAgentModeForCommand?: boolean;
  /** Whether cursor_agent tool can run in agent mode, default true */
  allowAgentModeForTool?: boolean;
  /** Agent mode requires mapped project path from `projects`, default true */
  requireMappedProjectForAgent?: boolean;
  /** Task keyword allowlist for agent mode; empty means no keyword restriction */
  writableTaskPatterns?: string[];
  /** Agent mode task keyword denylist */
  denyTaskPatterns?: string[];
  /** Enable --trust when invoking cursor agent */
  enableTrust?: boolean;
  /** MCP approval behavior when MCP is enabled */
  mcpApprovalMode?: "approve" | "force" | "off";
  /** Default mode used by cursor_agent tool when mode is omitted */
  toolDefaultMode?: "agent" | "ask" | "plan";
  /** Persisted session state file path */
  sessionStatePath?: string;
  /** Session state TTL in seconds */
  sessionTtlSec?: number;
  /** Maximum persisted project sessions */
  maxSessionEntries?: number;
  /** Force development tasks to run in plan mode first, default true */
  enforcePlanBeforeDevelopment?: boolean;
  /** Enable verbose plugin runtime logs, default false */
  verboseLogs?: boolean;
}

/** Base type for stream-json events */
export interface StreamEvent {
  type: string;
  subtype?: string;
  session_id?: string;
  model_call_id?: string;
  timestamp_ms?: number;
}

/** system init event */
export interface SystemInitEvent extends StreamEvent {
  type: "system";
  subtype: "init";
  model: string;
  cwd: string;
  session_id: string;
}

/** assistant message event */
export interface AssistantEvent extends StreamEvent {
  type: "assistant";
  message: {
    role: "assistant";
    content: Array<{ type: "text"; text: string }>;
  };
}

/** tool_call event */
export interface ToolCallEvent extends StreamEvent {
  type: "tool_call";
  subtype: "started" | "completed";
  call_id: string;
  tool_call: Record<string, unknown>;
}

/** result event */
export interface ResultEvent extends StreamEvent {
  type: "result";
  subtype: "success" | "error";
  result: string;
  duration_ms: number;
  is_error: boolean;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
  };
}

/** user event */
export interface UserEvent extends StreamEvent {
  type: "user";
  message: {
    role: "user";
    content: Array<{ type: "text"; text: string }>;
  };
}

export type CursorStreamEvent =
  | SystemInitEvent
  | AssistantEvent
  | ToolCallEvent
  | ResultEvent
  | UserEvent
  | StreamEvent;

/** Collected event record for formatting output */
export interface CollectedEvent {
  type: "assistant" | "tool_start" | "tool_end" | "result" | "user";
  timestamp?: number;
  /** Text content from assistant / user */
  text?: string;
  /** Tool name */
  toolName?: string;
  /** Tool argument summary */
  toolArgs?: string;
  /** Result text from tool_call completed */
  toolResult?: string;
  /** Full data from result event */
  resultData?: ResultEvent;
}

/** Runner execution options */
export interface RunOptions {
  agentPath: string;
  /** Resolved underlying binary metadata, preferred over agentPath */
  resolvedBinary?: ResolvedBinary;
  projectPath: string;
  prompt: string;
  mode: "agent" | "ask" | "plan";
  timeoutSec: number;
  noOutputTimeoutSec: number;
  enableMcp: boolean;
  model?: string;
  signal?: AbortSignal;
  /** Continue previous session */
  continueSession?: boolean;
  /** Resume a specific session */
  resumeSessionId?: string;
  /** Run identifier for the process registry */
  runId?: string;
  /** Extra args inserted after agentPath and before standard args (testing/advanced) */
  prefixArgs?: string[];
  /** Add --trust flag when true */
  enableTrust?: boolean;
  /** MCP approval behavior */
  mcpApprovalMode?: "approve" | "force" | "off";
  /** Enable verbose runtime logs */
  verboseLogs?: boolean;
}

/** Runner execution result */
export interface RunResult {
  success: boolean;
  /** Assembled full conversation content */
  resultText: string;
  sessionId?: string;
  durationMs: number;
  toolCallCount: number;
  error?: string;
  errorClass?: "timeout_total" | "timeout_no_output" | "aborted" | "spawn_error" | "stderr_error" | "unknown";
  usage?: ResultEvent["usage"];
  /** Full collected event stream */
  events: CollectedEvent[];
}

/** /cursor command parse result */
export interface ParsedCommand {
  project: string;
  prompt: string;
  mode: "agent" | "ask" | "plan";
  model?: string;
  continueSession?: boolean;
  resumeSessionId?: string;
  resetPlanGate?: boolean;
}

export interface ResolvedProjectPath {
  path: string;
  matchedMapping: boolean;
}

export interface PolicyInput {
  source: "command" | "tool";
  requestedMode: "agent" | "ask" | "plan";
  prompt: string;
  matchedMappedProject: boolean;
  projectPlanApproved?: boolean;
}

export interface PolicyDecision {
  mode: "agent" | "ask" | "plan";
  downgraded: boolean;
  reason?: string;
  /** Mark project as plan-approved after successful run */
  grantProjectApprovalOnSuccess?: boolean;
}
