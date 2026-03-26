# Product Direction — auto-leverage

## Current Phase
Concept / Pre-MVP — no code exists yet. Stack, architecture, and questionnaire flows are being defined.

## Active Milestone
**MVP — Questionnaire to Output** | 0/4 features complete

Features (dependency order):
1. FEATURE-001: Autoresearch Content Analysis + Routing Taxonomy *(prerequisite — start here)*
2. FEATURE-002: Questionnaire + Output Engine (Backend) *(blocks on FEATURE-001)*
3. FEATURE-003: Frontend Application *(shell can start with 002; flow blocks on API contract)*
4. FEATURE-004: LLM Fallback Classifier *(MVP-optional — last)*
5. FEATURE-005: Deployment Pipeline *(parallel — can start any time after project scaffold)*

## Current Priorities
1. Deep analysis of autoresearch's 3 components to build the recommendation taxonomy (FEATURE-001)
2. Design the questionnaire branching logic (static tree covering core use cases) (FEATURE-002)
3. Define the output format: step-by-step guide structure + LLM prompt template quality standard

## Next Milestone
MVP questionnaire handling 3–5 core user scenarios, producing:
- A readable step-by-step guide mapping the user's problem to the correct autoresearch component(s)
- A copy-paste LLM prompt the user can take directly to Claude/ChatGPT to apply autoresearch to their case
- A simple export (copy to clipboard / download)

## User Flow (confirmed)
```
Homepage: "Describe your problem in your own words" (free text, expandable)
  ↓
Adaptive questionnaire — static branching primary, LLM fallback for edge cases
  ↓
Confirmation screen: "We found these 3 autoresearch components apply to you: [1][2][3]"
  ↓
Output: step-by-step guide + high-quality LLM prompt (copy/export)
```

## Decisions on Record
<!-- Append-only. Format: [date] | [decision] | [rationale] -->
[2026-03-25] | Advisory-only model (no execution) | Scope: explain and guide, not run. Keeps MVP lean, avoids compute infra and key management.
[2026-03-25] | Ephemeral sessions, no auth | Reduces friction for non-tech users; export replaces persistence.
[2026-03-25] | Static branching primary + LLM fallback | Cost-aware: static is deterministic and cheap; LLM handles edge cases the static tree can't classify, then links back to static output when possible.
[2026-03-25] | Entry point: free-text with optional expansion | Open input lowers intimidation barrier; expansion prompts help users who struggle to articulate their problem.
[2026-03-25] | Output: step-by-step guide + copy-paste LLM prompt | Dual format serves both learners (guide) and doers (prompt-ready to use).
