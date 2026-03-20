import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

interface SessionRecord {
  sessionId: string;
  updatedAt: number;
}

interface SessionState {
  sessions: Record<string, SessionRecord>;
  approvals: Record<string, number>;
}

const DEFAULT_TTL_SEC = 7 * 24 * 60 * 60;
const DEFAULT_MAX_ENTRIES = 200;

export class SessionStore {
  private readonly path: string;
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private state: SessionState;

  constructor(params: { path?: string; ttlSec?: number; maxEntries?: number } = {}) {
    this.path = params.path || join(homedir(), ".cursor-agent", "session-state.json");
    this.ttlMs = Math.max(60, params.ttlSec ?? DEFAULT_TTL_SEC) * 1000;
    this.maxEntries = Math.max(1, params.maxEntries ?? DEFAULT_MAX_ENTRIES);
    this.state = this.load();
    this.pruneAndPersistIfNeeded();
  }

  get(projectPath: string): string | undefined {
    const record = this.state.sessions[projectPath];
    if (!record) return undefined;
    if (Date.now() - record.updatedAt > this.ttlMs) {
      delete this.state.sessions[projectPath];
      this.persist();
      return undefined;
    }
    return record.sessionId;
  }

  set(projectPath: string, sessionId: string): void {
    this.state.sessions[projectPath] = { sessionId, updatedAt: Date.now() };
    this.pruneAndPersistIfNeeded();
  }

  getApproval(projectPath: string): boolean {
    const updatedAt = this.state.approvals[projectPath];
    if (!updatedAt) return false;
    if (Date.now() - updatedAt > this.ttlMs) {
      delete this.state.approvals[projectPath];
      this.persist();
      return false;
    }
    return true;
  }

  setApproval(projectPath: string): void {
    this.state.approvals[projectPath] = Date.now();
    this.pruneAndPersistIfNeeded();
  }

  clearApproval(projectPath: string): void {
    if (this.state.approvals[projectPath]) {
      delete this.state.approvals[projectPath];
      this.persist();
    }
  }

  private load(): SessionState {
    try {
      if (!existsSync(this.path)) return { sessions: {}, approvals: {} };
      const raw = readFileSync(this.path, "utf-8");
      const parsed = JSON.parse(raw) as Partial<SessionState>;
      if (!parsed || typeof parsed !== "object") return { sessions: {}, approvals: {} };
      return {
        sessions: parsed.sessions ?? {},
        approvals: parsed.approvals ?? {},
      };
    } catch {
      return { sessions: {}, approvals: {} };
    }
  }

  private pruneAndPersistIfNeeded(): void {
    const now = Date.now();
    for (const [projectPath, record] of Object.entries(this.state.sessions)) {
      if (now - record.updatedAt > this.ttlMs) {
        delete this.state.sessions[projectPath];
      }
    }
    for (const [projectPath, updatedAt] of Object.entries(this.state.approvals)) {
      if (now - updatedAt > this.ttlMs) {
        delete this.state.approvals[projectPath];
      }
    }

    const entries = Object.entries(this.state.sessions).sort((a, b) => b[1].updatedAt - a[1].updatedAt);
    if (entries.length > this.maxEntries) {
      for (const [projectPath] of entries.slice(this.maxEntries)) {
        delete this.state.sessions[projectPath];
      }
    }
    const approvalEntries = Object.entries(this.state.approvals).sort((a, b) => b[1] - a[1]);
    if (approvalEntries.length > this.maxEntries) {
      for (const [projectPath] of approvalEntries.slice(this.maxEntries)) {
        delete this.state.approvals[projectPath];
      }
    }
    this.persist();
  }

  private persist(): void {
    try {
      mkdirSync(dirname(this.path), { recursive: true });
      const tmpPath = `${this.path}.tmp`;
      writeFileSync(tmpPath, JSON.stringify(this.state, null, 2), "utf-8");
      renameSync(tmpPath, this.path);
    } catch {
      // best effort cache only; ignore persistence failures
    }
  }
}
