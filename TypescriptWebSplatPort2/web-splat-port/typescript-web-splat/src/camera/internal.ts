declare global {
  // eslint-disable-next-line no-var
  var __LOGGING_ENABLED__: boolean | undefined;
}

export function loggingEnabled(): boolean {
  return (globalThis as any).__LOGGING_ENABLED__ ?? true;
}

export function setLoggingEnabled(enabled: boolean): void {
  (globalThis as any).__LOGGING_ENABLED__ = !!enabled;
}

// ---- logging helper ----
export function clog(...args: any[]) {
  if (!loggingEnabled()) return;
  console.log('[camera]', ...args);
}
