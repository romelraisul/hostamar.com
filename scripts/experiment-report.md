# Onboarding V2 Experiment Report

**Date:** 2026-06-21  
**Experiment:** `onboarding_v2` — shorter email-capture flow vs original 3-step modal  
**Status:** DEPLOYED — data collection in progress  

---

## Hypothesis

V2 (email capture + immediate Generate CTA) will increase `create_game_rate` by 15% and `subscribe_rate` by 10% compared to the control (3-step modal).

## Methodology

- **Split:** 50/50 via `lib/feature-flags.ts` — `assignVariant('onboarding_v2')` on first visit
- **Minimum sample:** 1,000 unique users or 14 days
- **Statistical test:** Two-proportion z-test, α = 0.05
- **Primary metric:** `create_game_rate` within 7 days of first visit
- **Secondary metrics:** `first_move_rate`, `subscribe_rate`, `email_capture_rate`

## Events tracked

| Event | Component | Trigger |
|---|---|---|
| `onboarding_v2_email_submitted` | OnboardingV2 | User submits email |
| `onboarding_v2_generate_clicked` | OnboardingV2 | User clicks Generate |
| `onboarding_v2_completed` | OnboardingV2 | Video generation started |
| `onboarding_v2_skipped` | OnboardingV2 | User dismisses modal |
| `experiment_assigned` | feature-flags.ts | User assigned to variant |
| `signup` | signup page | User completes signup |
| `create_game` | game creation | User creates a game |
| `subscribe` | billing | User subscribes |

## Current state (as of 2026-06-21)

**Data collection has just begun.** The experiment was deployed with v1.0.2. No statistically significant results yet.

| Variant | Users | Create Game Rate | Subscribe Rate |
|---|---|---|---|
| Control | 0* | — | — |
| V2 | 0* | — | — |

\* No real user traffic yet. E2E tests fired test events.

## Next actions

1. **Wait for 1,000 unique users or 14 days** — whichever comes first
2. **Run analysis** — two-proportion test comparing control vs v2
3. **If v2 wins (p < 0.05 and effect > 10%):** PR to flip flag to `on`
4. **If inconclusive:** design V3 with copy/CTA changes and extend experiment

## Rollback

- Flip flag: remove `assignVariant` call in `OnboardingV2.tsx` and deploy
- Or set env var: `NEXT_PUBLIC_FEATURE_FLAGS='{"onboarding_v2":"control"}'`
