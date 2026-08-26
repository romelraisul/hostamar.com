# Model Context Table

Generated 2026-08-26T01:05:38.188Z by scripts/gen-context-table.mjs from model-catalog.generated.ts.
Context values are LIVE upstream values (kilo/openrouter metadata) or empirical probes (opencode zen).
Every served label ends with `[ctx]`; /v1/chat/completions strips it before forwarding.

| Model | Label | Context | Free | Route |
|---|---|---|---|---|
| deepseek/deepseek-v4-flash-0731 | [1.3M] | 1,310,720 tok |  | "openrouter" |
| meituan/longcat-2.0-free | [1M] | 1,048,756 tok | yes | "kilo" |
| hostamar-1m-a | [1M] | 1,048,576 tok |  | "hostamar" |
| hostamar-1m-b | [1M] | 1,048,576 tok |  | "hostamar" |
| meta/muse-spark-1.2 | [1M] | 1,048,576 tok |  | "openrouter" |
| minimax/minimax-m3:free | [1M] | 1,048,576 tok | yes | "openrouter" |
| minimaxai/minimax-m3 | [1M] | 1,048,576 tok |  | "nvidia" |
| moonshotai/kimi-k3 | [1M] | 1,048,576 tok |  | "openrouter" |
| opencode/hy3-free | [1M] | 1,048,576 tok | yes | "opencode" |
| opencode/mimo-v2.5-free | [1M] | 1,048,576 tok | yes | "opencode" |
| opencode/nemotron-3-ultra-free | [1M] | 1,048,576 tok | yes | "opencode" |
| opencode/nemotron-3.5-lightning-free | [1M] | 1,048,576 tok | yes | "opencode" |
| opencode/x-preview-f-free | [1M] | 1,048,576 tok | yes | "opencode" |
| poolside/laguna-s-2.1 | [1M] | 1,048,576 tok |  | "openrouter" |
| stealth/ox-alpha | [1M] | 1,048,576 tok | yes | "kilo" |
| thinkingmachines/inkling | [1M] | 1,048,576 tok |  | "openrouter" |
| thinkingmachines/inkling-small | [1M] | 1,048,576 tok |  | "openrouter" |
| thinkingmachines/inkling-small:free | [1M] | 1,048,576 tok | yes | "openrouter" |
| thinkingmachines/inkling:free | [1M] | 1,048,576 tok | yes | "openrouter" |
| z-ai/glm-5.3 | [1M] | 1,048,576 tok |  | "openrouter" |
| minimax/minimax-m1 | [1M] | 1,000,000 tok |  | "openrouter" |
| nvidia/nemotron-3-super-120b-a12b | [1M] | 1,000,000 tok |  | "nvidia" |
| nvidia/nemotron-3-ultra-550b-a55b:free | [1M] | 1,000,000 tok | yes | "openrouter" |
| nvidia/nemotron-3.5-lightning:free | [1M] | 1,000,000 tok | yes | "openrouter" |
| qwen/qwen3.7-flash | [1M] | 1,000,000 tok |  | "openrouter" |
| qwen/qwen3.8-max | [1M] | 1,000,000 tok |  | "openrouter" |
| nvidia/nemotron-3-ultra-550b-a55b | [512K] | 512,288 tok |  | "nvidia" |
| dots-studio/dots-3-note-preview:free | [512K] | 512,000 tok | yes | "openrouter" |
| x-ai/grok-4.6 | [500K] | 500,000 tok |  | "openrouter" |
| google/gemma-4-26b-a4b-it:free | [262K] | 262,144 tok | yes | "openrouter" |
| google/gemma-4-31b-it | [262K] | 262,144 tok |  | "openrouter" |
| google/gemma-4-31b-it:free | [262K] | 262,144 tok | yes | "openrouter" |
| moonshotai/kimi-k2.6 | [262K] | 262,144 tok |  | "openrouter" |
| nvidia/nemotron-3-nano-30b-a3b | [262K] | 262,144 tok |  | "nvidia" |
| nvidia/nemotron-3-super-120b-a12b:free | [262K] | 262,144 tok | yes | "openrouter" |
| opencode/laguna-s-2.1-free | [262K] | 262,144 tok | yes | "opencode" |
| poolside/laguna-s-2.1:free | [262K] | 262,144 tok | yes | "openrouter" |
| poolside/laguna-xs-2.1 | [262K] | 262,144 tok |  | "openrouter" |
| poolside/laguna-xs-2.1:free | [262K] | 262,144 tok | yes | "openrouter" |
| stepfun/step-3.7-flash:free | [262K] | 262,144 tok | yes | "kilo" |
| tencent/hy3:free | [262K] | 262,144 tok | yes | "kilo" |
| ai21labs/jamba-1.5-large-instruct | [256K] | 256,000 tok |  | "nvidia" |
| cohere/north-mini-code:free | [256K] | 256,000 tok | yes | "openrouter" |
| kilo-auto/free | [256K] | 256,000 tok | yes | "kilo" |
| nvidia/nemotron-3-nano-omni-30b-a3b-reasoning | [256K] | 256,000 tok |  | "nvidia" |
| nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free | [256K] | 256,000 tok | yes | "openrouter" |
| z-ai/glm-5.2:free | [256K] | 256,000 tok | yes | "openrouter" |
| openrouter/free | [200K] | 200,000 tok | yes | "openrouter" |
| minimax/minimax-m2.7:free | [197K] | 196,608 tok | yes | "openrouter" |
| deepseek-ai/deepseek-v4-flash-0731 | [164K] | 163,840 tok |  | "nvidia" |
| google/gemma-3-12b-it | [131K] | 131,072 tok |  | "nvidia" |
| google/gemma-3-4b-it | [131K] | 131,072 tok |  | "nvidia" |
| meta/muse-glimmer-30b | [131K] | 131,072 tok |  | "openrouter" |
| openai/gpt-oss-120b | [131K] | 131,072 tok |  | "openrouter" |
| openai/gpt-oss-20b | [131K] | 131,072 tok |  | "openrouter" |
| ibm/granite-3.0-8b-instruct | [128K] | 128,000 tok |  | "nvidia" |
| ibm/granite-8b-code-instruct | [128K] | 128,000 tok |  | "nvidia" |
| meta/llama-3.1-70b-instruct | [128K] | 128,000 tok |  | "nvidia" |
| meta/llama-3.1-8b-instruct | [128K] | 128,000 tok |  | "nvidia" |
| meta/llama-3.2-11b-vision-instruct | [128K] | 128,000 tok |  | "nvidia" |
| meta/llama-3.2-1b-instruct | [128K] | 128,000 tok |  | "nvidia" |
| meta/llama-3.2-3b-instruct | [128K] | 128,000 tok |  | "nvidia" |
| meta/llama-3.2-90b-vision-instruct | [128K] | 128,000 tok |  | "nvidia" |
| meta/llama-3.3-70b-instruct | [128K] | 128,000 tok |  | "nvidia" |
| microsoft/phi-3-vision-128k-instruct | [128K] | 128,000 tok |  | "nvidia" |
| microsoft/phi-3.5-moe-instruct | [128K] | 128,000 tok |  | "nvidia" |
| mistralai/mistral-large | [128K] | 128,000 tok |  | "nvidia" |
| mistralai/mistral-large-2-instruct | [128K] | 128,000 tok |  | "nvidia" |
| mistralai/mistral-nemotron | [128K] | 128,000 tok |  | "nvidia" |
| nv-mistralai/mistral-nemo-12b-instruct | [128K] | 128,000 tok |  | "nvidia" |
| nvidia/cosmos-reason2-8b | [128K] | 128,000 tok |  | "nvidia" |
| nvidia/llama-3.1-nemotron-51b-instruct | [128K] | 128,000 tok |  | "nvidia" |
| nvidia/llama-3.1-nemotron-70b-instruct | [128K] | 128,000 tok |  | "nvidia" |
| nvidia/llama-3.1-nemotron-nano-8b-v1 | [128K] | 128,000 tok |  | "nvidia" |
| nvidia/llama-3.1-nemotron-nano-vl-8b-v1 | [128K] | 128,000 tok |  | "nvidia" |
| nvidia/llama-3.1-nemotron-ultra-253b-v1 | [128K] | 128,000 tok |  | "nvidia" |
| nvidia/llama-3.3-nemotron-super-49b-v1 | [128K] | 128,000 tok |  | "nvidia" |
| nvidia/llama-3.3-nemotron-super-49b-v1.5 | [128K] | 128,000 tok |  | "nvidia" |
| nvidia/nemotron-3.5-content-safety:free | [128K] | 128,000 tok | yes | "openrouter" |
| nvidia/nemotron-3.5-lightning-30b-a3b | [128K] | 128,000 tok |  | "nvidia" |
| nvidia/nemotron-nano-12b-v2-vl | [128K] | 128,000 tok |  | "nvidia" |
| nvidia/nemotron-nano-3-30b-a3b | [128K] | 128,000 tok |  | "nvidia" |
| nvidia/nvidia-nemotron-nano-9b-v2 | [128K] | 128,000 tok |  | "nvidia" |
| nvidia/vila | [128K] | 128,000 tok |  | "nvidia" |
| writer/palmyra-creative-122b | [128K] | 128,000 tok |  | "nvidia" |
| writer/palmyra-med-70b | [128K] | 128,000 tok |  | "nvidia" |
| zyphra/zamba2-7b-instruct | [128K] | 128,000 tok |  | "nvidia" |
| liquid/lfm-2.5-2.6b:free | [66K] | 65,536 tok | yes | "openrouter" |
| mistralai/mixtral-8x22b-v0.1 | [64K] | 64,000 tok |  | "nvidia" |
| hostamar-own | [33K] | 32,768 tok |  | "hostamar" |
| minimax-m3 | [33K] | 32,768 tok |  | "hostamar" |
| 01-ai/yi-large | [32K] | 32,000 tok |  | "nvidia" |
| databricks/dbrx-instruct | [32K] | 32,000 tok |  | "nvidia" |
| mistralai/codestral-22b-instruct-v0.1 | [32K] | 32,000 tok |  | "nvidia" |
| mistralai/mistral-7b-instruct-v0.3 | [32K] | 32,000 tok |  | "nvidia" |
| stepfun-ai/step-3.7-flash | [32K] | 32,000 tok |  | "nvidia" |
| writer/palmyra-fin-70b-32k | [32K] | 32,000 tok |  | "nvidia" |
| writer/palmyra-med-70b-32k | [32K] | 32,000 tok |  | "nvidia" |
| bigcode/starcoder2-15b | [16K] | 16,000 tok |  | "nvidia" |
| deepseek-ai/deepseek-coder-6.7b-instruct | [16K] | 16,000 tok |  | "nvidia" |
| meta/codellama-70b | [16K] | 16,000 tok |  | "nvidia" |
| google/codegemma-1.1-7b | [8K] | 8,000 tok |  | "nvidia" |
| google/codegemma-7b | [8K] | 8,000 tok |  | "nvidia" |
| google/gemma-2b | [8K] | 8,000 tok |  | "nvidia" |
| google/recurrentgemma-2b | [8K] | 8,000 tok |  | "nvidia" |
| ibm/granite-34b-code-instruct | [8K] | 8,000 tok |  | "nvidia" |
| nvidia/llama3-chatqa-1.5-70b | [8K] | 8,000 tok |  | "nvidia" |
| nvidia/mistral-nemo-minitron-8b-8k-instruct | [8K] | 8,000 tok |  | "nvidia" |
| nvidia/nemotron-parse | [8K] | 8,000 tok |  | "nvidia" |
| meta/llama2-70b | [4K] | 4,096 tok |  | "nvidia" |
| microsoft/kosmos-2 | [4K] | 4,096 tok |  | "nvidia" |
| aisingapore/sea-lion-7b-instruct | [4K] | 4,000 tok |  | "nvidia" |
| ibm/granite-3.0-3b-a800m-instruct | [4K] | 4,000 tok |  | "nvidia" |
| nvidia/nemotron-4-340b-instruct | [4K] | 4,000 tok |  | "nvidia" |
| nvidia/nemotron-4-340b-reward | [4K] | 4,000 tok |  | "nvidia" |
| nvidia/nemotron-mini-4b-instruct | [4K] | 4,000 tok |  | "nvidia" |
| nvidia/neva-22b | [4K] | 4,000 tok |  | "nvidia" |
| nvidia/riva-translate-4b-instruct | [4K] | 4,000 tok |  | "nvidia" |
| nvidia/riva-translate-4b-instruct-v1.1 | [4K] | 4,000 tok |  | "nvidia" |
| nvidia/riva-translate-4b-instruct-v2 | [4K] | 4,000 tok |  | "nvidia" |

Total: **120** models · free: **29** · ≥1M: **26**
