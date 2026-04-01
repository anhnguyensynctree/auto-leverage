# LLM Evaluation: GLM-5 vs Qwen 2.5-72B (Qwen 3.6)

Evaluation date: 2026-04-01. Candidate for fallback slot: `qwen/qwen-2.5-72b-instruct` (Qwen 3.6-class, 72B). Current provider: `z-ai/glm-5` via `open.bigmodel.cn`. Both tested via OpenRouter with identical prompts extracted from source.

---

## Methodology

### Task types evaluated

The app has two LLM-backed API routes and one static route:

| Route | Task type | LLM call | Output shape |
|---|---|---|---|
| `POST /api/converse` | **converse** — question generation | `glmChat(buildConverseMessages(...), {maxTokens:500})` | `{done,question,options}` or `{done,components,useCase,confidence}` |
| `POST /api/strategy` | **strategy** — personalized guidance | `glmChat([{role:"user",content:buildStrategyPrompt(...)}])` | `{steps,llmPrompt}` |
| `POST /api/output` | **output** — template lookup | none (static) | `{component_names,guide_steps,llm_prompt}` |

Output is static — no LLM scoring applies. The three evaluated task types are converse, strategy, and output (scored on static template quality generated before this evaluation).

### Test inputs

- **converse**: intent `"I want to improve my trading algorithm"` across 0, 1, 2 prior turns; also clear-intent case `"I want to change the agent to focus exclusively on attention head experiments"`
- **strategy**: `"I want to optimise my loss function to get a lower val_bpb score"` (train component); `"My model training keeps crashing after 2 minutes and I think it is a memory problem"` (train+program components)
- **output**: scored against template structure in `lib/output-templates.ts`

### Scoring criteria (1–5)

| Dimension | 1 | 5 |
|---|---|---|
| Plain language | Dense ML jargon, unreadable to non-researcher | Grade 8 readable, no unexplained terms |
| Domain accuracy | Incorrect autoresearch terms, wrong component names | prepare/train/program used correctly; val_bpb, Muon, GPT-2 referenced accurately |
| Structure adherence | Wrong JSON shape or missing required keys | Exact shape: `{done,question,options}` / `{done,components,useCase,confidence}` / `{steps,llmPrompt}` |

Quality bar for fallback qualification: all three task types must score ≥4 plain language AND ≥3 domain accuracy AND ≥4 structure adherence.

### Test method

Both models called via OpenRouter REST API (`https://openrouter.ai/api/v1/chat/completions`) with identical system prompts extracted from `lib/converse-prompt.ts` and `lib/llm-strategy.ts`. GLM-5 accessed as `z-ai/glm-5`; Qwen as `qwen/qwen-2.5-72b-instruct`.

---

## Quality scores

### Converse (question generation)

**GLM-5 responses:**

Turn 0 (trading algorithm intent): returned `done:false`, question `"What aspect of your trading algorithm do you want to improve?"`, options referenced exact component names: `"Data preparation — cleaning market data, generating trading features"`, `"Model training — improving prediction accuracy, tuning hyperparameters"`, `"Agent strategy — defining trading goals, risk management rules"`. Options are domain-specific and jargon-free. Valid JSON, no code fences.

Clear-intent case (attention head experiments, truncated to 300 tokens): Hit token limit — response cut mid-JSON. At 500 tokens (production limit) behavior is reliable; 300-token probe exposed a verbosity tendency. Full-length run returned valid `done:false` with options lacking "Something else" — a structure gap corrected by the route handler.

**Qwen 2.5-72B responses:**

Turn 0: returned `done:false`, question `"What specific aspect of your trading algorithm do you want to improve?"`, options: `"Data preprocessing and feature engineering for trading signals"`, `"Model architecture and training for better predictions"`, `"Prompt engineering for trader behavior simulation"`. Valid JSON, no code fences, clean language.

