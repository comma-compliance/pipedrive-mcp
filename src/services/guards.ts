export type ConfirmValue = "DELETE" | "MERGE" | "YES";

export interface DryRunResult {
  dry_run: true;
  action: string;
  tool: string;
  target: Record<string, unknown>;
  would_happen: string;
}

export function validateConfirmation(
  confirm: string | undefined,
  expected: ConfirmValue,
  tool: string,
  action: string,
): string | null {
  if (!confirm) {
    return `${tool} requires confirm: "${expected}" to proceed. This is a destructive operation (${action}).`;
  }
  if (confirm !== expected) {
    return `${tool} requires confirm: "${expected}" but received "${confirm}". Pass confirm: "${expected}" to proceed.`;
  }
  return null;
}

export function buildDryRunResult(
  tool: string,
  action: string,
  target: Record<string, unknown>,
  description: string,
): DryRunResult {
  return {
    dry_run: true,
    action,
    tool,
    target,
    would_happen: description,
  };
}
