import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline";
import { parseStreamLine, extractToolName, extractToolArgs, extractToolResult } from "./parser.js";
import * as registry from "./process-registry.js";
import { logger } from "./logger.js";
import type {
  RunOptions,
  RunResult,
  AssistantEvent,
  ResultEvent,
  ToolCallEvent,
  SystemInitEvent,
  CollectedEvent,
} from "./types.js";

function classifyError(error: string): "timeout_total" | "timeout_no_output" | "aborted" | "spawn_error" | "stderr_error" | "unknown" {
  if (error.startsWith("total timeout")) return "timeout_total";
  if (error.startsWith("no output timeout")) return "timeout_no_output";
  if (error === "aborted") return "aborted";
  if (error.toLowerCase().includes("spawn")) return "spawn_error";
  if (error.trim().length > 0) return "stderr_error";
  return "unknown";
}

/** Build CLI command and arguments (cross-platform) */
function buildCommand(opts: RunOptions): { cmd: string; args: string[]; shell: boolean } {
  const resolved = opts.resolvedBinary;

  const cliArgs: string[] = [];

  if (resolved) {
    // Invoke node directly and pass entryScript as the first argument.
    cliArgs.push(resolved.entryScript);
  }

  cliArgs.push(...(opts.prefixArgs ?? []), "-p");
  if (opts.enableTrust) {
    cliArgs.push("--trust");
  }
  cliArgs.push("--output-format", "stream-json");

  if (opts.resumeSessionId) {
    cliArgs.push("--resume", opts.resumeSessionId);
  } else if (opts.continueSession) {
    cliArgs.push("--continue");
  } else if (opts.mode !== "agent") {
    cliArgs.push("--mode", opts.mode);
  }

  if (opts.enableMcp && (opts.mcpApprovalMode ?? "approve") !== "off") {
    cliArgs.push("--approve-mcps");
    if ((opts.mcpApprovalMode ?? "approve") === "force") {
      cliArgs.push("--force");
    }
  }
  if (opts.model) {
    cliArgs.push("--model", opts.model);
  }

  cliArgs.push(opts.prompt);

  if (resolved) {
    // Direct node invocation does not require shell mode.
    return { cmd: resolved.nodeBin, args: cliArgs, shell: false };
  }

  // Fallback: invoke agentPath directly (compatible with standalone agent binaries).
  const needsShell =
    process.platform === "win32" &&
    /\.(cmd|bat)$/i.test(opts.agentPath);

  return { cmd: opts.agentPath, args: cliArgs, shell: needsShell };
}

