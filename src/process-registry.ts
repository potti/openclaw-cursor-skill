import { spawn, type ChildProcess } from "node:child_process";
import { logger } from "./logger.js";

const DEFAULT_MAX_CONCURRENT = 3;
const FORCE_KILL_DELAY_MS = 5000;

interface TrackedProcess {
  proc: ChildProcess;
  projectPath: string;
  startTime: number;
}

const activeProcesses = new Map<string, TrackedProcess>();
let maxConcurrent = DEFAULT_MAX_CONCURRENT;
let shutdownRegistered = false;

export function setMaxConcurrent(value: number): void {
  maxConcurrent = Math.max(1, value);
  logger.debug(`maxConcurrent set=${maxConcurrent}`);
}

export function register(id: string, entry: TrackedProcess): void {
  activeProcesses.set(id, entry);
  logger.debug(`registry register id=${id} pid=${entry.proc.pid ?? "unknown"} active=${activeProcesses.size}`);
}

export function unregister(id: string): void {
  activeProcesses.delete(id);
  logger.debug(`registry unregister id=${id} active=${activeProcesses.size}`);
}

export function getActiveCount(): number {
  return activeProcesses.size;
}

export function isFull(): boolean {
  return activeProcesses.size >= maxConcurrent;
}

/** Send SIGTERM to process group (Unix) or non-forced taskkill (Windows) */
export function gracefulKill(proc: ChildProcess): void {
  if (!proc.pid) return;
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/T", "/PID", String(proc.pid)], { stdio: "ignore" });
    } else {
      process.kill(-proc.pid, "SIGTERM");
    }
  } catch {
    try { proc.kill("SIGTERM"); } catch { /* ignore */ }
  }
}

/** Send SIGKILL (Unix) or forced taskkill (Windows) to terminate immediately */
export function forceKill(proc: ChildProcess): void {
  if (!proc.pid) return;
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/F", "/T", "/PID", String(proc.pid)], { stdio: "ignore" });
    } else {
      process.kill(-proc.pid, "SIGKILL");
    }
  } catch {
    try { proc.kill("SIGKILL"); } catch { /* ignore */ }
  }
}

/** Two-phase termination: SIGTERM → wait → SIGKILL */
export function killWithGrace(proc: ChildProcess): void {
  logger.warn(`killWithGrace pid=${proc.pid ?? "unknown"}`);
  gracefulKill(proc);
  const timer = setTimeout(() => {
    if (proc.exitCode === null && !proc.killed) {
      logger.warn(`forceKill escalation pid=${proc.pid ?? "unknown"}`);
      forceKill(proc);
    }
  }, FORCE_KILL_DELAY_MS);
  timer.unref();
}

/** Terminate all active processes */
function shutdownAll(): void {
  logger.warn(`shutdownAll active=${activeProcesses.size}`);
  for (const [id, entry] of activeProcesses) {
    killWithGrace(entry.proc);
    activeProcesses.delete(id);
  }
}

export function ensureShutdownHook(): void {
  if (shutdownRegistered) return;
  shutdownRegistered = true;
  process.on("exit", shutdownAll);
  process.on("SIGTERM", shutdownAll);
  process.on("SIGINT", shutdownAll);
}
