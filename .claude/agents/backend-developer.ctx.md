# Backend Developer Context — auto-leverage

## Product
Stateless advisory API. Receives user questionnaire responses → returns component classification + guide + LLM prompt. No auth, no persistence.

## Stack
Next.js 14 App Router API routes (TypeScript). No separate backend service. No database. Deployed on Vercel at `auto-leverage.vercel.com`.

## API Shape
All responses: `{ data: T | null, error: string | null, meta?: object }`

## Core Endpoints (MVP)
- `POST /api/classify` — receives user free-text + questionnaire answers, returns component classification (prepare / train / program) + confidence score
- `POST /api/output` — receives confirmed classification, returns structured guide + LLM prompt string
- No auth endpoints, no session endpoints, no user endpoints

## Questionnaire Engine
- **Static tree**: JSON/YAML config file defines question nodes, branch conditions, and terminal outcomes. Loaded server-side, version-controlled, editable without code changes.
- **LLM fallback**: triggered when static classifier confidence < threshold (configurable). Calls Claude API with structured prompt, extracts component label from response, resolves to static output template. Never returns raw LLM text directly to user.
- **Fallback isolation**: LLM calls are server-side only. ANTHROPIC_API_KEY loaded from env — never in client bundle.

## Data Model (stateless — no DB for MVP)
No database. All state is request-scoped. If analytics become valuable later, add a lightweight event store (Supabase or Posthog) — defer until post-MVP.

## Output Templates
Templates for each component keyed by: `prepare` | `train` | `program` | `prepare+train` | `prepare+program` | `train+program` | `all`
Each template contains: `guide_steps: string[]`, `llm_prompt: string`, `component_summary: string`

## LLM Prompt Template Content
The LLM prompt our platform generates is a high-quality **program.md-style instruction set** — what to tell the autoresearch agent to try, what to optimise, what constraints to apply. It is NOT a setup script or Claude Code kickoff command.

Each template is keyed to the component(s) the user needs:
- **prepare** → prompt focuses on: goal specification for data/evaluation context, what metric to watch, what the evaluation baseline means
- **train** → prompt focuses on: what to optimise (speed, model quality, cost), constraints (time budget, memory limit), what directions to explore in train.py
- **program** → prompt focuses on: clear goal statement, iteration strategy, what "success" means for their use case, how to guide the agent's research direction

## Autoresearch Domain Knowledge
- **prepare.py**: downloads Shakespeare dataset, trains BPE tokenizer, defines `DataLoaderLite` (batch loading with sharding), `evaluate()` function. Fixed — agent never edits this. Backend prompts referencing this component focus on: data format, tokenizer vocab size, evaluation metric (val loss), dataloader config.
- **train.py**: full GPT-2-style model (CausalSelfAttention, MLP, Block, GPT), Muon optimizer + AdamW for embeddings/biases, training loop with gradient accumulation, DDP support. Agent edits this. Backend prompts for this component cover: model architecture changes, optimizer tuning, batch size, learning rate schedule, context length.
- **program.md**: plain-text instructions the human gives the agent (e.g., "minimize val loss on Shakespeare, budget 1 hour"). Human edits this. Backend prompts for this component focus on: goal specification, constraint setting, agent instruction clarity, iteration strategy.

## Key Constraints
- API key never in client bundle
- LLM fallback must resolve to static output — no free-form LLM output to users
- Stateless: no DB, no user data stored, no PII collected
