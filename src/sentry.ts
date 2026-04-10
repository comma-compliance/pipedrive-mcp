// Thin Sentry wrapper - all exports are no-ops when SENTRY_DSN is unset or @sentry/node is missing.
// Uses dynamic import() so the optional dependency never breaks builds.

/* eslint-disable @typescript-eslint/no-explicit-any */
let _sentry: any = null;

export interface CaptureContext {
  tool?: string;
  endpoint?: string;
  category?: string;
  status?: number;
  level?: "warning" | "error";
  extra?: Record<string, unknown>;
}

export async function initSentry(): Promise<boolean> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;

  try {
    _sentry = await import("@sentry/node");
  } catch {
    process.stderr.write(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: "warn",
        msg: "SENTRY_DSN is set but @sentry/node is not installed - Sentry disabled",
      }) + "\n",
    );
    return false;
  }

  _sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? "production",
    release: process.env.SENTRY_RELEASE || undefined,
    tracesSampleRate: 0,
    beforeSend(event: any) {
      // Drop 429 rate-limit errors - high volume, handled by retry layer
      const status = event?.tags?.status;
      if (status !== undefined && Number(status) === 429) return null;
      return event;
    },
  });

  return true;
}

export function setSentryContext(data: {
  companyDomain?: string;
  transport?: string;
}): void {
  if (!_sentry) return;
  if (data.companyDomain) _sentry.setTag("companyDomain", data.companyDomain);
  if (data.transport) _sentry.setTag("transport", data.transport);
}

export function captureError(err: unknown, ctx?: CaptureContext): void {
  if (!_sentry) return;
  _sentry.withScope((scope: any) => {
    if (ctx?.tool) scope.setTag("tool", ctx.tool);
    if (ctx?.endpoint) scope.setTag("endpoint", ctx.endpoint);
    if (ctx?.category) scope.setTag("category", ctx.category);
    if (ctx?.status !== undefined) scope.setTag("status", ctx.status);
    if (ctx?.level) scope.setLevel(ctx.level);
    if (ctx?.extra) {
      for (const [key, value] of Object.entries(ctx.extra)) {
        scope.setExtra(key, value);
      }
    }
    _sentry.captureException(err instanceof Error ? err : new Error(String(err)));
  });
}

export function addBreadcrumb(breadcrumb: {
  category?: string;
  message: string;
  level?: string;
  data?: Record<string, unknown>;
}): void {
  if (!_sentry) return;
  _sentry.addBreadcrumb(breadcrumb);
}

export async function flushSentry(timeoutMs = 2000): Promise<void> {
  if (!_sentry) return;
  await _sentry.flush(timeoutMs);
}
