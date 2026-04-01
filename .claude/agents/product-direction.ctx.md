# Product Direction — auto-leverage

## Current Phase
Post-MVP — full product live at https://auto-leverage.vercel.app. Entering distribution and validation phase.

## Completed Milestones
**MVP — Questionnaire to Output** | ✅ Complete 2026-03-28 | 32/32 tasks
- Adaptive questionnaire (GLM-backed, 3–5 turns)
- Confirm page with Q&A recap + useCase-tailored component cards
- Output page: plain-language guide + copy-paste LLM prompt + simulation panel
- Dark geometric UI (responsive mobile + desktop)
- GitHub Actions CI + Vercel deploy pipeline
- 130+ unit tests, 5 E2E specs

**Distribution Ready** | ✅ Complete 2026-03-31 | 8/8 tasks (TASK-033–040)
- TTL cache (60 min) on /api/simulate + /api/output — repeat requests skip GLM
- GLM retry logic — 502/503 retried once; 429 respects Retry-After
- Structured error logging — actionable Vercel function logs for all GLM error paths
- Simulation panel collapsed by default — lazy-fetched on first toggle
- "Ready to run this?" CTA above prompt copy block
- Share button — copies output URL to clipboard
- Vercel Analytics — 4 funnel events, no PII

## Active Milestone
**Quality & Resilience v1** | ✅ Complete 2026-04-01 | 9/9 tasks (TASK-041–049)
- 5-category E2E specs for all 4 flows (home, questionnaire, confirm, output)
- Rate limit UX: 429 from questionnaire → static fallback + "back in ~N minutes"
- Upstash Redis: replaced module-scope Maps; serverless-safe cache with 1h TTL
- GLM backoff hardening: exponential 100ms/400ms cap for 502/503 (Qwen eval: not qualified)
- 30/30 E2E, 205 unit tests passing

## Active Milestone
None — run /oms-exec to plan next milestone

## Current Priorities

## User Flow (confirmed)
```
Homepage: "Describe your problem in your own words" (free text)
  ↓
Adaptive questionnaire — 3–5 turns, GLM-backed question generation
  ↓
Confirm page: Q&A recap + which autoresearch components apply + useCase-tailored descriptions
  ↓
Output: step-by-step guide + copy-paste LLM prompt + simulation panel ("See it in action")
```

## Decisions on Record
<!-- Append-only. Format: [date] | [decision] | [rationale] -->
[2026-03-25] | Advisory-only model (no execution) | Scope: explain and guide, not run. Keeps MVP lean, avoids compute infra and key management.
[2026-03-25] | Ephemeral sessions, no auth | Reduces friction for non-tech users; export replaces persistence.
[2026-03-25] | Static branching primary + LLM fallback | Cost-aware: static is deterministic and cheap; LLM handles edge cases the static tree can't classify, then links back to static output when possible.
[2026-03-25] | Entry point: free-text with optional expansion | Open input lowers intimidation barrier; expansion prompts help users who struggle to articulate their problem.
[2026-03-25] | Output: step-by-step guide + copy-paste LLM prompt | Dual format serves both learners (guide) and doers (prompt-ready to use).
[2026-03-28] | Simulation panel fails silently | Enhancement, not critical path — GLM unavailability in dev/prod outage shows no section, never an error.
[2026-03-28] | Plain language at template layer, not prompt layer | Deterministic output, fully testable, no extra API calls per request. Trade-off: new templates require manual plain-language discipline.
[2026-03-28] | sessionStorage for questionnaire turns handoff | Avoids URL length limits. Trade-off: turns lost if user opens confirm in a new tab.
[2026-03-28] | Distribution Ready milestone selected | Post-MVP priority: observability first, then UX compression, then shareability + analytics.
