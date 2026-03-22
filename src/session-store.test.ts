import { rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { SessionStore } from "./session-store.js";

const statePath = join(tmpdir(), "cursor-cli-session-store.test.json");

describe("SessionStore", () => {
  beforeEach(() => {
    try { rmSync(statePath); } catch { /* ignore */ }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("persists and reloads project session", () => {
    const a = new SessionStore({ path: statePath, ttlSec: 3600, maxEntries: 10 });
    a.set("/proj/a", "sess-1");

    const b = new SessionStore({ path: statePath, ttlSec: 3600, maxEntries: 10 });
    expect(b.get("/proj/a")).toBe("sess-1");
  });

  it("evicts expired records", async () => {
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValue(1000);
    const store = new SessionStore({ path: statePath, ttlSec: 60, maxEntries: 10 });
    store.set("/proj/a", "sess-1");
    nowSpy.mockReturnValue(62_000);
    expect(store.get("/proj/a")).toBeUndefined();
  });

  it("persists and resets project approval state", () => {
    const a = new SessionStore({ path: statePath, ttlSec: 3600, maxEntries: 10 });
    a.setApproval("/proj/a");
    expect(a.getApproval("/proj/a")).toBe(true);
    a.clearApproval("/proj/a");
    expect(a.getApproval("/proj/a")).toBe(false);
  });

  it("expires approval records by ttl", () => {
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValue(1000);
    const store = new SessionStore({ path: statePath, ttlSec: 60, maxEntries: 10 });
    store.setApproval("/proj/a");
    nowSpy.mockReturnValue(62_000);
    expect(store.getApproval("/proj/a")).toBe(false);
  });
});
