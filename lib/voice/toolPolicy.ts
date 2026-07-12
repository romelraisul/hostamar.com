// Pure policy for the voice tool-layer safety boundary (article layer 5).
// Kept separate from the route so it can be unit-tested without auth/HTTP.
export type ToolName =
  | 'get_hosting_status'
  | 'create_video'
  | 'create_ticket'
  | 'initiate_bkash_payment'

// destructive = needs an explicit client-action confirmation before executing.
export const TOOL_ALLOWLIST: Record<string, { destructive: boolean }> = {
  get_hosting_status: { destructive: false },
  create_video: { destructive: false },
  create_ticket: { destructive: true },
  initiate_bkash_payment: { destructive: true },
}

export function isToolAllowed(tool: string): boolean {
  return Object.prototype.hasOwnProperty.call(TOOL_ALLOWLIST, tool)
}

export function isDestructive(tool: string): boolean {
  return TOOL_ALLOWLIST[tool]?.destructive === true
}

// The golden rule: destructive tools MUST NOT run unless the client action
// path confirmed them. Returns the HTTP status the route should respond with.
export function evaluateToolCall(
  tool: string,
  userConfirmed: boolean
): { allowed: boolean; status: number; error?: string } {
  if (!isToolAllowed(tool)) {
    return { allowed: false, status: 400, error: 'unknown or disallowed tool' }
  }
  if (isDestructive(tool) && !userConfirmed) {
    return { allowed: false, status: 400, error: 'Confirmation required' }
  }
  return { allowed: true, status: 200 }
}