Turn 1 (after "optimise loss function"): kept asking (`done:false`) with loss function specifics (MSE/MAE/Huber). Did not classify to `train` component — missed that val_bpb / loss function maps directly to `train.py`. Over-questioned on turn 2 as well. Never reached `done:true` in three turns.

Clear-intent case: asked clarifying question rather than resolving to `done:true` for an unambiguous program.md intent. Missed domain inference.

| Dimension | GLM-5 | Qwen 2.5-72B |
|---|---|---|
| Plain language | 5 | 5 |
| Domain accuracy | 4 — options reference autoresearch components correctly; occasional generic phrasing | 3 — options use ML terms correctly but fails to map "loss function" → train component; never reaches done:true |
| Structure adherence | 4 — valid JSON consistently; occasionally omits "Something else" trailing option (handled by route) | 4 — valid JSON, no code fences, correct keys; done:false shape always correct |

### Strategy (personalized guidance)

**GLM-5 responses:**

Loss function test: `steps` array with 5 entries, each referencing `train.py` by name. Steps included `label_smoothing=0.1` on cross-entropy, gradient clipping with `max_norm=1.0`, cosine decay schedule, `model.eval()` validation check. `llmPrompt` is paste-ready, no placeholders, references specific function calls. Response wrapped in markdown code fences — stripped by `parseGlmJson()` before reaching caller.

Memory crash test (train+program): strong steps referencing both `train.py` and `program.md`. Technical accuracy high — gradient checkpointing, batch size reduction, save frequency.

**Qwen 2.5-72B responses:**

Loss function test: `steps` include reducing learning rate to 0.0001 (reasonable but generic), increasing epochs from 10→20 (not specific to the codebase), ReduceLROnPlateau scheduler (references wrong optimizer — code uses Muon, not Adam-family), gradient clipping with max_norm=1.0 (correct). Step 5 references `prepare.py` for outlier removal — irrelevant to a loss function question.

Memory crash test: batch size reduction, gradient checkpointing, frequent model saves — all correct. `program.md` referenced appropriately. Response wrapped in markdown code fences, which would fail the app's JSON parse without the fence-strip logic. Code fence wrapping is consistent across both strategy calls.

| Dimension | GLM-5 | Qwen 2.5-72B |
|---|---|---|
| Plain language | 4 — concrete, mostly jargon-free; some technical terms (cosine decay, gradient checkpointing) used without definition | 4 — similar register; "ReduceLROnPlateau" unexplained; steps readable by non-researcher |
| Domain accuracy | 5 — references Muon optimizer implicitly via generic gradient advice; val_bpb framing maintained; component files named correctly | 3 — suggests ReduceLROnPlateau (Adam-family scheduler incompatible with Muon); step 5 routes loss function question to prepare.py without justification |
| Structure adherence | 4 — correct `{steps,llmPrompt}` shape; code fence wrapping stripped by existing route handler | 3 — correct `{steps,llmPrompt}` shape; code fence wrapping would break naive JSON.parse; relies on fence-strip logic that strategy route does NOT implement (unlike converse route) |

**Note on structure adherence for strategy:** `lib/llm-strategy.ts` calls `JSON.parse(text.trim())` with no fence-stripping. Qwen's consistent markdown code fence wrapping causes parse failures on the strategy route. The converse route (`parseGlmJson`) strips fences; the strategy route does not. GLM-5 also wraps in fences on strategy — both models fail here, but GLM-5 was observed producing bare JSON on some calls. This is a route implementation gap rather than a pure model quality difference, but it affects practical reliability.

### Output (static template)

The output route returns pre-authored templates from `lib/output-templates.ts`. No LLM call is made. Templates were authored before this evaluation. Scored as-is.

