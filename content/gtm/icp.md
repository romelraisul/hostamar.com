# Hostamar ICP — Ideal Customer Profiles (Not Instagram)

> Sell where customers already live and already pay. Three ICPs, ordered by close speed.
> Grounded in the shipped product on `main` b6ad042: 7 products + SAML SSO (tenant-isolated) + validation + 3-tier support + status page.

---

## ICP 1 — Daraz Seller (PRIMARY, highest volume)

**Firmographic**
- 50+ orders/month
- 3+ staff
- Facebook page with 5k+ followers, already boosting posts
- Already pays ExonHost / has a bKash merchant account

**Pain**
- Video creation is the bottleneck: agency charges **৳500/reel**, **3-day turnaround**
- Products outnumber content (e.g. 12 products, 2 reels)
- Tool sprawl: hosting + video + chat + reporting all separate

**Where they live (NOT ads)**
- Daraz Seller Facebook groups
- BASIS SME member list
- bKash merchant directory (public)

**Message (Loom 45s, personalized)**
> "Saw **{shopName}** has **{productCount}** products but only **{reelCount}** reels. I made 1 for **{topProduct}** in 30s — **{loomLink}**. Hostamar does this for all your products, hosting included, for the **৳3500** you already pay across ExonHost + CapCut + ChatGPT."

**Anchor:** ৳8000+/mo of 5 tools → ৳3500/mo all-in.

---

## ICP 2 — Dhaka Agency (SECONDARY, faster close)

**Firmographic**
- 10+ SME clients
- Manages client Facebook pages
- Already pays for 5+ tools

**Pain**
- Tool sprawl across every client
- Client reporting is manual
- No white-label story for enterprise clients

**Offer**
- **Agency plan ৳7000/mo** = 3 orgs, white-label status page, SAML SSO for their enterprise clients
- Cross-sell: each client org is tenant-isolated (PR d / b6ad042)

**Message**
> "You're managing 10 clients across 5 tools. Hostamar gives you 3 white-label orgs, a status page you brand, and SAML for the enterprise ones — one ৳7000 bill instead of chasing 5 renewals."

---

## ICP 3 — Enterprise Procurement (SSO checklist sender)

**Needs (the checklist they email you)**
- `docs/enterprise/sso.md` — SAML 2.0 setup
- `/status` — live status page
- `/docs/sops` — runbooks
- Tenant isolation audit → commit **988e14a**
- Input validation → commit **dcddc73**
- Isolation shipped → commit **b6ad042**

**Trust packet**
- `docs/enterprise/trust-packet.md` links: pipeline **5d5f827**, audit **988e14a**, validation **dcddc73**, isolation **b6ad042**, drift **0**.

**Message**
> "Attached is our trust packet: SAML SSO with per-tenant isolation, input validation, a public status page, and runbooks — with the exact commits your security team can audit."

---

## Placeholder contract (filled by GoalRunner + Qdrant, never manual)

| Placeholder | Source |
|---|---|
| `{shopName}` | Qdrant company research |
| `{productCount}` | Daraz/FB scrape |
| `{reelCount}` | FB page scrape |
| `{topProduct}` | Qdrant / order-volume research |
| `{loomLink}` | auto-generated 45s Hostamar Video render |
| `{name}` | contact enrichment |

All outbound touches in `working/outbound/sequence-1.json` reference these placeholders; GoalRunner's `create_task outbound-daraz-seller-20` fills them from Qdrant before send.
