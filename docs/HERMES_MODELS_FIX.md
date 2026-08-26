# HERMES IDE MODELS FIX — 7 hardcoded → 95 always-on

Date: 2026-08-25

## Symptom

Hermes IDE "Hostamar" provider showed only 7 models:
`rafan, rushan, borna, hostamar, image, video, romelraisul`

## Root cause (NOT a cache problem)

`~/.hermes/config.yaml` → `custom_providers[]` entry `Hostamar` was still pointed at
the OLD dead local gateway:

```yaml
- name: Hostamar
  base_url: http://172.17.112.1:11450/v1     # dead local rafan gateway
  model: rushan
  models:                                     # 7 hardcoded ids = what IDE showed
    rushan: {} ... romelraisul: {}
```

The IDE renders exactly the `models:` allowlist on that entry. It never talked to
hostamar.com/v1 at all.

## Fix applied

Entry rewritten in place (line-replace via Python, comments preserved, backup kept):

```yaml
- name: Hostamar
  base_url: https://hostamar.com/v1
  key_env: HERMES_CUSTOM_HOSTAMAR_COM_API_KEY
  model: moonshotai/kimi-k3
  discover_models: true
  models_discovered: true
```

No hardcoded `models:` block → live discovery from /v1/models.

## Verified end-to-end (hermes_cli's own picker code)

```
config entry: Hostamar https://hostamar.com/v1 | models: none (live)
PICKER -> count: 95 | first: moonshotai/kimi-k3 | last: minimax-m3
cached_fetch_api_models(key, https://hostamar.com/v1) → 95
```

The API key env var HERMES_CUSTOM_HOSTAMAR_COM_API_KEY already existed and works
against the always-on Vercel gateway.

Backup: ~/.hermes/config.yaml.bak.20260825-232343

## For every customer

Nothing server-side needed: any customer whose IDE provider has
`base_url: https://hostamar.com/v1` + a valid Hostamar API key now discovers all 95
models live (kimi-k3 first, minimax-m3 last). The old 7-model list only existed for
users pinned to the legacy local gateway URL — that URL is dead anyway.

Setup snippet for new customers:

```yaml
custom_providers:
  - name: Hostamar
    base_url: https://hostamar.com/v1
    api_key_env: HOSTAMAR_API_KEY        # their key from hostamar.com/developers
    model: moonshotai/kimi-k3
    discover_models: true
```

## Note

`hermes config set custom_providers[...]...` mangles array entries (writes broken
literal keys) — always edit this file with a targeted Python line-replace and verify
with yaml.safe_load afterwards.

## Context window labels (added 2026-08-25)

Every model now carries its context window so customers choose big vs small tasks:

- `/v1/models` returns `display_name` (`moonshotai/kimi-k3 [1M]`), `context_length`,
  and `context` per model. `id` stays clean for API calls.
- Chat route accepts BOTH plain ids and suffixed display ids — the `[ctx]` suffix
  is stripped server-side before proxying.
- Full sortable table: docs/MODEL_CONTEXT_TABLE.md

## IDE picker labels (2026-08-26)

The Hermes custom-provider picker now renders the `[ctx]` label directly:

- `hermes_cli/models.py` → `probe_api_models` prefers each entry's
  `display_name` from the /v1/models response (falls back to building
  `"id [context]"` server-side). Picker rows show e.g.
  `moonshotai/kimi-k3 [1M]`, `hostamar-own [33K]`.
- `hermes_cli/model_switch.py` → `_resolve_named_custom_model_id` strips a
  trailing `[...]` suffix before matching, so a picked label resolves to the
  clean id; the chat endpoint also tolerates suffixes as a second safety net.

Backups: models.py.bak.20260826-000739, model_switch.py.bak.* in hermes-agent.
Note: these are local patches — a `hermes update` that overwrites hermes_cli will
revert them until upstreamed.

| Model | Context | Use Case |
|---|---|---|
| moonshotai/kimi-k3 [1M] | 1M | Big codebase, long docs |
| moonshotai/kimi-k2-0711-preview [200K] | 200K | Long conversations, big files |
| minimax/minimax-m1 [1M] | 1M | Big codebase, long docs |
| openrouter free models [128K] | 128K | Medium tasks |
| hostamar-own [33K] | 33K | Small tasks, fast |