/** Execute Cursor Agent CLI and collect the full event stream */
export async function runCursorAgent(opts: RunOptions): Promise<RunResult> {
  if (registry.isFull()) {
    logger.warn(`run rejected: concurrency full (${registry.getActiveCount()})`);
    return {
      success: false,
      resultText: `Concurrency limit reached (${registry.getActiveCount()}), please try again later`,
      durationMs: 0,
      toolCallCount: 0,
      error: "max concurrency reached",
      events: [],
    };
  }

  const runId = opts.runId ?? randomUUID();
  const startTime = Date.now();
  const { cmd, args, shell } = buildCommand(opts);
  logger.debug(
    `run start id=${runId} mode=${opts.mode} project=${opts.projectPath} ` +
    `timeout=${opts.timeoutSec}s noOutputTimeout=${opts.noOutputTimeoutSec}s shell=${shell} ` +
    `promptLen=${opts.prompt.length}`,
  );

  const isUnix = process.platform !== "win32";
  const proc = spawn(cmd, args, {
    cwd: opts.projectPath,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    shell,
    detached: isUnix,
  });
  if (isUnix) proc.unref();
  logger.debug(`run spawned id=${runId} pid=${proc.pid ?? "unknown"} cmd=${cmd}`);

  registry.register(runId, { proc, projectPath: opts.projectPath, startTime });

  let sessionId: string | undefined;
  let resultText = "";
  let toolCallCount = 0;
  let completed = false;
  let error: string | undefined;
  let errorClass: RunResult["errorClass"];
  let usage: ResultEvent["usage"];
  let lastOutputTime = Date.now();
  const events: CollectedEvent[] = [];
  const stderrChunks: string[] = [];

  const terminateProcess = () => {
    if (proc.exitCode !== null || proc.killed) return;
    logger.warn(`terminating process id=${runId} pid=${proc.pid ?? "unknown"}`);
    registry.killWithGrace(proc);
  };

  const totalTimeout = setTimeout(() => {
    if (!completed) {
      error = `total timeout (${opts.timeoutSec}s)`;
      logger.warn(`total timeout id=${runId} after=${opts.timeoutSec}s`);
      terminateProcess();
    }
  }, opts.timeoutSec * 1000);

  const noOutputCheck = setInterval(() => {
    if (Date.now() - lastOutputTime > opts.noOutputTimeoutSec * 1000) {
      if (!completed) {
        error = `no output timeout (${opts.noOutputTimeoutSec}s)`;
        logger.warn(`no-output timeout id=${runId} after=${opts.noOutputTimeoutSec}s`);
        terminateProcess();
      }
    }
  }, 5000);

  const onAbort = () => {
    if (!completed) {
      error = "aborted";
      logger.warn(`run aborted id=${runId}`);
      terminateProcess();
    }
  };
  opts.signal?.addEventListener("abort", onAbort, { once: true });

  return new Promise<RunResult>((resolve) => {
    if (proc.stderr) {
      proc.stderr.on("data", (chunk: Buffer) => {
        stderrChunks.push(chunk.toString());
        lastOutputTime = Date.now();
      });
    }

    const rl = createInterface({ input: proc.stdout!, crlfDelay: Infinity });

    rl.on("line", (line) => {
      lastOutputTime = Date.now();
      const event = parseStreamLine(line);
      if (!event) return;

      switch (event.type) {
        case "system":
          if (event.subtype === "init") {
            sessionId = (event as SystemInitEvent).session_id;
          }
          break;

        case "user": {
          const ue = event as { message?: { content?: Array<{ text?: string }> } };
          const text = ue.message?.content?.[0]?.text;
          if (text) {
            events.push({ type: "user", text, timestamp: event.timestamp_ms });
          }
          break;
        }

        case "assistant": {
          const ae = event as AssistantEvent;
          const text = ae.message?.content?.[0]?.text;
          if (text) {
            events.push({ type: "assistant", text, timestamp: event.timestamp_ms });
          }
          break;
        }

        case "tool_call": {
          const tc = event as ToolCallEvent;
          if (tc.subtype === "started") {
            toolCallCount++;
            events.push({
              type: "tool_start",
              toolName: extractToolName(tc),
              toolArgs: extractToolArgs(tc),
              timestamp: event.timestamp_ms,
            });
          } else if (tc.subtype === "completed") {
            events.push({
              type: "tool_end",
              toolName: extractToolName(tc),
              toolResult: extractToolResult(tc),
              timestamp: event.timestamp_ms,
            });
          }
          break;
        }

        case "result": {
          const re = event as ResultEvent;
          resultText = re.result ?? "";
          usage = re.usage;
          completed = true;
          events.push({
            type: "result",
            resultData: re,
            timestamp: event.timestamp_ms,
          });
          break;
        }
      }
    });

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;

      clearTimeout(totalTimeout);
      clearInterval(noOutputCheck);
      opts.signal?.removeEventListener("abort", onAbort);
      registry.unregister(runId);

      if (proc.exitCode === null && !proc.killed) {
        registry.killWithGrace(proc);
      }

      const durationMs = Date.now() - startTime;
      const stderrText = stderrChunks.join("").trim();

      if (!error && !completed && stderrText) {
        error = stderrText;
      }
      if (error) {
        errorClass = classifyError(error);
        logger.error(
          `run failed id=${runId} class=${errorClass} ` +
          `durationMs=${durationMs} exitCode=${proc.exitCode} error=${error}`,
        );
      } else {
        logger.debug(
          `run complete id=${runId} success=${completed} durationMs=${durationMs} ` +
          `toolCalls=${toolCallCount} sessionId=${sessionId ?? "none"} exitCode=${proc.exitCode}`,
        );
      }

      resolve({
        success: !error && completed,
        resultText: resultText || (stderrText ? stderrText : (error ? `Cursor CLI execution failed: ${error}` : "No analysis result obtained")),
        sessionId,
        durationMs,
        toolCallCount,
        error,
        errorClass,
        usage,
        events,
      });
    };

    proc.on("close", cleanup);
    proc.on("error", (err) => {
      error = err.message;
      logger.error(`spawn/process error id=${runId} error=${err.message}`);
      cleanup();
    });
  });
}
