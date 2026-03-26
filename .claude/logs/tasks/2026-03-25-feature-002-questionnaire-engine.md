# 2026-03-25-feature-002-questionnaire-engine: Questionnaire + Output Engine (Backend)
Date: 2026-03-25  Tier: 2  Domain Lead: backend-developer  Agents: backend-developer, ux-researcher  Rounds: 1
Pre-mortem: questionnaire config schema changes after frontend starts | output templates missing edge-case combinations

## Synthesis
4 tasks. Key decision: questionnaire JSON config and output templates are written before any API route code — config is the source of truth, routes just traverse it. Tests cover all 7 output combinations. ux-researcher validates config structure before TASK-006 starts.
Dependency: TASK-005 → TASK-006 → TASK-007 → TASK-008.
