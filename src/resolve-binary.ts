import { existsSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import type { ResolvedBinary } from "./types.js";

const VERSION_PATTERN = /^\d{4}\.\d{1,2}\.\d{1,2}-[a-f0-9]+$/;

/**
 * Converts a version folder name (for example "2026.2.27-e7d2ef6")
 * into a sortable number (for example 20260227).
 * This matches Parse-VersionString logic in cursor-agent.ps1.
 */
function versionToNum(name: string): number {
  const datePart = name.split("-")[0]!;
  const [year, month, day] = datePart.split(".");
  return parseInt(`${year}${month!.padStart(2, "0")}${day!.padStart(2, "0")}`, 10);
}

/** Returns the platform-specific Node executable name. */
function nodeBinName(): string {
  return process.platform === "win32" ? "node.exe" : "node";
}

/**
 * Probes a directory for node executable + index.js.
 * Corresponds to the "same dir as the script" path in cursor-agent.ps1.
 */
function probeDir(dir: string): ResolvedBinary | null {
  const nodeBin = join(dir, nodeBinName());
  const entry = join(dir, "index.js");
  if (existsSync(nodeBin) && existsSync(entry)) {
    return { nodeBin, entryScript: entry };
  }
  return null;
}

/**
 * Scans baseDir/versions/ and picks node + index.js from the latest version.
 * Corresponds to the "Find the latest version" path in cursor-agent.ps1.
 */
function probeVersions(baseDir: string): ResolvedBinary | null {
  const versionsDir = join(baseDir, "versions");
  if (!existsSync(versionsDir)) return null;

  let entries: string[];
  try {
    entries = readdirSync(versionsDir);
  } catch {
    return null;
  }

  const matched = entries
    .filter((name) => VERSION_PATTERN.test(name))
    .sort((a, b) => versionToNum(b) - versionToNum(a));

  for (const ver of matched) {
    const result = probeDir(join(versionsDir, ver));
    if (result) return result;
  }
  return null;
}

/**
 * Resolves underlying node + index.js from agentPath (.cmd / shell script / any path).
 *
 * Resolution strategy (mirrors cursor-agent.ps1, cross-platform):
 * 1. If agentPath directory directly contains node + index.js, use it.
 * 2. If agentPath directory contains versions/, use the latest version.
 * 3. If unresolved, return null and let caller fall back to direct spawn.
 */
export function resolveAgentBinary(agentPath: string): ResolvedBinary | null {
  const baseDir = dirname(resolve(agentPath));

  const direct = probeDir(baseDir);
  if (direct) return direct;

  const versioned = probeVersions(baseDir);
  if (versioned) return versioned;

  return null;
}
