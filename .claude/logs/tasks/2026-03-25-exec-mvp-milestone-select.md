# 2026-03-25-exec-mvp-milestone-select: First exec — MVP milestone selection
Date: 2026-03-25  Tier: 2  Domain Lead: cpo  Agents: cpo, cto  Rounds: 1
Pre-mortem: milestone too broad | LLM fallback blocks static-tree MVP path

## Path Diversity Seeds
- CPO seed (value-first): Start with content — autoresearch taxonomy is the load-bearing asset. Every other feature is a delivery vehicle. If taxonomy is wrong, everything built on it is wrong. → CPO stress-tests from: "does this milestone produce something users can actually validate?"
- CTO seed (interface-first / do-less): Define output contract first (what do the final guide + prompt look like), then work backwards to the simplest classifier that produces that output. Don't over-engineer the question tree. → CTO stress-tests from: "what is the minimum build that proves or disproves the hypothesis?"

## Round 1

### CPO
position: Propose milestone "MVP — Questionnaire to Output." Product bet: if we route non-tech users to the correct autoresearch component(s) in ≤7 questions, they can copy an LLM prompt and start using autoresearch the same session — validating that comprehension is the barrier before we invest in execution features.

product_bet: Route non-tech users to correct autoresearch component in ≤7 questions → copy-paste LLM prompt output
kano_class: performance (more routing accuracy = more user value)
rice_score: reach=100/month, impact=2, confidence=80%, effort=3 weeks → score ≈ 53
roadmap_slot: now
success_criteria: ["User completes flow <10 min", "Correct component classification", "User copies LLM prompt", "User reports understanding what autoresearch does for their case"]
opportunity_cost: Not building free-form chatbot — consistent output quality and cost control
anti-trendslop: If taxonomy is too complex for users to act on → advisory model fails. Mitigant: CEO confirmed 3-component taxonomy is the output. If users can't describe their problem → free-text fails. Mitigant: expansion prompts + "I'm not sure" routing path.
confidence_pct: 82
confidence_level: high

Features proposed (dependency order):
1. FEATURE-001: Autoresearch Content Analysis + Routing Taxonomy — prerequisite; everything else is a delivery vehicle for this content
2. FEATURE-002: Questionnaire + Output Engine (backend) — decision tree config + output templates in one backend feature (tightly coupled)
3. FEATURE-003: Frontend Application — home, questionnaire flow, confirmation, output + export
4. FEATURE-004: LLM Fallback Classifier — edge case handler; explicitly constrained to static output resolution

### CTO
position: Architecture clean for advisory model. Support "MVP — Questionnaire to Output" milestone. Key risk is sequencing: if frontend work starts before output templates are defined, UI component model needs rework when template structure changes.

risks: ["Questionnaire config schema changes after frontend implements component model — causes rework", "LLM fallback scope creep: must be explicitly constrained to classify-only → route to static output, never generate output directly", "FEATURE-001 scope: content analysis is unbounded without a timebox — recommend explicit time constraint in Acceptance criteria"]
frame_challenge: null (Router framing is correct — exec milestone selection, not implementation planning)
confidence_pct: 85
confidence_level: high

Agreed sequencing: FEATURE-001 → FEATURE-002 (backend API + output templates) → FEATURE-003 (frontend, can start shell in parallel with 002 but questionnaire flow waits for API contract) → FEATURE-004 (last — MVP-optional)

## Pre-Facilitator Check
short_circuit: true — both agents converge on same milestone ("MVP — Questionnaire to Output") and same 4-feature set with complementary positions. No unresolved disagreement. Proceed to Synthesis.

## Synthesis
milestone: MVP — Questionnaire to Output
rationale: CPO R1 named the product bet and success criteria. CTO R1 confirmed feasibility and flagged three sequencing risks (config schema lock, LLM fallback scope, content analysis timebox). Positions converged without contradiction — CTO's sequencing recommendation reinforces CPO's dependency ordering. No CEO escalation required.

action_items:
- FEATURE-001: Autoresearch Content Analysis + Routing Taxonomy
- FEATURE-002: Questionnaire + Output Engine (backend)
- FEATURE-003: Frontend Application
- FEATURE-004: LLM Fallback Classifier

dependency_chain: FEATURE-001 → FEATURE-002 → FEATURE-004; FEATURE-003 shell can start parallel with FEATURE-002 but questionnaire flow blocks on API contract

product_direction_update: Add "MVP — Questionnaire to Output" as the current milestone with 4 features.