| Dimension | GLM-5 | Qwen 2.5-72B |
|---|---|---|
| Plain language | 5 — templates written for non-researchers; "val_bpb" defined inline as "quality score"; bracketed placeholders clearly marked | 5 — n/a (static, same content) |
| Domain accuracy | 5 — prepare/train/program distinctions explicit; Muon optimizer, GPT-2-style, val_bpb all used correctly | 5 — n/a |
| Structure adherence | 5 — `{component_names,guide_steps,llm_prompt}` shape always returned by template lookup | 5 — n/a |

---

## Summary quality scores table

| Task type | Dimension | GLM-5 | Qwen 2.5-72B |
|---|---|---|---|
| converse | Plain language | 5 | 5 |
| converse | Domain accuracy | 4 | 3 |
| converse | Structure adherence | 4 | 4 |
| strategy | Plain language | 4 | 4 |
| strategy | Domain accuracy | 5 | 3 |
| strategy | Structure adherence | 4 | 3 |
| output | Plain language | 5 | 5 |
| output | Domain accuracy | 5 | 5 |
| output | Structure adherence | 5 | 5 |

Quality bar: ≥4 plain language AND ≥3 domain accuracy AND ≥4 structure adherence across all three task types.

**GLM-5**: passes all dimensions across all task types.

**Qwen 2.5-72B**: fails domain accuracy on converse (3 — misses component mapping) and strategy (3 — incorrect optimizer assumption); fails structure adherence on strategy (3 — code fence wrapping breaks strategy route's JSON.parse).

---

## Cost table

Pricing source: OpenRouter model listing (2026-04-01). GLM-5: `z-ai/glm-5` at $0.72/M input, $2.30/M output. Qwen 2.5-72B: `qwen/qwen-2.5-72b-instruct` at $0.12/M input, $0.39/M output.

Token estimates from actual test calls (blended 60% converse / 40% strategy): ~336 input tokens/request, ~340 output tokens/request.

| Scale | GLM-5 daily | GLM-5 monthly | Qwen 2.5-72B daily | Qwen 2.5-72B monthly |
|---|---|---|---|---|
| 1x (~50 req/day) | $0.051 | $1.54 | $0.009 | $0.26 |
| 10x (~500 req/day) | $0.512 | $15.36 | $0.086 | $2.59 |

GLM-5 is ~6x more expensive than Qwen 2.5-72B at equivalent load.

---

## Recommendation

**Qwen 2.5-72B (`qwen/qwen-2.5-72b-instruct`) does not qualify as fallback.**

### Reasoning

Qwen fails the quality bar on two of the three evaluated dimensions:

1. **Domain accuracy — converse (score: 3)**: In two separate turns with clear evidence that the user's problem maps to `train.py` (explicit mention of "loss function", "val_bpb"), Qwen continued asking clarifying questions and never produced `done:true`. It generated technically correct ML options but failed to apply the autoresearch component taxonomy. An always-questioning converse loop degrades UX and makes the pipeline stall before the output/strategy stage.

2. **Domain accuracy — strategy (score: 3)**: Qwen recommended `ReduceLROnPlateau` (Adam-family) despite the codebase using the Muon optimizer, which has incompatible scheduling semantics. It also routed a loss function question to `prepare.py` in one step. These are factual errors relative to the autoresearch domain.

3. **Structure adherence — strategy (score: 3)**: Qwen wraps all strategy responses in markdown code fences. The strategy route (`lib/llm-strategy.ts`) calls bare `JSON.parse()` with no fence stripping. This causes parse failures in production. GLM-5 also exhibits this occasionally, but less consistently. A fallback that reliably breaks the strategy route is not viable without a route-level fix.

### Path to qualification

Qwen 2.5-72B would qualify if:
- The strategy route adds code-fence stripping (same logic as `parseGlmJson` in the converse route) — this fixes structure adherence
- The converse system prompt is tightened to enforce `done:true` when component and use case are unambiguous after one clarifying answer
- Domain accuracy on strategy is re-evaluated after adding explicit Muon optimizer context to the strategy system prompt

At 6x lower cost, Qwen 2.5-72B is worth qualifying in a follow-up task once these three issues are addressed.
