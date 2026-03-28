# 2026-03-26-adaptive-narrowing-flow: Adaptive 3-5 Turn Narrowing Flow
Date: 2026-03-26  Tier: 2  Domain Lead: backend-developer  Agents: cto, backend-developer, frontend-developer  Rounds: 2
Pre-mortem: (1) LLM generates generic questions not specific to user intent — turns feel like a chatbot not a structured advisor; (2) compressed history loses critical context causing LLM to re-ask already-answered questions; (3) 5-turn hard cap hit without enough context for confident classification — falls back to all-3 components, user gets generic output anyway

## Path Diversity Seeds
- CTO path: question generation entirely server-side; client sends compressed history each turn; stateless API
- Backend path: single /api/converse endpoint drives full conversation; GLM-5 generates questions + detects done
- Frontend path: optimistic local state for question/answer; full history sent each call; graceful loading states

## Round 1

### CTO
The critical architectural decision is where conversation state lives. Client-side is correct — pass full compressed history `{ intent, turns: [{q,a}] }` on every POST. This keeps the API stateless (no sessions, no Redis), consistent with the existing design. Single `/api/converse` endpoint is clean. The done-detection logic must be server-side — the LLM decides when it has enough context, not a turn counter (though turn counter is a hard cap). Key concern: GLM-5 prompt must be tight — it needs to output structured JSON (`{ done, question?, options?, components?, useCase? }`) not prose. Malformed JSON from GLM is the main failure mode; wrap in try/catch, fall back to all-3 on parse error.

### Backend Developer
Agree on stateless + single endpoint. The prompt design is the hardest part. GLM needs two modes in one prompt: (1) question-generation mode — read intent + turns, produce next targeted question with 3-4 concrete options; (2) done-detection mode — when enough context exists to identify component + use case, output classification. The done signal should be based on confidence, not turn count. Turn count (max 5) is a hard safety cap only. Option labels must be specific to what the user said — "Muon optimizer" not "some optimizer". Last option always "Something else". Critical: existing `llm-client.ts` and `llm-rate-limiter.ts` can be reused — no new infrastructure needed. The classify route becomes a thin wrapper; converse is the new primary path for free-text input.

### Frontend Developer
The UI shift is from static choice cards to a dynamic conversation view. Each turn: LLM question renders, user picks an option or types free text. Key interaction: "Something else" reveals an inline text input below the options — not a new screen. Progress is "Question X of 5" — users need to know they're close to done. Back button must pop the last turn from the turns array client-side and re-request the previous question (or just re-render from state). Loading between turns must feel fast — GLM adds latency, need a spinner with "Thinking..." copy. No localStorage — React state only. On done: navigate to /confirm with components + useCase in URL params.

## Facilitator — Pre-check
All three agents aligned on: stateless API, single endpoint, client-side history, GLM-driven question generation, turn 5 hard cap. No material disagreement. Proceeding to synthesis.

## Round 2 — Convergence Check
CTO, Backend, Frontend all converged Round 1. No structural disagreement. Synthesizer proceeds.

## Synthesis

### Decision
Replace static questionnaire traversal with a single `/api/converse` endpoint driven by GLM-5. Client passes compressed `{ intent, turns: [{q,a}] }` each call. GLM generates targeted questions with 3-4 concrete options + "Something else" free-text escape. GLM detects done (component + useCase known) or hard cap at 5 turns. Existing `llm-client.ts` and `llm-rate-limiter.ts` reused — no new infrastructure. Frontend replaces QuestionCard with dynamic LLM-driven question UI.

### Action Items
1. TASK-019: Fix traversal crash — hotfix for live site (unblocks immediate testing)
2. TASK-021: POST /api/converse — GLM-driven question generation + done detection; reuse llm-client + rate-limiter; JSON output schema; graceful degrade to all-3 on parse error
3. TASK-022: Replace questionnaire UI — dynamic QuestionCard driven by /api/converse; "Something else" free-text; progress counter; back nav via client-side turns array
4. TASK-023: Personalise confirmation + output with useCase string

### Rationale
- Stateless API (CTO, Round 1): consistent with existing design, no sessions needed
- Reuse existing LLM infra (backend-developer, Round 1): llm-client.ts + rate-limiter already proven
- Turn 5 hard cap as safety (all agents, Round 1): confidence-based done + hard cap covers both quality and abuse
- Client-side history (all agents, Round 1): compressed {intent, turns} keeps payload minimal
