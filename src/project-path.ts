import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import type { ResolvedProjectPath } from "./types.js";

export function buildEffectiveProjects(
  configuredProjects: Record<string, string>,
  workspaceDir?: string,
): Record<string, string> {
  if (Object.keys(configuredProjects).length > 0) {
    return configuredProjects;
  }
  if (!workspaceDir?.trim()) {
    return configuredProjects;
  }
  // Default safety boundary: current agent workspace/projects
  return { workspace: resolve(workspaceDir, "projects") };
}

export function resolveProjectPath(
  projectKey: string,
  projects: Record<string, string>,
  allowAbsolutePath: boolean,
): ResolvedProjectPath | null {
  if (projects[projectKey]) {
    return { path: projects[projectKey]!, matchedMapping: true };
  }

  const lowerKey = projectKey.toLowerCase();
  for (const [name, path] of Object.entries(projects)) {
    if (name.toLowerCase() === lowerKey) {
      return { path, matchedMapping: true };
    }
  }

  if (allowAbsolutePath && isAbsolute(projectKey) && existsSync(projectKey)) {
    return { path: projectKey, matchedMapping: false };
  }

  return null;
}
