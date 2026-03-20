let verboseEnabled = false;

export function setVerboseLogs(enabled?: boolean): void {
  verboseEnabled = Boolean(enabled);
}

export function isVerboseLogsEnabled(): boolean {
  return verboseEnabled;
}

export function logInfo(message: string): void {
  if (verboseEnabled) {
    console.log(message);
  }
}
