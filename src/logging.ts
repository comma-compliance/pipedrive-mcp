export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogHook = (level: LogLevel, message: string, data?: Record<string, unknown>) => void;

let _hook: LogHook | null = null;

export function setLogHook(hook: LogHook): void {
  _hook = hook;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel = "info";

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel];
}

function emit(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  // Fire hook before level gate so Sentry breadcrumbs capture even when log level suppresses output
  try {
    _hook?.(level, message, data);
  } catch {
    // Swallow hook errors to prevent infinite recursion
  }
  if (!shouldLog(level)) return;
  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg: message,
  };
  if (data) {
    Object.assign(entry, data);
  }
  process.stderr.write(JSON.stringify(entry) + "\n");
}

export const log = {
  debug: (msg: string, data?: Record<string, unknown>) => emit("debug", msg, data),
  info: (msg: string, data?: Record<string, unknown>) => emit("info", msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => emit("warn", msg, data),
  error: (msg: string, data?: Record<string, unknown>) => emit("error", msg, data),
};
