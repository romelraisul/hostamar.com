# FB DM Templates — BD outreach (Day1 + Day3)

Grounded from launch instructions. Personalized per row in
`working/outbound/daraz-20.csv` (`{ownerName}`, `{shopName}`, `{topProduct}`,
`{personalizedVideoUrl}`, `{loomUrl}`, `{otherShopName}`).

## Day1 — FB Page inbox / DM (40%+ open: proof not pitch)

> Assalamualaikum {ownerName} bhai, {shopName} er {topProduct} er jonno 30s er ekta reel baniye dilam - {personalizedVideoUrl}
>
> Loom e dekhalam keno eta boosting e CTR barabe: {loomUrl}
>
> 5 ta free try korte chaile product er 3 ta image den, ami baki 2 ta ekhuni baniye dei - bKash lagbe na.

Why it works in BD:
1. Line1 = proof, not ask — you already did work, not asking for a meeting.
2. Line2 = Loom shows your face + their product, not generic agency spam.
3. Line3 = zero-friction CTA, no bKash mention on Day1, just 3 images.

## Day3 follow-up (if seen but no reply)

> Bhai {topProduct} er video ta dekhte perechen? {otherShopName} er moto 12 product thakle 1 reel e 8% CTR drop hoy - apnar ta te hook add korle 3x hobe. Free 5 ta sesh hole janayen.

## Send path
- FB Page inbox (manual, ToS-safe) OR email from `sequence-1.json` (8fb8880).
- Track each send in `tracking.json` (schema: `working/outbound/tracking-schema.json`).
- After 3 paid via bKash → `Payment.organizationId` = their org → `measureMRR` flips to real.
