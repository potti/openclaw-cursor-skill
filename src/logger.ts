/**
 * Structured logger for cursor-agent plugin.
 * All output goes through console.debug/info/warn/error, which are captured by the OpenClaw gateway log.
 */

const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
} as const;

type LogLevel = keyof typeof LEVELS;

function getEnvLogLevel(): LogLevel {
  const raw = (
    process.env.CURSOR_AGENT_LOG_LEVEL ?? process.env.LOG_LEVEL ?? "info"
  ).toLowerCase();
  return (raw in LEVELS) ? (raw as LogLevel) : "info";
}

export class Logger {
  private prefix: string;
  private level: LogLevel;

  constructor(prefix = "[cursor-agent]", level: LogLevel = getEnvLogLevel()) {
    this.prefix = prefix;
    this.level = level;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (LEVELS[level] < LEVELS[this.level]) return;
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : "";
    const msg = `${timestamp} ${level.toUpperCase()} ${this.prefix} ${message}${contextStr}`;
    switch (level) {
      case "debug": console.debug(msg); break;
      case "info":  console.info(msg);  break;
      case "warn":  console.warn(msg);  break;
      case "error": console.error(msg); break;
    }
  }

  debug(message: string, context?: Record<string, unknown>): void { this.log("debug", message, context); }
  info(message: string, context?: Record<string, unknown>): void  { this.log("info",  message, context); }
  warn(message: string, context?: Record<string, unknown>): void  { this.log("warn",  message, context); }
  error(message: string, context?: Record<string, unknown>): void { this.log("error", message, context); }

  /** Create a child logger with a sub-prefix and the same log level */
  child(subPrefix: string): Logger {
    return new Logger(`${this.prefix}:${subPrefix}`, this.level);
  }
}

/** Shared plugin-level logger instance */
export const logger = new Logger();

/**
 * Set log verbosity based on the `verboseLogs` plugin config flag.
 * true  → debug level (all messages visible in gateway logs)
 * false → falls back to env var LOG_LEVEL / CURSOR_AGENT_LOG_LEVEL (default: info)
 */
export function setVerboseLogs(enabled?: boolean): void {
  logger.setLevel(enabled ? "debug" : getEnvLogLevel());
}

/** @deprecated Use logger.debug() directly */
export function logInfo(message: string): void {
  logger.debug(message);
}

/** @deprecated Use logger.getLevel() directly */
export function isVerboseLogsEnabled(): boolean {
  return LEVELS[logger.getLevel()] <= LEVELS["debug"];
}
