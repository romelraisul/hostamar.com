/**
 * Feature flag client — lightweight A/B experiment framework.
 *
 * Usage:
 *   const ab = useFeatureFlag('onboarding_v2')
 *   if (ab.variant === 'v2') { /* show v2 onboarding */ }
 *
 * Flags are stored in localStorage and can be overridden via URL param:
 *   ?ff_onboarding_v2=v2
 *   ?ff_onboarding_v2=control
 *
 * Environment variables:
 *   NEXT_PUBLIC_FEATURE_FLAGS='{"onboarding_v2":"v2"}'  — force a variant globally
 */

type Variant = 'control' | string
type FlagStore = Record<string, Variant>

const STORAGE_KEY = 'hostamar_ff'

function getFlags(): FlagStore {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function setFlags(flags: FlagStore) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(flags))
}

/** Read a feature flag variant for the current request. */
export function getFeatureFlag(name: string): Variant {
  // 1. URL param overrides everything
  if (typeof window !== 'undefined') {
    const urlParam = new URLSearchParams(window.location.search).get(`ff_${name}`)
    if (urlParam) return urlParam
  }

  // 2. Environment-level global override
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_FEATURE_FLAGS) {
    try {
      const envFlags = JSON.parse(process.env.NEXT_PUBLIC_FEATURE_FLAGS)
      if (envFlags[name]) return envFlags[name]
    } catch {}
  }

  // 3. localStorage (set by previous assignment or experiment enrollment)
  const stored = getFlags()
  if (stored[name]) return stored[name]

  // 4. Default: control
  return 'control'
}

/** Assign a user to a variant (50/50 split). Call once on signup or first visit. */
export function assignVariant(name: string): Variant {
  const flags = getFlags()
  if (flags[name]) return flags[name] // already assigned

  const variant = Math.random() < 0.5 ? 'control' : 'v2'
  flags[name] = variant
  setFlags(flags)

  // Track assignment to analytics
  if (typeof window !== 'undefined') {
    try {
      // @ts-ignore
      window.plausible?.('experiment_assigned', { props: { experiment: name, variant } })
    } catch {}
  }

  return variant
}

/** React hook version. */
export function useFeatureFlag(name: string): { variant: Variant; assign: () => Variant } {
  if (typeof window === 'undefined') {
    return { variant: 'control', assign: () => 'control' }
  }
  const variant = getFeatureFlag(name)
  return { variant, assign: () => assignVariant(name) }
}
