import { describe, it, expect } from "vitest";
import { decideExecutionPolicy } from "./policy.js";

describe("decideExecutionPolicy", () => {
  it("downgrades command agent mode by default", () => {
    const decision = decideExecutionPolicy({}, {
      source: "command",
      requestedMode: "agent",
      prompt: "fix auth tests",
      matchedMappedProject: true,
    });
    expect(decision.mode).toBe("ask");
    expect(decision.downgraded).toBe(true);
  });

  it("allows tool agent mode on mapped project", () => {
    const decision = decideExecutionPolicy({}, {
      source: "tool",
      requestedMode: "agent",
      prompt: "implement login fix and run tests",
      matchedMappedProject: true,
    });
    expect(decision.mode).toBe("plan");
    expect(decision.downgraded).toBe(true);
    expect(decision.grantProjectApprovalOnSuccess).toBe(true);
  });

  it("downgrades to plan when prompt misses writable patterns", () => {
    const decision = decideExecutionPolicy({}, {
      source: "tool",
      requestedMode: "agent",
      prompt: "hello world",
      matchedMappedProject: true,
    });
    expect(decision.mode).toBe("plan");
    expect(decision.downgraded).toBe(true);
  });

  it("allows agent for development task after project plan approval", () => {
    const decision = decideExecutionPolicy({}, {
      source: "tool",
      requestedMode: "agent",
      prompt: "implement login fix and run tests",
      matchedMappedProject: true,
      projectPlanApproved: true,
    });
    expect(decision.mode).toBe("agent");
    expect(decision.downgraded).toBe(false);
  });

  it("marks explicit plan mode for development task as approval-granting", () => {
    const decision = decideExecutionPolicy({}, {
      source: "tool",
      requestedMode: "plan",
      prompt: "implement login fix and run tests",
      matchedMappedProject: true,
    });
    expect(decision.mode).toBe("plan");
    expect(decision.grantProjectApprovalOnSuccess).toBe(true);
  });
});
