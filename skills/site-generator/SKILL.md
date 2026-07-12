---
name: site-generator
description: Use this skill to scaffold a Bengali-first marketing / landing page for a Hostamar product and write it to the working/ folder as Markdown or HTML.
---

# Site Generator Skill

Generates a Bengali-first product landing page for one of Hostamar's 6 products
(Video, Hosting, Chat, Browser, IDE, Gaming).

## Inputs
- product: one of the 6 product keys
- tone: friendly / formal / promotional
- output: working/reports/<slug>.md or .html

## Steps
1. Pull product facts from `hostamar_kb` Qdrant collection (RAG).
2. Draft hero, features (3-5), pricing callout, FAQ (2-3), CTA.
3. Write the file via `file_access_save_file` (approval-gated).
4. Run `codeact_run` to compute an on-page SEO score (keyword density, length).

## Rules
- Bengali-first copy; English only for technical terms.
- Never invent pricing; use the canonical plan table (Free ৳0 / Starter ৳2,000 / Business ৳3,500).
- Cross-sell IN-PRODUCT only, never on the homepage hero.
