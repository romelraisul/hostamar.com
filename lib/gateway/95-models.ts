// LEGACY COMPATIBILITY SHIM — the real catalog lives in model-catalog.generated.ts,
// regenerated from live upstreams by `node scripts/gen-model-catalog.mjs`.
// Existing imports (MODELS_95 / CONTEXT_MAP / formatContext) keep working unchanged.
export {
  CATALOG_MODELS,
  CATALOG_MODELS as MODELS_95,
  CONTEXT_MAP_GENERATED,
  CONTEXT_MAP_GENERATED as CONTEXT_MAP,
  ROUTE_MAP,
} from './model-catalog.generated'

export function formatContext(len: number): string {
  if (len >= 1000000) return `${Math.round((len / 1000000) * 10) / 10}M`
  if (len >= 1000) return `${Math.round(len / 1000)}K`
  return `${len}`
}
