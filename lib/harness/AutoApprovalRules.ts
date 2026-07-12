// ============================================================================
// AutoApprovalRules — decide whether a risky tool needs human approval.
//
// Rules are evaluated in order; the FIRST rule that returns a decision wins.
// Each rule: (ctx) => 'approve' | 'deny' | null   (null = not applicable)
// ============================================================================
export interface ApprovalContext {
  toolName: string
  args: Record<string, unknown>
}

export type Decision = 'approve' | 'deny' | null

export interface AutoApprovalRule {
  name: string
  evaluate(_ctx: ApprovalContext): Decision
}

/** Read-only file tools are always auto-approved. */
export class ReadOnlyToolsAutoApprovalRule implements AutoApprovalRule {
  name = 'ReadOnlyTools'
  private readOnly = new Set([
    'file_access_read_file',
    'file_access_list_files',
    'file_access_search_files',
  ])
  evaluate(ctx: ApprovalContext): Decision {
    return this.readOnly.has(ctx.toolName) ? 'approve' : null
  }
}

/** Provisioning auto-approved for free plan or amount < 500, else requires approval. */
export class SmallProvisionRule implements AutoApprovalRule {
  name = 'SmallProvision'
  evaluate(ctx: ApprovalContext): Decision {
    if (ctx.toolName !== 'provision_account') return null
    const plan = String(ctx.args.plan || '').toLowerCase()
    const amount = Number(ctx.args.amount ?? 0)
    if (plan === 'free' || amount < 500) return 'approve'
    return 'deny' // requires human approval
  }
}

/** Shell + codeact + file writes/deletes always require approval (no auto-rule). */
export class RiskyRequiresApprovalRule implements AutoApprovalRule {
  name = 'RiskyRequiresApproval'
  private risky = new Set([
    'run_shell',
    'codeact_run',
    'file_access_save_file',
    'file_access_delete_file',
  ])
  evaluate(ctx: ApprovalContext): Decision {
    return this.risky.has(ctx.toolName) ? 'deny' : null
  }
}

export class AutoApprovalEngine {
  private rules: AutoApprovalRule[]
  constructor(rules?: AutoApprovalRule[]) {
    this.rules = rules ?? [
      new ReadOnlyToolsAutoApprovalRule(),
      new SmallProvisionRule(),
      new RiskyRequiresApprovalRule(),
    ]
  }

  /** Returns the decision of the first matching rule, or 'deny' if none match
   *  (fail-safe: unknown risky tools must be approved by a human). */
  decide(ctx: ApprovalContext): 'approve' | 'deny' {
    for (const rule of this.rules) {
      const d = rule.evaluate(ctx)
      if (d === 'approve' || d === 'deny') return d
    }
    return 'deny'
  }

  /** Convenience: true if the tool can run without a human in the loop. */
  isAutoApproved(ctx: ApprovalContext): boolean {
    return this.decide(ctx) === 'approve'
  }
}
