import { describe, it, expect } from "vitest";
import { buildEffectiveProjects, resolveProjectPath } from "./project-path.js";

describe("resolveProjectPath shared util", () => {
  const projects = { app: "/workspace/app" };

  it("resolves mapped project", () => {
    expect(resolveProjectPath("app", projects, false)).toEqual({
      path: "/workspace/app",
      matchedMapping: true,
    });
  });

  it("blocks absolute path when disabled", () => {
    if (process.platform !== "win32") {
      expect(resolveProjectPath("/", projects, false)).toBeNull();
    }
  });

  it("builds workspace fallback when projects config is empty", () => {
    const effective = buildEffectiveProjects({}, "/agent/workspace");
    expect(effective).toEqual({ workspace: "/agent/workspace/projects" });
  });
});
