# CTO Context — auto-leverage

## Product
Advisory web platform. Non-technical users describe a problem → adaptive questionnaire → step-by-step guide + LLM prompt mapping them to autoresearch components. No code execution, no auth.

## Stack
- **Framework**: Next.js 14 App Router, TypeScript, Tailwind CSS
- **Deployment**: Vercel — target domain `auto-leverage.vercel.com`
- **API routes**: Next.js server-side API routes (no separate backend service)
- **No database**: stateless MVP — no ORM, no Supabase
- **Env vars**: ANTHROPIC_API_KEY (server-side only, never in client bundle)

## Architecture

### Questionnaire Engine
- **Primary path**: static decision tree — branching logic encoded as config/JSON, not hardcoded UI conditionals. Enables non-dev editing of question flows.
- **Fallback path**: LLM-driven classification when user input doesn't match static tree branches. Routes to Claude/OpenAI with a structured system prompt, extracts the component classification, then links result back to the static output template.
- **Cost rule**: LLM fallback fires only when static confidence is below threshold. LLM output always resolves to one of the static output templates — no free-form LLM output surfaced to users.

### Output Generation
- Two artifacts per session: (1) step-by-step guide rendered on-page, (2) copy-paste LLM prompt in a code block
- Output templates keyed to autoresearch component(s): prepare.py / train.py / program.md
- Export: copy to clipboard + optional text file download. No server-side storage.

### Session Model
- Fully stateless — no user accounts, no session persistence
- Questionnaire state: client-side only (React state or URL params for shareable links if desired)
- No backend database required for MVP

## The Autoresearch Loop (architectural context)
The agent runs a fixed loop: reads program.md → edits train.py → runs 5-minute training → measures val_bpb → git commits the change if val_bpb improved, discards if not → repeats. ~12 experiments/hour. prepare.py is never touched by the agent. Results tracked in results.tsv; graphs in analysis.ipynb.

**val_bpb**: validation bits per byte — vocabulary-independent measure of model quality. Lower = smarter. Baseline ~0.9979. This is the single metric the agent optimises.

## The 3 Autoresearch Components
1. **prepare.py** — one-time data prep: downloads Shakespeare dataset, trains BPE tokenizer, defines DataLoaderLite and evaluate(). Fixed — agent never touches it. User questions here are about data inputs and evaluation metrics.
2. **train.py** — the full GPT-2-style model (CausalSelfAttention, MLP, Block), Muon optimizer for weights + AdamW for embeddings/biases, training loop with gradient accumulation. Agent edits this. Everything is fair game: architecture depth/width, optimizer settings, learning rate schedule, batch size, context length.
3. **program.md** — plain-text mission briefing for the agent (e.g. "minimise val_bpb on Shakespeare, budget 1 hour"). Human edits this. This is the leverage point: better instructions = better research direction = faster progress. Karpathy frames it as "programming the research organisation, not individual experiments."

## Deployment Pipeline (OMS-managed)
- GitHub Actions CI: lint + type-check + unit tests on every PR
- Vercel: preview deployments on PR, production deploy on merge to main
- Env vars managed via Vercel dashboard (ANTHROPIC_API_KEY, CONFIDENCE_THRESHOLD)
- OMS owns the full pipeline spec — no manual deploy steps

## Vercel Setup — Manual Steps Required

### 1. Link GitHub repo to Vercel
1. Go to vercel.com → New Project → Import Git Repository
2. Select the `auto-leverage` GitHub repo
3. Framework will be auto-detected as Next.js (vercel.json confirms it)
4. Set **Production Branch**: `main`
5. Enable **Preview Deployments**: on (triggers on every PR automatically)
6. Leave Build & Output Settings as defaults — Next.js preset handles them

### 2. Environment Variables
Set in Vercel dashboard → Project → Settings → Environment Variables.
Apply each to both **Production** and **Preview** environments:

| Variable | Value | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Server-side only — never expose to client bundle |
| `CONFIDENCE_THRESHOLD` | `0.6` | Default; tune up to reduce LLM fallback calls |

### 3. Domain
- Attempt: `auto-leverage.vercel.com` (claim via Project → Settings → Domains → Edit)
- If taken: use Vercel's generated `auto-leverage-<hash>.vercel.app` for MVP
- Custom domain (future): add CNAME record pointing to `cname.vercel-dns.com`

### 4. Verification
After linking:
- Open a test PR → confirm preview URL appears in PR checks
- Merge to main → confirm production deploy triggers in Vercel dashboard
- Hit the production URL → confirm `/api/classify` returns `{ data, error }` shape (not 500)

## Key Constraints
- No server-side autoresearch execution — advisory only
- No user data stored — GDPR-trivial
- LLM API calls must be server-side (API key never exposed to client)
- Static branching tree must be editable without code changes (JSON/YAML config)
- Questionnaire JSON config version-controlled alongside code — changes go through PRs
