# Onboarding Experiments

## Setup

Feature flags are managed via `lib/feature-flags.ts`:
- URL param: `?ff_onboarding_v2=v2` forces the v2 variant
- localStorage: assigned on first visit via 50/50 split
- Env var: `NEXT_PUBLIC_FEATURE_FLAGS='{"onboarding_v2":"v2"}'` forces globally

## Variants

### Control (default)
Current 3-step modal: Welcome → Pick template → Generate video.  
Dismissed via localStorage. Tracks `onboarding_step_{0|1|2}`, `onboarding_completed`, `onboarding_skipped`.

### V2 (experiment)
Short 2-step flow with email capture and immediate CTA to generate:
1. "Create your first video in 30 seconds" — prompt input + Generate button
2. "Want more?" — email capture + Start Free Trial CTA

## Metrics to watch

| Event | Funnel step | Target improvement |
|---|---|---:|
| `onboarding_seen` | Impression | — |
| `onboarding_step_0` | Started flow | — |
| `onboarding_completed` | Finished flow | +20% vs control |
| `signup` | Signed up | +15% vs control |
| `create_game` | Created game | +10% vs control |
| `subscribe` | Subscribed | — (longer tail) |

## How to run experiment

1. Deploy to staging, verify both variants load
2. Set experiment in production via env var or wait for 50/50 split
3. Monitor analytics dashboard for 7 days
4. Promote winning variant: update `assignVariant()` default or remove control path
5. Record results in `RUNBOOK.md`
