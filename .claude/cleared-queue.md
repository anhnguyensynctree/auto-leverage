# Cleared Queue — auto-leverage

<!-- Status values: draft | queued | in-progress | done | cto-stop | needs-review -->
<!-- Append-only — never rewrite existing blocks -->

---

## FEATURE-001: Autoresearch Content Analysis + Routing Taxonomy
Status: elaborated
Milestone: MVP — Questionnaire to Output
Type: product
Departments: ux-researcher, backend-developer
Research-gate: false
Why: Everything else is a delivery vehicle for this content — without an accurate taxonomy of what decisions are available in each of the 3 autoresearch components, the questionnaire routes incorrectly and the LLM prompts are generic.
Exec-decision: Read prepare.py, train.py, and program.md from the autoresearch repo in full. Extract: (1) what user-facing decisions are available per component, (2) plain-language routing signals (words non-tech users use that map to each component), (3) 3 draft high-quality LLM prompt templates (one per component), (4) per-use-case testing plan covering not just the prompt but the business outcome expected and failure modes to validate against. Output is a taxonomy doc + test plan doc + prompt templates — not a research report. Timebox to these deliverables.
Acceptance: (1) Taxonomy doc: routing signals table (user language → component), available decisions per component, business factor per component. (2) Testing plan: 3-5 use cases, each with expected business outcome, success criteria, and failure modes to validate. (3) 3 LLM prompt templates (prepare / train / program) that are high enough quality a non-tech user could paste directly into Claude/ChatGPT and get useful output. (4) Question stubs for the static tree covering those 3-5 use cases.
Validation: product → cpo
Tasks: TASK-001, TASK-002, TASK-003, TASK-004

---

## FEATURE-002: Questionnaire + Output Engine (Backend)
Status: elaborated
Milestone: MVP — Questionnaire to Output
Type: engineering
Departments: backend-developer, ux-researcher
Research-gate: false
Why: Core product mechanic — accepts free-text + questionnaire answers, classifies to component(s), returns the step-by-step guide and LLM prompt. Depends on FEATURE-001 taxonomy.
Exec-decision: Config-driven static decision tree (JSON/YAML — not hardcoded logic). Must include an "I'm not sure" branch routing to all-3-components output. API shape: POST /api/classify → component label + confidence; POST /api/output → guide_steps[] + llm_prompt. Output templates keyed to 7 combinations (prepare, train, program, prepare+train, prepare+program, train+program, all). Stateless — no DB.
Acceptance: Static tree handles 3 primary paths + 1 fallback path. Config file is source of truth and editable without code changes. /api/classify and /api/output return correct shapes. Unit tests cover all 7 output templates.
Validation: engineering → cpo + cto
Tasks: TASK-005, TASK-006, TASK-007, TASK-008

---

## FEATURE-003: Frontend Application
Status: elaborated
Milestone: MVP — Questionnaire to Output
Type: engineering
Departments: frontend-developer, ux-researcher
Research-gate: false
Why: The user-facing delivery surface — home (free-text entry), adaptive questionnaire flow, confirmation screen, output (guide + LLM prompt) with copy/export.
Exec-decision: Next.js App Router. One question at a time (no scroll). Progress indicator. Back navigation always available. No auth, no localStorage, no persistence. Export: copy to clipboard + .txt download (client-side Blob — no server call). Questionnaire shell can start before API contract is locked but questionnaire flow implementation waits for FEATURE-002 API contract.
Acceptance: User completes full flow home → output → export on desktop and mobile. All text at Grade 8 reading level. "I'm not sure" branch reachable. No dead-end screens. Copy and download both work.
Validation: engineering → cpo + cto
Tasks: TASK-009, TASK-010, TASK-011, TASK-012

---

## FEATURE-004: LLM Fallback Classifier
Status: elaborated
Milestone: MVP — Questionnaire to Output
Type: engineering
Departments: backend-developer, cto
Research-gate: false
Why: Handles edge cases the static tree can't classify with confidence — fires only when static confidence < threshold, maps result back to static output templates.
Exec-decision: Server-side only (Next.js API route). ANTHROPIC_API_KEY from env — never in client bundle. Structured prompt extracts component label from free-text. ALWAYS resolves to one of the 7 static output templates — never returns raw LLM-generated text to users. Confidence threshold configurable via env var. Adds <5s to flow. MVP-optional — static tree covers the launch use cases; fallback is a quality safety net.
Acceptance: Fallback fires on low-confidence inputs and returns correct component classification. Output is identical in format to static path output. API key never exposed. Latency <5s p95.
Validation: engineering → cpo + cto
Tasks: TASK-013

---

## FEATURE-005: Deployment Pipeline
Status: elaborated
Milestone: MVP — Questionnaire to Output
Type: engineering
Departments: cto, backend-developer
Research-gate: false
Why: OMS manages the full deployment pipeline — no manual deploy steps. Vercel preview deployments on every PR, production on merge to main. CI must pass before any merge.
Exec-decision: GitHub Actions CI pipeline (lint + tsc --noEmit + unit tests). Vercel project linked to repo — preview deploys on PR, production on merge to main. ANTHROPIC_API_KEY and CONFIDENCE_THRESHOLD managed via Vercel environment variables (not committed). Target domain: auto-leverage.vercel.com (confirm availability at setup). All future OMS task PRs must pass CI before merging.
Acceptance: PR to main triggers CI (lint + type-check + tests) — fails block merge. Merge to main auto-deploys to Vercel production. Preview URL generated on every PR. ANTHROPIC_API_KEY set in Vercel env (production + preview). Domain auto-leverage.vercel.com resolves to production (or note fallback if unavailable).
Validation: engineering → cto
Tasks: TASK-014, TASK-015

---

<!-- TASKS — elaborated from FEATURE blocks above -->

---

## TASK-001: Autoresearch Routing Taxonomy Doc
Status: done
Notes: docs/taxonomy.md exists with routing signals table
Feature: FEATURE-001
Agent: ux-researcher
Spec: Produce a taxonomy document that maps user language to autoresearch components. Read the autoresearch repo's prepare.py, train.py, and program.md in full. Extract: (1) all user-facing decisions available per component, (2) routing signals — plain-language phrases non-tech users say that indicate each component, (3) business factor per component (what kind of business outcome each component unlocks), (4) component plain names (e.g. "Data Prep", "Model Trainer", "Experiment Instructions"). Output is docs/taxonomy.md — dense, table-heavy, no filler.
Scenarios:
- GIVEN a non-technical user describes "my training data is messy and not representative" WHEN taxonomy is consulted THEN prepare.py routing signal fires
- GIVEN a user says "I want to try a different optimizer" WHEN taxonomy is consulted THEN train.py routing signal fires
- GIVEN a user says "I want the model to focus on writing style" WHEN taxonomy is consulted THEN program.md routing signal fires
- GIVEN the taxonomy doc exists WHEN ux-researcher reviews THEN every routing signal maps unambiguously to exactly one component (no overlaps without tiebreaker)
Artifacts:
- docs/taxonomy.md
Produces: Unlocks TASK-002 (testing plan), TASK-003 (prompt templates), TASK-004 (question stubs)
Verify: ux-researcher self-review — routing signal table must have ≥5 signals per component
Depends: none

---
- **Model-hint:** sonnet
- **File-count:** 1
## TASK-002: Per-Use-Case Testing Plan
Status: done
Notes: docs/testing-plan.md exists with 5 use cases
Feature: FEATURE-001
Agent: ux-researcher
Spec: Produce a testing plan doc covering 3–5 use cases. Each use case must specify: (1) user type + what they describe in their own words, (2) expected component(s) recommended, (3) business outcome the user expects after running autoresearch, (4) success criteria for the platform output (what the step-by-step guide must say), (5) failure modes to validate against (what a bad output looks like). Output is docs/testing-plan.md.
Scenarios:
- GIVEN the testing plan exists WHEN CPO reviews THEN each use case has all 5 fields populated with no placeholders
- GIVEN a use case covers "I want to improve my model's accuracy on X" WHEN mapped to taxonomy THEN expected component is train.py or program.md (not prepare.py)
- GIVEN the testing plan exists WHEN TASK-006 (/api/classify) is implemented THEN each use case can be run as a manual integration test
Artifacts:
- docs/testing-plan.md
Produces: Validates TASK-004 question stubs before tree is built
Verify: cpo review — all 5 fields present per use case, ≥3 use cases covering different component paths
Depends: TASK-001

---
- **Model-hint:** sonnet
- **File-count:** 1
## TASK-003: LLM Prompt Templates (3 Components)
Status: done
Notes: docs/prompt-templates.md exists with all 3 templates
Feature: FEATURE-001
Agent: backend-developer
Spec: Write 3 high-quality LLM prompt templates in program.md style — one per autoresearch component (prepare.py, train.py, program.md). Each template is what a user pastes into Claude/ChatGPT to act as their program.md. Template structure: Goal (what the experiment should optimize), Constraints (what must not change), Strategy (what approach to try), Success Signal (how to measure improvement). Templates must be written for a non-technical user's situation, not for an ML researcher. No setup instructions, no code. Output is docs/prompt-templates.md with all 3 templates.
Scenarios:
- GIVEN a user running data-quality experiments WHEN they paste the prepare.py template into Claude THEN the output is actionable guidance on data cleaning strategy without requiring ML knowledge
- GIVEN a user running optimizer experiments WHEN they paste the train.py template THEN the output specifies optimizer name, learning rate range, and schedule strategy
- GIVEN a user with a writing-style goal WHEN they paste the program.md template THEN the output specifies a measurable target for the agent (e.g. "increase stylistic consistency score by X")
- GIVEN all 3 templates exist WHEN reviewed THEN none contain setup instructions, file paths, or commands — only goal/constraint/strategy/signal
Artifacts:
- docs/prompt-templates.md
Produces: Unlocks TASK-007 (output templates reference these as content)
Verify: backend-developer self-review — each template passes the "non-tech user could paste this" test; no instructions about running autoresearch
Depends: TASK-001

---
- **Model-hint:** sonnet
- **File-count:** 1
## TASK-004: Question Stubs for Static Decision Tree
Status: done
Notes: docs/question-stubs.md exists with all paths
Feature: FEATURE-001
Agent: ux-researcher
Spec: Write the question stubs that will become the static branching tree in TASK-005. Based on the taxonomy (TASK-001) and testing plan (TASK-002), write: (1) the opening free-text prompt text (the main site headline + sub-prompt), (2) 3–5 branching questions per component path, (3) the "I'm not sure" fallback path question set, (4) confirmation screen copy for each of the 7 output combinations. All copy at Grade 8 reading level. Output is docs/question-stubs.md — structured by path, with routing logic notes inline.
Scenarios:
- GIVEN a user who says "I want to improve my model but don't know where to start" WHEN question stubs are followed THEN they reach the "I'm not sure" path within 2 questions
- GIVEN question stubs exist WHEN ux-researcher applies Flesch-Kincaid THEN all question text scores ≤ Grade 8
- GIVEN question stubs exist WHEN mapped against taxonomy routing signals THEN every signal from TASK-001 has a corresponding question that surfaces it
Artifacts:
- docs/question-stubs.md
Produces: Unlocks TASK-005 (questionnaire JSON config built directly from these stubs)
Verify: ux-researcher self-review — Grade 8 check on all copy; every taxonomy routing signal covered
Depends: TASK-001, TASK-002

---
- **Model-hint:** sonnet
- **File-count:** 1
## TASK-005: Questionnaire JSON Config (Source of Truth)
Status: done
Notes: lib/questionnaire.json + lib/questionnaire-schema.ts implemented
Feature: FEATURE-002
Agent: backend-developer
Spec: Build the static branching questionnaire as a JSON config file. Structure: nodes with id, question text, type (text|choice), options[], and next pointers (option → node id). Terminal nodes include component classification result and confidence score. Must include: 3 primary paths (prepare / train / program), multi-component paths (prepare+train, prepare+program, train+program, all), and the "I'm not sure" fallback routing to all. Schema validated with Zod. Config lives at lib/questionnaire.json with a Zod schema at lib/questionnaire-schema.ts. Config is the only source of truth — no classification logic hardcoded elsewhere.
Scenarios:
- GIVEN the config is loaded WHEN Zod validates it THEN zero errors — all nodes reference valid next-node ids
- GIVEN a user follows the prepare path WHEN the terminal node is reached THEN classification is { components: ["prepare"], confidence: 1.0 }
- GIVEN a user selects "I'm not sure" at any decision point WHEN terminal node is reached THEN classification is { components: ["all"], confidence: 0.5 }
- GIVEN the config file is edited without touching any .ts files WHEN the app restarts THEN new question wording is live
Artifacts:
- lib/questionnaire.json
- lib/questionnaire-schema.ts
Produces: Unlocks TASK-006 (/api/classify traverses this config)
Verify: cto review — Zod schema covers all node types; no classification logic in .ts files
Depends: TASK-004

---
- **Model-hint:** sonnet
- **File-count:** 2
## TASK-006: POST /api/classify Route
Status: done
Notes: app/api/classify/route.ts implemented with confidence threshold
Feature: FEATURE-002
Agent: backend-developer
Spec: Implement the /api/classify Next.js API route. Accepts: { answers: Record<string, string> } (question id → answer). Traverses the questionnaire config (TASK-005) using the answers to reach a terminal node. Returns: { data: { components: string[], confidence: number }, error: null } or { data: null, error: string }. Stateless — no DB, no session. If confidence < CONFIDENCE_THRESHOLD env var (default 0.6), sets a low_confidence flag in response for TASK-013 fallback to consume. Must not import the questionnaire JSON at build time — load dynamically so config changes don't require rebuild.
Scenarios:
- GIVEN answers that follow the prepare path WHEN POST /api/classify THEN response is { data: { components: ["prepare"], confidence: 1.0 }, error: null }
- GIVEN answers that trigger "I'm not sure" WHEN POST /api/classify THEN response includes { components: ["all"], confidence: 0.5, low_confidence: true }
- GIVEN an empty answers object WHEN POST /api/classify THEN response is { data: null, error: "No answers provided" } with 400 status
- GIVEN CONFIDENCE_THRESHOLD=0.8 in env WHEN confidence is 0.7 THEN low_confidence: true is set
Artifacts:
- app/api/classify/route.ts
Produces: Unlocks TASK-007 (/api/output), TASK-011 (questionnaire flow UI), TASK-013 (LLM fallback)
Verify: cto review — no hardcoded classification logic; config loaded dynamically; all response shapes match { data, error } contract
Depends: TASK-005

---
- **Model-hint:** sonnet
- **File-count:** 1
## TASK-007: Output Templates + POST /api/output Route
Status: done
Notes: lib/output-templates.ts + app/api/output/route.ts implemented
Feature: FEATURE-002
Agent: backend-developer
Spec: Build the 7 output templates and the /api/output route that serves them. Each template contains: guide_steps[] (plain-language step-by-step for the user), llm_prompt (the program.md-style template from TASK-003 composed for that component combination), and component_names[] (display names). Templates live in lib/output-templates.ts keyed by component combination string (e.g. "prepare", "train+program", "all"). /api/output accepts: { components: string[] } and returns: { data: { guide_steps: string[], llm_prompt: string, component_names: string[] }, error: null }. LLM prompt content sourced from docs/prompt-templates.md — do not rewrite, compose.
Scenarios:
- GIVEN components: ["prepare"] WHEN POST /api/output THEN returns prepare guide_steps and prepare LLM prompt template
- GIVEN components: ["train", "program"] WHEN POST /api/output THEN returns combined guide_steps for both and composed llm_prompt covering both
- GIVEN components: ["all"] WHEN POST /api/output THEN returns all-3 guide + full program.md template
- GIVEN an unrecognized component string WHEN POST /api/output THEN returns { data: null, error: "Unknown component combination" } with 400 status
- GIVEN any valid components array WHEN POST /api/output THEN guide_steps are all Grade 8 or below
Artifacts:
- lib/output-templates.ts
- app/api/output/route.ts
Produces: Unlocks TASK-008 (tests), TASK-012 (output screen UI)
Verify: cto + cpo review — all 7 combinations present; guide_steps Grade 8 check; llm_prompt sourced from TASK-003 content not rewritten
Depends: TASK-003, TASK-006

---
- **Model-hint:** sonnet
- **File-count:** 2
## TASK-008: Unit Tests — All 7 Output Combinations
Status: done
Notes: 71 tests passing across 3 test files
Feature: FEATURE-002
Agent: backend-developer
Spec: Write unit tests covering the full backend classification and output pipeline. Test coverage required: (1) all 7 output templates return correct shape, (2) /api/classify traverses each of the 3 primary paths + "I'm not sure" path correctly, (3) low_confidence flag fires at correct threshold, (4) /api/output returns correct guide_steps and llm_prompt per combination, (5) all error paths (empty input, unknown component, malformed request). Use Vitest. Tests co-located in __tests__/ directories next to the source files they test.
Scenarios:
- GIVEN the test suite runs WHEN all 7 output templates are exercised THEN 0 failures
- GIVEN CONFIDENCE_THRESHOLD is varied WHEN classifying a low-confidence path THEN low_confidence flag matches threshold correctly in all boundary cases
- GIVEN a malformed request body WHEN /api/classify is called THEN 400 is returned and error field is non-null
- GIVEN the full suite runs THEN coverage ≥ 80% on app/api/ and lib/
Artifacts:
- app/api/classify/__tests__/route.test.ts
- app/api/output/__tests__/route.test.ts
- lib/__tests__/output-templates.test.ts
Produces: Unlocks TASK-014 (CI pipeline needs tests to exist)
Verify: cto review — all 7 combinations tested; coverage report attached; zero skipped tests
Depends: TASK-007

---
- **Model-hint:** sonnet
- **File-count:** 3
## TASK-009: Next.js App Scaffold
Status: done
Notes: Next.js 14 App Router with Tailwind, next.config.mjs, full app structure
Feature: FEATURE-003
Agent: frontend-developer
Spec: Initialize the Next.js 14 App Router TypeScript project with Tailwind CSS. Install and verify: drizzle-orm (@neondatabase/serverless), drizzle-kit, @anthropic-ai/sdk. All imports resolvable, zero peer conflicts. Create: app/layout.tsx (root layout, Tailwind base), app/page.tsx (stub landing — "Coming soon"), tailwind.config.ts, tsconfig.json, next.config.ts, .env.example (with ANTHROPIC_API_KEY and CONFIDENCE_THRESHOLD stubs). Dev server must start clean on localhost:3000.
Scenarios:
- GIVEN a fresh clone with .env.example populated WHEN pnpm install completes THEN zero peer conflicts
- GIVEN the dev server starts WHEN localhost:3000 is requested THEN Next.js page renders without error
- GIVEN tsc --noEmit runs THEN zero TypeScript errors
Artifacts:
- package.json
- app/layout.tsx
- app/page.tsx
- tailwind.config.ts
- tsconfig.json
- next.config.ts
- .env.example
Produces: Unlocks TASK-010 (home page), TASK-015 (Vercel config)
Verify: cto review — next.config.ts (not .mjs); all 7 artifacts present; tsc clean; dev server confirmed
Depends: none

---
- **Model-hint:** sonnet
- **File-count:** 7
## TASK-010: Home Page + Free-Text Entry Screen
Status: done
Notes: app/page.tsx + components/EntryForm.tsx implemented
Feature: FEATURE-003
Agent: frontend-developer
Spec: Build the home page at app/page.tsx. Content: headline (main entry prompt from TASK-004 question stubs), sub-prompt explaining the platform in 1 sentence, free-text textarea (min 3 words, max 500 chars), "Find My Strategy" CTA button. On submit: POST to /api/classify with { answers: { "q0": <user text> } }. Loading state on button during fetch. Error state if classify fails. On success: navigate to /questionnaire with classification result in URL search params (no localStorage). All copy at Grade 8 reading level. Responsive — works on mobile and desktop.
Scenarios:
- GIVEN the home page loads WHEN user submits fewer than 3 words THEN inline validation fires before API call
- GIVEN user submits valid text WHEN /api/classify responds THEN loading indicator is visible during fetch
- GIVEN /api/classify returns an error WHEN fetch settles THEN error message renders inline (no crash)
- GIVEN /api/classify succeeds WHEN navigation fires THEN URL contains components and confidence params
Artifacts:
- app/page.tsx
- components/EntryForm.tsx
Produces: Unlocks TASK-011 (questionnaire flow receives classification from URL params)
Verify: cpo + frontend-developer review — Grade 8 copy check; mobile responsive; no localStorage usage
Depends: TASK-009, TASK-016

---
- **Model-hint:** sonnet
- **File-count:** 2
## TASK-011: Questionnaire Flow UI
Status: done
Notes: app/questionnaire/page.tsx + QuestionCard.tsx + ProgressBar.tsx implemented
Feature: FEATURE-003
Agent: frontend-developer
Spec: Build the adaptive questionnaire at app/questionnaire/page.tsx. Reads initial classification from URL params. Renders one question at a time using question nodes from the questionnaire config (via /api/classify). Shows: progress indicator (step X of Y), question text, answer options or text input, Back button (always available). On each answer: POST /api/classify with accumulated answers, re-render next question. On terminal node: navigate to /confirm with final classification. "I'm not sure" option must be present on every choice question. No scroll — one question per screen. No localStorage.
Scenarios:
- GIVEN questionnaire page loads WHEN first question renders THEN progress indicator shows "Step 1"
- GIVEN user is on step 3 WHEN Back is pressed THEN step 2 question and previous answer re-render
- GIVEN every choice question WHEN rendered THEN "I'm not sure" option is present
- GIVEN user reaches terminal node WHEN navigate to /confirm fires THEN URL contains final components array
- GIVEN /api/classify errors mid-flow WHEN error state renders THEN user sees retry option (not a blank screen)
Artifacts:
- app/questionnaire/page.tsx
- components/QuestionCard.tsx
- components/ProgressBar.tsx
Produces: Unlocks TASK-012 (confirmation + output screen)
Verify: cto + ux-researcher review — no localStorage; back navigation works; "I'm not sure" on every choice step
Depends: TASK-006, TASK-016

---
- **Model-hint:** sonnet
- **File-count:** 3
## TASK-012: Confirmation + Output Screen
Status: done
Notes: app/confirm/page.tsx + app/output/page.tsx + OutputCard.tsx + ExportActions.tsx implemented
Feature: FEATURE-003
Agent: frontend-developer
Spec: Build the confirmation screen at app/confirm/page.tsx and output screen at app/output/page.tsx. Confirm screen: shows component_names[] from classification, plain-language explanation of what each means for the user, "Yes, this fits" and "Start over" buttons. Output screen: fetches POST /api/output with components from URL params, renders guide_steps[] as numbered list, renders llm_prompt in a copyable code block, provides two export actions — (1) Copy to Clipboard button, (2) Download as .txt button (client-side Blob, no server call). No auth, no persistence — page refresh loses state by design. Loading and error states for /api/output fetch.
Scenarios:
- GIVEN confirmation screen loads WHEN component_names render THEN each has a plain-language explanation (not technical jargon)
- GIVEN user clicks "Start over" WHEN navigation fires THEN user returns to home page with cleared state
- GIVEN output screen loads WHEN Copy button is clicked THEN llm_prompt is copied to clipboard and button text changes to "Copied!"
- GIVEN output screen loads WHEN Download button is clicked THEN browser downloads a .txt file containing guide_steps + llm_prompt
- GIVEN /api/output returns error WHEN error state renders THEN user sees "Something went wrong — try again" with retry option
Artifacts:
- app/confirm/page.tsx
- app/output/page.tsx
- components/OutputCard.tsx
- components/ExportActions.tsx
Produces: Completes full user flow — MVP frontend done
Verify: cpo + ux-researcher review — full flow tested on mobile + desktop; export tested in browser; Grade 8 copy on all new text
Depends: TASK-007, TASK-011, TASK-016

---
- **Model-hint:** sonnet
- **File-count:** 4
## TASK-013: LLM Fallback Classifier
Status: done
Notes: lib/llm-classifier.ts + extended app/api/classify/route.ts
Feature: FEATURE-004
Agent: backend-developer
Spec: Extend /api/classify to fire an LLM fallback when low_confidence is true. Fallback is a conditional branch inside the existing route — not a new endpoint. Implementation: if low_confidence flag is set after static traversal, call Anthropic API server-side with a structured prompt that extracts component classification from the user's free-text. Prompt must return a JSON object matching { components: string[], confidence: number }. Result is merged back into the classify response — output shape is identical to the static path. ANTHROPIC_API_KEY from env only — never in client bundle. CONFIDENCE_THRESHOLD from env (default 0.6). Fallback must complete in <5s p95.
Scenarios:
- GIVEN a low-confidence input WHEN /api/classify is called THEN fallback fires and returns valid components array
- GIVEN fallback fires WHEN response is returned THEN response shape is identical to static path { data: { components, confidence }, error: null }
- GIVEN fallback fires WHEN components are returned THEN they resolve to one of the 7 valid template keys (never raw LLM text)
- GIVEN ANTHROPIC_API_KEY is not set WHEN fallback would fire THEN classify returns the low-confidence static result (graceful degrade — no 500)
- GIVEN fallback fires WHEN measured p95 latency THEN < 5000ms
Artifacts:
- app/api/classify/route.ts (extended, not a new file)
- lib/llm-classifier.ts
Produces: Quality safety net for edge-case inputs — MVP optional, deploy-gated
Verify: cto review — API key never in client bundle; graceful degrade confirmed; output shape identical to static path
Depends: TASK-006

---
- **Model-hint:** sonnet
- **File-count:** 2
## TASK-014: GitHub Actions CI Pipeline
Status: done
Notes: .github/workflows/ci.yml exists
Feature: FEATURE-005
Agent: cto
Spec: Create a GitHub Actions CI workflow that runs on every PR to main. Steps: (1) pnpm install, (2) tsc --noEmit, (3) ESLint, (4) Vitest unit tests. All steps must pass for the workflow to succeed. Branch protection rule: require CI to pass before merge (document the manual step in .claude/agents/cto.ctx.md — Vercel branch protection is set via GitHub repo settings, not via code). Secrets required: none for CI (no API key needed for unit tests — API calls are mocked). Workflow file at .github/workflows/ci.yml.
Scenarios:
- GIVEN a PR is opened to main WHEN any CI step fails THEN merge is blocked
- GIVEN a PR with a TypeScript error WHEN tsc step runs THEN workflow fails with type error output
- GIVEN a PR where all tests pass and tsc is clean WHEN CI completes THEN green check appears on PR
- GIVEN the workflow runs WHEN tests execute THEN no real Anthropic API calls are made (LLM calls mocked)
Artifacts:
- .github/workflows/ci.yml
Produces: Enforces quality gate on all future OMS task PRs
Verify: cto self-review — all 4 steps present; no secrets required for CI run; workflow YAML validates
Depends: TASK-008

---
- **Model-hint:** sonnet
- **File-count:** 1
## TASK-015: Vercel Config + Domain Setup
Status: done
Feature: FEATURE-005
Agent: cto
Spec: Configure Vercel deployment for the project. Steps: (1) create vercel.json at project root specifying framework: nextjs, (2) document the Vercel project link steps in .claude/agents/cto.ctx.md (connect GitHub repo, set production branch: main, enable preview deployments on PRs), (3) document environment variable setup in .claude/agents/cto.ctx.md: ANTHROPIC_API_KEY (production + preview) and CONFIDENCE_THRESHOLD (production + preview, default "0.6"), (4) document domain claim steps: attempt auto-leverage.vercel.com, note fallback naming if unavailable. The vercel.json and the ctx.md doc are the deliverables — actual Vercel project creation requires manual steps documented here.
Scenarios:
- GIVEN vercel.json exists WHEN Vercel CLI reads it THEN framework is detected as nextjs with zero config override warnings
- GIVEN the cto.ctx.md doc exists WHEN an engineer follows it THEN Vercel project can be linked and env vars set without referring to external docs
- GIVEN a PR is merged to main WHEN Vercel picks it up THEN production deploy triggers (contingent on manual link step being complete)
- GIVEN a PR is opened WHEN Vercel picks it up THEN preview URL is generated and posted to the PR
Artifacts:
- vercel.json
- .claude/agents/cto.ctx.md (updated with Vercel setup section)
Produces: Completes deployment pipeline — MVP ready to ship
Verify: cto self-review — vercel.json valid; cto.ctx.md covers all manual steps with no gaps
Depends: TASK-009

---
- **Model-hint:** sonnet
- **File-count:** 2
## TASK-016: UI Design — All 4 Screens (Stitch)
Status: done
Notes: design/stitch/ has home.html, question-card.html, confirmation.html, output.html
Feature: FEATURE-003
Agent: frontend-developer
Spec: Generate high-fidelity HTML mockups for all 4 app screens using the /stitch skill. Screens: (1) Home — headline, sub-prompt, free-text textarea, CTA button. (2) Question Card — one question, answer options, progress bar, Back button. (3) Confirmation — component name cards with plain-language descriptions, Yes/Start Over actions. (4) Output — numbered guide steps, copyable LLM prompt block, Copy + Download export buttons. Design direction: clean, trustworthy, minimal — non-technical users should feel guided not overwhelmed. Dark or light theme your call, but must pass WCAG AA contrast. All screens desktop + mobile responsive. Output lands in design/stitch/ — manifest.json updated after each screen. No component code written until all 4 screens are approved.
Scenarios:
- GIVEN all 4 screens are generated WHEN CPO reviews THEN each screen maps 1:1 to the user flow steps
- GIVEN any generated screen WHEN contrast is checked THEN all text/background combinations meet WCAG AA (4.5:1 minimum)
- GIVEN the output screen design WHEN reviewed THEN LLM prompt block is visually distinct (code block or card style) and export actions are prominent
- GIVEN the question card design WHEN reviewed THEN progress indicator and Back button are always visible without scrolling
Artifacts:
- design/stitch/home.html
- design/stitch/question-card.html
- design/stitch/confirmation.html
- design/stitch/output.html
- design/stitch/manifest.json
Produces: Design source of truth — TASK-010, TASK-011, TASK-012 implement against these screens
Verify: cpo review — all 4 screens present; WCAG AA passed; mobile layout reviewed; approved before any component code starts
Depends: TASK-004

---
- **Model-hint:** sonnet
- **File-count:** 5
## TASK-017: CLI-Based Deploy Pipeline (Production + PR Previews)
Status: done
Feature: FEATURE-005
Agent: cto
Spec: Set up a fully CLI-driven deploy pipeline using the Vercel CLI and GitHub Actions — no GitHub App, no webhook integration required. Production deploys and PR preview deploys are both triggered via `vercel` CLI commands in GitHub Actions workflows. Steps: (1) Add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` as GitHub Actions secrets — values sourced from `~/.config/vercel/key` (token) and `.vercel/project.json` (org + project IDs); (2) Extend `.github/workflows/ci.yml` with a deploy job: on push to master run `vercel --prod --token $VERCEL_TOKEN` (production); on pull_request run `vercel --token $VERCEL_TOKEN` (preview) and capture the output URL; (3) Post the preview URL as a PR comment using `gh pr comment` with the captured URL; (4) Verify: push to master triggers production deploy; open a PR and confirm preview URL appears as a comment; open both URLs in a browser with no Vercel session and confirm they load without auth prompt.
Scenarios:
- GIVEN push to master WHEN CI deploy job runs THEN `vercel --prod` completes and production URL is live
- GIVEN a PR is opened WHEN CI deploy job runs THEN `vercel` outputs a preview URL and it is posted as a PR comment
- GIVEN the production URL WHEN opened with no Vercel session THEN page loads without auth prompt
- GIVEN a preview URL WHEN opened with no Vercel session THEN page loads without auth prompt
- GIVEN VERCEL_TOKEN secret is missing WHEN deploy job runs THEN workflow fails with clear error (not a silent 500)
Artifacts:
- .github/workflows/ci.yml (extended with deploy job — production on push to master, preview on PR)
- .claude/agents/cto.ctx.md updated with confirmed deploy pipeline status and secret names
Produces: Fully automated CLI deploy pipeline — no GitHub App dependency
Verify: cto self-review — production deploy confirmed; preview URL posted on test PR; both URLs publicly accessible
Depends: TASK-014

---
- **Model-hint:** sonnet
- **File-count:** 2
## TASK-018: Write Tests for Rate Limiter, Strategy Route, and LLM Client
Status: done
Notes: branch worktree-agent-a6064ca7 — 192 tests passing, fixed JSON.parse bug in llm-strategy.ts
Feature: FEATURE-002
Agent: backend-developer
Spec: Write unit tests for the three new lib files added in the LLM split: (1) llm-rate-limiter.ts — test allowed/blocked behaviour, window expiry, separate limits per callType, separate buckets per IP; (2) llm-client.ts — test that it throws when GLM_API_KEY is missing, test happy path with mocked fetch, test non-200 response handling; (3) llm-strategy.ts — test valid output, invalid JSON from GLM, missing steps, missing llmPrompt. Also write integration tests for POST /api/strategy — happy path, 429 on rate limit exceeded, 503 when GLM_API_KEY missing, 400 on bad body.
Scenarios:
- GIVEN an IP has hit the navigate limit WHEN another classify request fires the LLM path THEN 429 is returned
- GIVEN a fresh IP WHEN strategy is called THEN allowed up to 3 times then 429
- GIVEN GLM_API_KEY is not set WHEN /api/strategy is called THEN 503 with "Strategy advisor not available"
- GIVEN GLM returns invalid JSON WHEN llmStrategy is called THEN returns null (no throw)
- GIVEN rate window expires WHEN same IP calls again THEN allowed again
Artifacts:
- lib/__tests__/llm-rate-limiter.test.ts
- lib/__tests__/llm-client.test.ts
- lib/__tests__/llm-strategy.test.ts
- app/api/strategy/__tests__/route.test.ts
Produces: Test coverage for all new LLM infrastructure
Verify: qa — all new tests pass; no regressions in existing 71 tests
Depends: none

---

## FEATURE-006: Adaptive 3-5 Turn Narrowing Flow
Status: elaborated
Milestone: Adaptive Conversation Engine
Type: product
Departments: cto, backend-developer, frontend-developer
Research-gate: false
Why: The static questionnaire tree is broken by design — it can't handle free-text input, falls through fallback nodes, and crashes in production. Users need a smarter flow: 3-5 LLM-driven messages that understand what they typed and narrow them to the right autoresearch component (prepare.py, train.py, or program.md) through targeted follow-up questions.
Exec-decision: Replace the static questionnaire traversal with an adaptive LLM-driven conversation. User types free text on the home page → LLM asks 3-5 targeted follow-up questions (multiple choice + free-text option) to narrow down which autoresearch component(s) apply and the user's specific use case → confirmation screen shows what was understood → output is personalised with the use case. Max 5 turns hard cap (rate-limited). History sent as compressed `{ intent, turns: [{q,a}] }` — not raw transcript. GLM-5 drives the questions. Graceful degrade if GLM unavailable. The static questionnaire.json and traversal logic are retired. Output templates remain unchanged.
Acceptance: (1) Free-text home input never crashes — any input resolves to a component classification. (2) LLM generates targeted questions specific to the user's stated intent — not generic. (3) Multiple choice options + "Something else" free-text always available. (4) Max 5 turns enforced. (5) Confirmation screen shows useCase string. (6) Output first step personalised with useCase.
Validation: product → cpo + cto
Tasks: TASK-019, TASK-021, TASK-022, TASK-023

---
- **Model-hint:** sonnet
- **File-count:** 4
## TASK-019: Fix Questionnaire Traversal — "I still don't know" fallback crash
Status: done
Notes: q-fallback-2 label fixed to "I'm not sure", terminal-all last-resort added to traverseTree — 95 tests passing
Feature: FEATURE-006
Agent: backend-developer
Spec: Fix two defects causing a production crash when a user submits free text from the home page. Defect 1: node q-fallback-2 used label "I still don't know" but NOT_SURE_PATTERN only matches "I'm not sure" — renamed label. Defect 2: traverseTree returned error when no fallback option found — now routes to terminal-all (confidence 0.5) as last resort.
Scenarios:
- GIVEN free-text home submission WHEN /api/classify called THEN response is { data: { components, confidence }, error: null } — never a 400
- GIVEN traversal reaches q-fallback-2 with no answer WHEN findNotSureOption called THEN routes to terminal-all
- GIVEN any choice node with no answer and no "I'm not sure" option WHEN traversal runs THEN falls back to terminal-all
Artifacts:
- lib/questionnaire.json
- app/api/classify/route.ts
- app/api/classify/__tests__/route.test.ts
Produces: Production crash fixed; traversal resilient to missing-fallback scenarios
Verify: qa — regression test passes; live site tested with "i have a trading strategy" input
Depends: none

---
- **Model-hint:** sonnet
- **File-count:** 3
## TASK-020: Smart Free-Text Routing
Status: superseded
Notes: Superseded by TASK-021 — full conversational engine replaces static tree and smart routing
Feature: FEATURE-006
Agent: backend-developer
Depends: TASK-019

---
- **Model-hint:** sonnet
- **File-count:** 0
## TASK-021: POST /api/converse — Adaptive Question Generation
Status: done
Notes: app/api/converse/route.ts + lib/converse-prompt.ts — 95 tests passing, all acceptance criteria met
Feature: FEATURE-006
Agent: backend-developer
Spec: Stateless endpoint driving 3-5 turn adaptive conversation. Receives { intent, turns, turnCount }, returns next question or final classification. Hard cap at turnCount >= 5. GLM-5 via llm-client.ts. Graceful degrade on parse error or missing API key. Rate limiting via checkRateLimit(ip, "navigate"). Response: { data: { done: false, question, options } } or { data: { done: true, components, useCase, confidence } }.
Scenarios:
- GIVEN intent "tune my optimizer" + empty turns WHEN POST /api/converse THEN question references optimizer specifically
- GIVEN turnCount >= 5 WHEN POST /api/converse THEN done:true always returned
- GIVEN GLM malformed JSON WHEN parsed THEN graceful degrade — done:true all-3 components
- GIVEN rate limit exceeded WHEN POST /api/converse THEN 429 with resetMs
Artifacts:
- app/api/converse/route.ts
- lib/converse-prompt.ts
- app/api/converse/__tests__/route.test.ts
Produces: Core adaptive flow — unlocks TASK-022
Verify: cto + backend-developer — done detection, graceful degrade, rate limit, response shapes
Depends: TASK-019

---
- **Model-hint:** sonnet
- **File-count:** 3
## TASK-022: Replace Questionnaire UI with Adaptive Conversation
Status: done
Notes: app/questionnaire/page.tsx + QuestionCard.tsx + ProgressBar.tsx — 179 tests, all acceptance criteria met
Feature: FEATURE-006
Agent: frontend-developer
Spec: Replace static questionnaire with conversational UI driven by /api/converse. On load: extract intent from URL, POST /api/converse with empty turns. Render question + radio options. "Something else — I'll describe it" reveals free-text input. Back button pops local state (no API call). Progress "Question X of 5". When done:true: navigate to /confirm with components, useCase, confidence params. No localStorage.
Scenarios:
- GIVEN page loads WHEN first API call completes THEN LLM question renders with radio options
- GIVEN user selects "Something else" WHEN rendered THEN free-text input appears
- GIVEN Back pressed on turn 3 WHEN rendered THEN turn 2 question + prior answer from local state
- GIVEN done:true WHEN navigation fires THEN /confirm has components, useCase, confidence params
Artifacts:
- app/questionnaire/page.tsx
- components/QuestionCard.tsx
- components/ProgressBar.tsx
Produces: Full adaptive UI live
Verify: cpo + frontend-developer — full flow, back nav, free-text, done routing, error recovery
Depends: TASK-021

---
- **Model-hint:** sonnet
- **File-count:** 3
## TASK-023: Personalise Confirmation + Output with useCase
Status: done
Notes: confirm useCase block + api/output goal prefix — 115 tests passing, all acceptance criteria met
Feature: FEATURE-006
Agent: frontend-developer
Spec: Update confirmation and output screens to surface the `useCase` string. Confirmation screen: read useCase from URL params, display as "Here's what we understood: [useCase]" above component cards. Output screen: pass useCase to POST /api/output. Update /api/output to accept useCase?: string and prepend to first guide step: "Based on your goal — [useCase] — here's how to apply autoresearch:". If useCase absent, output unchanged (no regression). "Start over" on /confirm navigates to / with all params cleared.
Scenarios:
- GIVEN useCase "tune the Muon optimizer" WHEN /confirm renders THEN "Here's what we understood: tune the Muon optimizer..." visible above component cards
- GIVEN useCase present WHEN POST /api/output THEN first guide_step begins "Based on your goal — [useCase]"
- GIVEN useCase absent WHEN POST /api/output THEN output identical to current behaviour
- GIVEN "Start over" clicked WHEN navigation fires THEN / loads with no stale params
Artifacts:
- app/confirm/page.tsx
- app/output/page.tsx
- app/api/output/route.ts
Produces: Output feels tailored to user's specific problem
Verify: cpo — useCase on confirm; first output step personalised; no regression on missing useCase
Depends: TASK-022

---
# FEATURE-007: E2E Test Suite
Status: queued
Milestone: Quality Hardening
Rationale: Adaptive conversation milestone shipped without E2E coverage. URL param contract between EntryForm and questionnaire was invisible to unit tests — caused the intent bug. Every flow boundary needs an E2E spec before further features ship.
Tasks: TASK-024, TASK-025, TASK-026, TASK-027, TASK-028

---
- **Model-hint:** sonnet
- **File-count:** 3
## TASK-024: Playwright Setup + CI Integration
Status: done
Notes: committed 437e1ba — playwright.config.ts, e2e/.gitkeep, CI e2e job, @playwright/test installed
Feature: FEATURE-007
Agent: frontend-developer
Spec: Install and configure Playwright for the project. Add @playwright/test to devDependencies. Create playwright.config.ts at project root: baseURL pointing to http://localhost:3000, webServer.command="pnpm dev", webServer.reuseExistingServer=!process.env.CI, single chromium browser, retries:1 on CI. Add pnpm script: "test:e2e": "playwright test". Update .github/workflows/ci.yml to add a new e2e job with needs:ci (runs after unit job, not in parallel): install playwright browsers (pnpm exec playwright install --with-deps chromium), run pnpm test:e2e. Add e2e/ directory with a .gitkeep. Add /e2e to .eslintignore.
Scenarios:
- GIVEN playwright.config.ts exists WHEN pnpm test:e2e runs THEN Playwright finds the config and starts the dev server
- GIVEN CI workflow updated WHEN push to main THEN E2E job runs after unit test job (needs: ci)
- GIVEN local dev server already running WHEN pnpm test:e2e runs locally THEN reuseExistingServer reuses it without starting a second instance
Artifacts:
- playwright.config.ts
- e2e/.gitkeep
- .github/workflows/ci.yml (updated — new e2e job with needs:ci)
- package.json (test:e2e script + @playwright/test in devDependencies)
- .eslintignore (e2e/ added)
Produces: Playwright infrastructure — unlocks TASK-025 through TASK-028
Verify: cto + qa-engineer — config valid, CI e2e job has needs:ci, reuseExistingServer set, devDep present
Depends: none

---
- **Model-hint:** sonnet
- **File-count:** 5
## TASK-025: E2E — home-entry.spec.ts
Status: done
Notes: 4/4 chromium passing — intent URL param contract covered
Feature: FEATURE-007
Agent: frontend-developer
Spec: Write e2e/home-entry.spec.ts covering the home page entry form. Mock POST /api/classify via page.route('**/api/classify', route => route.fulfill({...})) to return { data: { components: ["prepare","train","program"], confidence: 0.9 }, error: null }. Tests: (1) happy path — user types 4+ words, submits, mock fires, page navigates to /questionnaire with intent= param set to the user's text; (2) validation — fewer than 3 words shows inline error, no navigation; (3) char limit — typing past 500 chars is blocked; (4) URL param contract — after navigation, searchParams.get("intent") equals the submitted text exactly.
Scenarios:
- GIVEN user types "I want to download training data" WHEN form submitted THEN navigated to /questionnaire?intent=I+want+to+download+training+data&...
- GIVEN user types "hi" WHEN form submitted THEN error message shown, no navigation
- GIVEN 500 chars typed WHEN user types one more THEN textarea value stays at 500
Artifacts:
- e2e/home-entry.spec.ts
Produces: Home form + URL param contract covered
Verify: qa-engineer — all 4 scenarios pass, intent param present in URL after navigation
Depends: TASK-024

---
- **Model-hint:** sonnet
- **File-count:** 1
## TASK-026: E2E — questionnaire-flow.spec.ts
Status: done
Notes: 4/4 chromium passing — adaptive flow + back nav covered
Feature: FEATURE-007
Agent: frontend-developer
Spec: Write e2e/questionnaire-flow.spec.ts covering in-page questionnaire behaviour. Mock POST /api/converse via page.route('**/api/converse', ...) with call-count tracking: first call returns { data: { done: false, question: "What are you optimising?", options: ["Loss function", "Learning rate", "Something else — I'll describe it"] }, error: null }; second call returns done:true with components + useCase. Tests: (1) initial load renders the first question; (2) selecting an option enables the Next button; (3) selecting "Something else" reveals free-text input; (4) clicking Back on turn 1 navigates to previous page; (5) after answering turn 1 and Next, second API call fires with turns array containing the first answer; (6) when done:true received, page navigates to /confirm with components, useCase, confidence params.
Scenarios:
- GIVEN page loads with intent param WHEN first mock resolves THEN question text and radio options render
- GIVEN "Something else" selected WHEN rendered THEN free-text textarea appears
- GIVEN Back on turn 0 WHEN clicked THEN router.back() fires (no API call)
- GIVEN turn 1 answered WHEN done:true returned THEN /confirm?components=...&useCase=...&confidence=... navigated
Artifacts:
- e2e/questionnaire-flow.spec.ts
Produces: Adaptive conversation UI fully covered
Verify: qa-engineer — all 6 scenarios pass including back nav and free-text reveal
Depends: TASK-024

---
- **Model-hint:** sonnet
- **File-count:** 1
## TASK-027: E2E — confirm-to-output.spec.ts
Status: done
Notes: 4/4 chromium passing — useCase display + start over + output render covered
Feature: FEATURE-007
Agent: frontend-developer
Spec: Write e2e/confirm-to-output.spec.ts covering the confirmation and output pages. Mock POST /api/output via page.route('**/api/output', route => route.fulfill({...})) to return { data: { guide_steps: ["Step 1: ...", "Step 2: ..."], prompt: "Here is your prompt..." }, error: null }. Tests: (1) /confirm renders component cards for each component in the URL params; (2) useCase string from URL renders as "Here's what we understood: [useCase]"; (3) "Start over" navigates to / with no stale params; (4) "Confirm" navigates to /output; (5) /output renders guide steps and prompt text; (6) copy button for the prompt is present and clickable.
Scenarios:
- GIVEN /confirm?components=prepare,train&useCase=tune+my+model&confidence=0.8 WHEN rendered THEN "prepare" and "train" cards visible + useCase text present
- GIVEN "Start over" clicked WHEN navigation fires THEN URL is / with no params
- GIVEN "Confirm" clicked WHEN /output renders THEN guide steps and prompt visible
Artifacts:
- e2e/confirm-to-output.spec.ts
Produces: Confirmation + output pages covered
Verify: qa-engineer — all 6 scenarios pass, useCase displayed, Start over clears params
Depends: TASK-024

---
- **Model-hint:** sonnet
- **File-count:** 1
## TASK-028: E2E — full-happy-path.spec.ts (smoke test)
Status: done
Notes: 1/1 chromium passing — full journey covered, mock uses turns.length>0 not call-count (React 18 Strict Mode safe)
Feature: FEATURE-007
Agent: frontend-developer
Spec: Write e2e/full-happy-path.spec.ts as a single end-to-end smoke test covering the complete user journey. Mock all three API routes via page.route(): /api/classify, /api/converse (call-count tracked for 2 calls), /api/output. Flow: (1) land on /; (2) type a goal and submit; (3) answer the questionnaire question; (4) reach /confirm with correct params; (5) click Confirm; (6) reach /output with guide and prompt rendered. This test must pass on every deploy — it is the canonical regression guard for the full flow.
Scenarios:
- GIVEN a fresh browser session WHEN user completes the full flow THEN output page renders with guide and prompt — zero errors
Artifacts:
- e2e/full-happy-path.spec.ts
Produces: End-to-end smoke test — catches any cross-page contract regressions
Verify: qa-engineer + cto — single passing run covers the full user journey, no flakiness
Depends: TASK-025, TASK-026, TASK-027

---
- **Model-hint:** sonnet
- **File-count:** 1
## TASK-029: Fix "The Lucid Researcher" branding in QuestionCard header
Status: done
Notes: Fixed incidentally during dark theme rewrite — QuestionCard now shows "auto-leverage"
Milestone: MVP — Questionnaire to Output
Type: fix
Depends: —
Validation: dev → qa → em
Spec: Replace the hardcoded "The Lucid Researcher" text in `components/QuestionCard.tsx:41` with "auto-leverage" to match the rest of the app branding.
Acceptance:
- Header in QuestionCard shows "auto-leverage" (not "The Lucid Researcher")
- All other header styles unchanged
- No regressions in questionnaire-flow.spec.ts
Context: components/QuestionCard.tsx, app/questionnaire/page.tsx

---
- **Model-hint:** sonnet
- **File-count:** 0
## TASK-030: Confirm page — richer analysis summary using conversation turns
Status: done
Notes: branch oms-work/task-030 — sessionStorage turns, Q&A list + useCase-tailored component cards
Milestone: MVP — Questionnaire to Output
Type: feature
Depends: —
Validation: dev → qa → em
Spec: |
  The confirm page currently shows only the raw user input and component names. It has no
  access to the Q&A turns from the conversation, so it cannot show what was learned.

  Two changes required:

  1. **Pass turns to confirm page** — when questionnaire navigates to /confirm on `done: true`,
     include the serialised turns in the URL (JSON.stringify + encodeURIComponent, or use
     sessionStorage to avoid URL length limits). Confirm page reads and deserialises them.

  2. **Redesign the summary card** — replace the single "HERE'S WHAT WE UNDERSTOOD" card with:
     - A "What we asked" section: list each Q&A pair from turns (question label + chosen answer)
     - A "What we identified" section: component cards with name + one-line description of what
       that component handles (not generic — specific to the user's useCase)
     - Keep the existing "Yes, this fits" CTA and "Start over" link

  The goal: user should be able to read the confirm page and feel confident the system
  understood their specific situation — not just see their raw input echoed back.

Acceptance:
- Confirm page receives and displays the Q&A turns from the conversation
- Each turn shown as: question text + selected answer (not raw API shape)
- Component cards show name + useCase-contextualised description
- "Yes, this fits" and "Start over" still work
- confirm-to-output.spec.ts updated to cover the new summary structure
Context: app/confirm/page.tsx, app/questionnaire/page.tsx, components/QuestionCard.tsx

---
- **Model-hint:** sonnet
- **File-count:** 0
## TASK-031: Rewrite output guide steps in plain language for non-tech users
Status: done
Notes: branch oms-work/task-031 — all 7 templates rewritten, zero jargon, 115 unit tests pass
Milestone: MVP — Questionnaire to Output
Type: fix
Depends: —
Validation: dev → qa → em
Spec: |
  The guide steps on the output page use autoresearch internals that non-tech users
  don't understand (e.g. "val_bpb", "prepare.py", "rebuild your dataset"). The product
  is advisory-only for non-technical people — guide language must match that audience.

  Changes required:
  1. Audit the LLM prompt that generates guide steps — identify where jargon leaks in
  2. Add an explicit instruction to the prompt: no filenames, no metric variable names,
     no CLI commands — translate every technical concept to plain English
  3. Replace `val_bpb` → "your model's current accuracy score"
  4. Replace file references (prepare.py, train.py) → "the data preparation step", 
     "the training step"
  5. Replace "the agent" → "the AI" or "autoresearch"
  6. Test with 3 different use cases (NBA, optimizer, image classifier) and confirm
     zero jargon in any generated guide

Acceptance:
- No technical variable names, filenames, or CLI terms in any guide step
- A non-technical user can read all 6 steps without needing to look anything up
- Prompt change validated against 3 different useCase inputs
Context: app/output/page.tsx, app/api/converse/route.ts (or wherever guide generation lives)

---
- **Model-hint:** sonnet
- **File-count:** 0
## TASK-032: Output page — worked example simulation panel
Status: done
Notes: /api/simulate route + SimulationCard + non-blocking load, 130 tests pass
Milestone: MVP — Questionnaire to Output
Type: feature
Depends: TASK-031
Validation: dev → qa → em
Spec: |
  After seeing the guide and prompt, users have no concrete sense of what running
  autoresearch actually looks like. Add a "See it in action" panel on the output page
  that shows a minimal worked example tailored to their use case.

  The simulation is not a real run — it is a pre-rendered / LLM-generated walkthrough
  that shows what the process looks like step by step:

  1. **Drafted input** — show an example of what their input data might look like
     (e.g. for NBA: a small CSV of team stats; for optimizer: a loss curve table).
     Generated by LLM based on useCase, shown as a code block or table.

  2. **Metric chosen** — show which metric autoresearch would track for their goal
     (plain English: "We'd watch prediction accuracy improve over each experiment").

  3. **Simulated run** — show 3–5 rows of fake experiment results with the metric
     improving across iterations. A simple table: Experiment | Result | Status.
     Numbers should be plausible for the domain, not random.

  4. **Outcome summary** — one sentence: "By experiment 4, the model exceeded the
     target — autoresearch would stop here and report the winning setup."

  This is entirely LLM-generated on the server at output time, added as a new section
  below the existing guide. No real compute required.

  New API call: POST /api/simulate with { useCase, components } → returns the four
  panels above as structured JSON. Rendered client-side below the guide.

Acceptance:
- "See it in action" section appears on output page for all component combinations
- Shows drafted input, chosen metric, simulated experiment table, outcome summary
- Language is non-technical throughout (follows TASK-031 plain-language rules)
- Loads after the guide (non-blocking — show skeleton, then populate)
- E2E spec covers the section appearing and containing expected structure
Context: app/output/page.tsx, app/api/ (new simulate endpoint)

---
- **Model-hint:** sonnet
- **File-count:** 2
## TASK-033: In-memory TTL cache for /api/simulate
Status: done
Notes: module-scope Map TTL cache (60 min), 15 unit tests pass
Milestone: Distribution Ready
Type: improvement
Depends: —
Validation: dev → qa → em
Spec: |
  /api/simulate calls GLM on every output page load with no caching. In a serverless
  environment a per-instance in-memory Map with TTL is sufficient at current traffic.
  Cache key: MD5-style hash of "{useCase}:{components.sort().join(',')}".
  TTL: 60 minutes. On cache hit: return cached SimulationResult directly. On miss: call
  GLM, store result, return it. Cache lives in module scope (survives warm invocations).
Acceptance:
- Second identical request within 60 min returns cached result without calling GLM
- Different useCase or components produce a cache miss and call GLM
- Cache expiry after TTL triggers a fresh GLM call
- Unit tests cover: hit, miss, expiry, null useCase (no cache — useCase is required for simulation)
Context: app/api/simulate/route.ts, app/api/simulate/__tests__/route.test.ts
Scenarios:
- GIVEN identical {useCase, components} sent twice within 60 min | WHEN second POST /api/simulate | THEN GLM is not called and cached result is returned
- GIVEN different useCase on second request | WHEN POST /api/simulate | THEN GLM is called again (cache miss)
- GIVEN cache entry older than 60 min | WHEN POST /api/simulate | THEN GLM is called and cache is refreshed
- GIVEN null useCase | WHEN POST /api/simulate | THEN no cache entry is written and GLM is called each time
Artifacts:
- app/api/simulate/route.ts
- app/api/simulate/__tests__/route.test.ts
Verify: pnpm test -- --testPathPattern="simulate" 2>&1 | tail -5

---
- **Model-hint:** sonnet
- **File-count:** 4
## TASK-034: Structured error logging + GLM rate limit surfacing
Status: done
Notes: structured console.error in all routes, rate limit headers surfaced in llm-client.ts
Milestone: Distribution Ready
Type: improvement
Depends: —
Validation: dev → qa → em
Spec: |
  GLM errors in /api/converse and /api/simulate currently swallow all context. Vercel
  function logs capture console.error output and display it in the dashboard. Before every
  error return, log structured JSON: { endpoint, errorType, message, timestamp }. Also
  check GLM HTTP response headers for X-RateLimit-Remaining and X-RateLimit-Reset — log
  them when present so we can observe rate limit proximity without hitting the limit.
  Changes required in lib/llm-client.ts (surface headers), /api/converse/route.ts,
  /api/simulate/route.ts, /api/output/route.ts (all three error paths).
Acceptance:
- Each error return in GLM routes logs: { endpoint, errorType, message, timestamp } via console.error
- When GLM response includes X-RateLimit-Remaining ≤ 10, a warning log fires
- No sensitive data (API key, user content) appears in any log output
- Unit tests: mock GLM to return 429 with rate limit headers, assert warning logged
Context: lib/llm-client.ts, app/api/converse/route.ts, app/api/simulate/route.ts, app/api/output/route.ts
Scenarios:
- GIVEN GLM returns a 500 error | WHEN /api/converse processes the response | THEN console.error logs { endpoint, errorType, message, timestamp } with no API key or user content
- GIVEN GLM response includes X-RateLimit-Remaining: 5 | WHEN response is processed | THEN a warning log fires with the rate limit value
- GIVEN GLM returns 429 | WHEN rate limit headers are parsed | THEN X-RateLimit-Remaining and X-RateLimit-Reset are logged
- GIVEN an error occurs | THEN no user content (useCase, turns) appears in any log line
Artifacts:
- lib/llm-client.ts
- app/api/converse/route.ts
- app/api/simulate/route.ts
- app/api/output/route.ts
Verify: pnpm test -- --testPathPattern="llm-client" 2>&1 | tail -5

---
- **Model-hint:** sonnet
- **File-count:** 2
## TASK-035: GLM retry logic for transient failures
Status: done
Notes: max 2 attempts, 500ms on 502/503, Retry-After-aware on 429, no retry on 4xx, 25 tests pass
Milestone: Distribution Ready
Type: improvement
Depends: —
Validation: dev → qa → em
Spec: |
  GLM calls currently fail immediately on any HTTP error. Transient failures (503, 502)
  warrant a single retry with a short delay. Rate limit (429) warrants one retry after
  the reset delay (read from Retry-After header, cap at 2s). Other errors (400, 401, 404)
  must NOT retry — they indicate a permanent problem.
  Implement in lib/llm-client.ts glmChat(): max 2 attempts total, 500ms delay on 503/502,
  Retry-After (max 2000ms) on 429. Return last error after all attempts exhausted.
Acceptance:
- 503 response triggers one retry after 500ms; success on retry returns result
- 429 response triggers one retry after min(Retry-After, 2000)ms
- 400 response does not retry — throws immediately
- All 3 scenarios covered by unit tests with mocked fetch
Context: lib/llm-client.ts, lib/__tests__/llm-client.test.ts
Scenarios:
- GIVEN GLM returns 503 | WHEN glmChat() is called | THEN one retry fires after 500ms and succeeds on second attempt
- GIVEN GLM returns 429 with Retry-After: 1 | WHEN glmChat() is called | THEN one retry fires after 1000ms (capped at 2000ms)
- GIVEN GLM returns 400 | WHEN glmChat() is called | THEN no retry — error thrown immediately
- GIVEN both attempts fail with 503 | WHEN all retries exhausted | THEN last error is thrown
Artifacts:
- lib/llm-client.ts
- lib/__tests__/llm-client.test.ts
Verify: pnpm test -- --testPathPattern="llm-client" 2>&1 | tail -5

---
- **Model-hint:** sonnet
- **File-count:** 0
## TASK-036: Collapse simulation panel behind toggle by default
Status: done
Notes: app/output/page.tsx — simExpanded state, lazy fetchSimulation on first toggle, data-testid="sim-panel"; e2e/simulation-panel.spec.ts covers hidden-on-load + no-refetch
Milestone: Distribution Ready
Type: improvement
Depends: —
Validation: dev → qa → em
Spec: |
  The simulation panel currently renders open on the output page, competing with the
  guide for first attention. Collapse it by default. Add a toggle button below the guide:
  "See a worked example ▸" (collapsed) / "Hide example ▾" (expanded). The SimulationCard
  only mounts/fetches when the user expands it for the first time (lazy — do not trigger
  /api/simulate until user clicks the toggle). This also reduces GLM calls for users who
  don't need the simulation.
Acceptance:
- Output page loads with simulation panel hidden; only guide + prompt visible
- Toggle button "See a worked example ▸" appears below the guide section
- Clicking toggle expands panel and triggers /api/simulate fetch (first time only)
- Subsequent toggles show/hide without re-fetching
- E2E: simulation section hidden on load; visible after toggle click
Context: app/output/page.tsx, components/SimulationCard.tsx, e2e/simulation-panel.spec.ts

---
- **Model-hint:** sonnet
- **File-count:** 0
## TASK-037: "Ready to run this?" CTA above prompt copy block
Status: done
Notes: added muted CTA heading in OutputCard.tsx, 14 unit tests pass
Milestone: Distribution Ready
Type: improvement
Depends: —
Validation: dev → qa → em
Spec: |
  The output page ends with "Start over" — giving users no forward action orientation
  after reading the guide. Insert a plain-language CTA heading directly above the LLM
  prompt copy block: "Ready to run this? Paste the prompt below into Claude, ChatGPT,
  or Gemini." Style: small caps label or muted text, same visual weight as the "YOUR GUIDE"
  label. Does not replace the existing copy button — adds context above it.
Acceptance:
- "Ready to run this?" heading appears between the guide steps and the prompt copy block
- Heading is visually subordinate (not bolder than guide headings)
- Mobile layout: heading remains above prompt on small screens
- No existing functionality removed or broken
Context: components/OutputCard.tsx
Scenarios:
- GIVEN the output page renders | WHEN the DOM is inspected | THEN "Ready to run this?" text appears directly before the prompt copy block
- GIVEN mobile viewport (375px) | WHEN output page renders | THEN CTA heading is above the prompt and not obscured
- GIVEN the existing copy button | WHEN CTA is added | THEN copy button still present and functional with no regression
Artifacts:
- components/OutputCard.tsx
- components/__tests__/OutputCard.test.tsx
Verify: pnpm test -- --testPathPattern="OutputCard" 2>&1 | tail -5

---
- **Model-hint:** sonnet
- **File-count:** 0
## TASK-038: Share button on output page
Status: done
Notes: ExportActions.tsx + 6 unit tests, clipboard.writeText + 2s feedback
Milestone: Distribution Ready
Type: feature
Depends: TASK-036, TASK-037
Validation: dev → qa → em
Spec: |
  Users have no way to share a completed guide with a colleague. The output page URL
  already contains all state needed to reproduce the result (components + useCase as
  query params). The share feature is: copy the current page URL to clipboard.
  Add a "Share this guide" button to OutputCard alongside the existing export buttons.
  Same copy-feedback pattern as ExportActions (button text changes to "Copied!" for 2s).
  The URL copied is window.location.href — no additional encoding required.
Acceptance:
- "Share this guide" button appears in the export actions area
- Clicking copies window.location.href to clipboard
- Button shows "Copied!" feedback for 2 seconds then resets
- Pasting the copied URL in a new tab loads the same output page
- Unit test: button click triggers clipboard.writeText with the current href
Context: components/ExportActions.tsx, components/__tests__/ExportActions.test.tsx
Scenarios:
- GIVEN user is on output page | WHEN "Share this guide" is clicked | THEN window.location.href is written to clipboard
- GIVEN button is clicked | WHEN feedback state activates | THEN button text changes to "Copied!" for 2s then reverts
- GIVEN clipboard write succeeds | WHEN copied URL is pasted in new tab | THEN same output page renders with identical components + useCase
- GIVEN button click | WHEN unit test fires | THEN clipboard.writeText is called with current href exactly once
Artifacts:
- components/ExportActions.tsx
- components/__tests__/ExportActions.test.tsx
Verify: pnpm test -- --testPathPattern="ExportActions" 2>&1 | tail -5

---
- **Model-hint:** sonnet
- **File-count:** 0
## TASK-039: In-memory TTL cache for /api/output
Status: done
Notes: module-scope Map TTL cache, sentinel key for null useCase, 76 tests pass
Milestone: Distribution Ready
Type: improvement
Depends: TASK-036, TASK-037
Validation: dev → qa → em
Spec: |
  /api/output now calls GLM for guide personalization on every request. Shared URLs
  (from TASK-038) will trigger this call for every recipient. Cache per
  "{components.sort().join(',')}:{useCase}" hash, TTL 60 minutes. Same pattern as
  TASK-033. Null useCase: cache the non-personalized template response separately
  (key: "{components.sort().join(',')}:__no_usecase__").
Acceptance:
- Second identical {components, useCase} request within 60 min skips GLM and returns cached result
- Null useCase requests cache the template response
- Different useCase triggers cache miss
- Unit tests: hit, miss, null useCase, TTL expiry
Context: app/api/output/route.ts, app/api/output/__tests__/route.test.ts (create if not exists)
Scenarios:
- GIVEN identical {components, useCase} sent twice within 60 min | WHEN second POST /api/output | THEN GLM is not called and cached result returned
- GIVEN null useCase on two requests with same components | WHEN second request | THEN cached template response returned without GLM call
- GIVEN different useCase on second request | WHEN POST /api/output | THEN GLM called again (cache miss)
- GIVEN cache entry older than 60 min | WHEN POST /api/output | THEN GLM called and cache refreshed
Artifacts:
- app/api/output/route.ts
- app/api/output/__tests__/route.test.ts
Verify: pnpm test -- --testPathPattern="api/output" 2>&1 | tail -5

---
- **Model-hint:** sonnet
- **File-count:** 0
## TASK-040: Vercel Analytics + 4 funnel events
Status: done
Notes: @vercel/analytics installed, 4 events wired, 30 new tests
Milestone: Distribution Ready
Type: feature
Depends: TASK-033, TASK-034
Validation: dev → qa → em
Spec: |
  No funnel visibility exists. Install @vercel/analytics and track 4 events:
  1. questionnaire_start — fires when user submits the home form (intent entered, navigates to /questionnaire)
  2. questionnaire_complete — fires when /api/converse returns done:true
  3. confirm_proceed — fires when user clicks "Yes, this fits" on the confirm page
  4. output_copy_prompt — fires when user clicks "Copy to clipboard" in ExportActions

  Add <Analytics /> to app/layout.tsx. Use the track() function from @vercel/analytics
  at each event point. No PII: do not include useCase text, turns content, or any
  user-identifiable data in event payloads. Components array (e.g. ["train","program"])
  is acceptable as a non-identifying property.
Acceptance:
- pnpm add @vercel/analytics installs cleanly
- <Analytics /> present in app/layout.tsx
- Each of the 4 events fires at the correct user action
- No PII in any track() call payload
- Unit tests mock track() and assert it is called with correct event name at each trigger point
Context: app/layout.tsx, app/page.tsx, app/questionnaire/page.tsx, app/confirm/page.tsx, components/ExportActions.tsx
Scenarios:
- GIVEN user submits home form | WHEN navigation to /questionnaire occurs | THEN track("questionnaire_start") fires with no PII payload
- GIVEN /api/converse returns done:true | WHEN response processed | THEN track("questionnaire_complete") fires with components array (no useCase text)
- GIVEN user clicks "Yes, this fits" on confirm page | WHEN click handler fires | THEN track("confirm_proceed") fires
- GIVEN user clicks "Copy to clipboard" | WHEN ExportActions click fires | THEN track("output_copy_prompt") fires with no user content
Artifacts:
- app/layout.tsx
- app/page.tsx
- app/questionnaire/page.tsx
- app/confirm/page.tsx
- components/ExportActions.tsx
Verify: pnpm test -- --testPathPattern="questionnaire|ExportActions|confirm" 2>&1 | tail -5
- **Model-hint:** sonnet
- **File-count:** 5

---

## TASK-041: Restructure home-entry.spec.ts into 5-category E2E spec
Status: queued
Milestone: Quality & Resilience v1
Type: test
Depends: none
Validation: qa-engineer → cto
Model-hint: sonnet
Spec: |
  home-entry.spec.ts SHALL be restructured into exactly 5 test.describe blocks using the
  rules/testing.md skeleton. Categories 2, 3, and 4 SHALL each have a // N/A comment with
  specific reasons.
  Category 1 (happy path) SHALL contain: submit valid input → navigate to /questionnaire
  with correct ?intent= param; URL param equals submitted text exactly.
  Category 2 SHALL have // N/A (error states): home entry form does not call any API — the
  submit button navigates client-side only; no server error path exists.
  Category 3 SHALL have // N/A (empty state): page always renders with an empty textarea;
  there is no missing-data render state.
  Category 4 SHALL have // N/A (auth edge): no authentication in this product.
  Category 5 (input edge) SHALL contain: fewer than 3 words → inline error visible, no
  navigation; 500-char input → textarea capped at 500 chars.
  All existing test logic SHALL be preserved — no test cases removed.
  File SHALL pass pnpm exec playwright test e2e/home-entry.spec.ts with 0 failures.
Scenarios:
  - GIVEN home-entry.spec.ts | WHEN grep "test.describe\|// N/A" | THEN ≥5 matches
  - GIVEN category 2 | THEN // N/A comment contains "no API call"
  - GIVEN category 3 | THEN // N/A comment contains "empty textarea"
  - GIVEN category 4 | THEN // N/A comment contains "no authentication"
  - GIVEN valid 3+ word input | WHEN submit | THEN navigates to /questionnaire with correct intent param
  - GIVEN 1-word input | WHEN submit | THEN #entry-error visible, pathname stays /
  - GIVEN 500-char input + type one more | THEN textarea.value.length === 500
Artifacts:
  - e2e/home-entry.spec.ts
Verify: pnpm exec playwright test e2e/home-entry.spec.ts

---

## TASK-042: Restructure questionnaire-flow.spec.ts into 5-category E2E spec
Status: queued
Milestone: Quality & Resilience v1
Type: test
Depends: none
Validation: qa-engineer → cto
Model-hint: sonnet
Spec: |
  questionnaire-flow.spec.ts SHALL be restructured into 5 test.describe blocks.
  Category 1 (happy path): initial load renders question + radio options; select option →
  next → done:true → /confirm with correct components + useCase params.
  Category 2 (error states): mock /api/converse to return status 500 → page SHALL display
  a user-visible error message (not a blank or frozen screen). If the questionnaire page
  (app/questionnaire/page.tsx) does not currently render an error on fetch failure, a
  minimal error state SHALL be added — e.g. "Something went wrong. Please try again."
  with a retry or start-over affordance.
  Category 3 (empty state): navigate to /questionnaire with no intent param (or empty
  string intent) → page SHALL redirect to / or show "Please describe your goal first"
  with a link to /. If this guard is absent, add it to app/questionnaire/page.tsx.
  Category 4 SHALL have // N/A (auth edge): no authentication in this product.
  Category 5 (input edge): "Something else — I'll describe it" selected → free text area
  visible; back button on turn 0 → navigates away without additional API call.
  All tests SHALL pass pnpm exec playwright test e2e/questionnaire-flow.spec.ts.
Scenarios:
  - GIVEN 5 test.describe blocks (auth edge N/A) | THEN each block is present or commented
  - GIVEN /api/converse mocked to 500 | WHEN page loads | THEN error message visible
  - GIVEN /questionnaire with no intent param | THEN redirect to / OR "describe your goal" shown
  - GIVEN "Something else" option | WHEN clicked | THEN free text textarea visible
  - GIVEN back button on turn 0 | WHEN clicked | THEN navigates away, callCount unchanged
  - GIVEN done:true response | THEN /confirm?components=train&useCase=tune+my+optimizer
Artifacts:
  - e2e/questionnaire-flow.spec.ts
  - app/questionnaire/page.tsx (modified if error state or empty intent guard missing)
Verify: pnpm exec playwright test e2e/questionnaire-flow.spec.ts && pnpm exec tsc --noEmit

---

## TASK-043: Restructure confirm-to-output.spec.ts into 5-category E2E spec
Status: queued
Milestone: Quality & Resilience v1
Type: test
Depends: none
Validation: qa-engineer → cto
Model-hint: sonnet
Spec: |
  confirm-to-output.spec.ts SHALL be restructured into 5 test.describe blocks.
  Category 1 (happy path): component cards visible (Data Preparation, Model Trainer);
  useCase text visible; confirm → /output shows guide steps and LLM prompt.
  Category 2 (error states): mock /api/output to return status 500 → user SHALL see an
  error message on the output page (not blank). If app/output/page.tsx does not currently
  render an error on 500, add a minimal error state.
  Category 3 (empty state): navigate to /confirm with no URL params (missing components)
  → page SHALL redirect to / or show "Start over" with link to /. If the guard is absent,
  add it to app/confirm/page.tsx.
  Category 4 SHALL have // N/A (auth edge): no authentication in this product.
  Category 5 (input edge): start over button → navigates to / with no query params;
  useCase with special characters (e.g. ampersands, quotes) renders correctly on page.
  All tests SHALL pass pnpm exec playwright test e2e/confirm-to-output.spec.ts.
Scenarios:
  - GIVEN component cards | THEN "Data Preparation" and "Model Trainer" visible
  - GIVEN /api/output mocked to 500 | THEN error message visible (not blank page)
  - GIVEN /confirm with no components param | THEN redirect to / OR start-over message
  - GIVEN start over button | WHEN clicked | THEN URL === "/"
  - GIVEN useCase with & char in URL | THEN page renders without error
Artifacts:
  - e2e/confirm-to-output.spec.ts
  - app/confirm/page.tsx (modified if missing params guard absent)
  - app/output/page.tsx (modified if 500 error state absent)
Verify: pnpm exec playwright test e2e/confirm-to-output.spec.ts && pnpm exec tsc --noEmit

---

## TASK-044: Restructure simulation-panel.spec.ts into 5-category E2E spec
Status: queued
Milestone: Quality & Resilience v1
Type: test
Depends: none
Validation: qa-engineer → cto
Model-hint: sonnet
Spec: |
  simulation-panel.spec.ts SHALL be restructured into 5 test.describe blocks.
  Category 1 (happy path): panel hidden on load; toggle click shows panel + calls
  /api/simulate once; subsequent toggles show/hide without re-fetching (callCount stays 1).
  Category 2 (error states): mock /api/simulate to return 500 or reject with network error
  → toggle button SHALL remain visible, panel SHALL stay hidden, no error text shown to
  user. This validates the existing silent-fail architectural decision.
  Category 3 SHALL have // N/A (empty state): API always returns either a result or fails
  silently — there is no empty render path for this panel.
  Category 4 SHALL have // N/A (auth edge): no authentication in this product.
  Category 5 (input edge): useCase URL param with 200+ characters → page renders, toggle
  button visible; useCase with special characters → page renders without error.
  All tests SHALL pass pnpm exec playwright test e2e/simulation-panel.spec.ts.
Scenarios:
  - GIVEN /api/simulate mocked to 500 | WHEN toggle clicked | THEN panel NOT visible, no error text
  - GIVEN toggle clicked | WHEN /api/simulate 500 | THEN toggle button still present
  - GIVEN useCase param = 200-char string | THEN page renders, sim-toggle visible
  - GIVEN happy path | THEN existing two tests restructured into describe block, all pass
Artifacts:
  - e2e/simulation-panel.spec.ts
Verify: pnpm exec playwright test e2e/simulation-panel.spec.ts

---

## TASK-045: Rate limit UX — questionnaire 429 static fallback + "on call" message
Status: queued
Milestone: Quality & Resilience v1
Type: feature
Depends: none
Validation: frontend-developer → cto
Model-hint: sonnet
Spec: |
  The questionnaire page (app/questionnaire/page.tsx) SHALL handle HTTP 429 from
  /api/converse with a two-phase UX — degrade first, inform second.
  Phase 1 (immediate): on 429 response, navigate to
  /output?components=prepare,train,program&useCase=<intent>&rate_limited=1&resetMs=<N>
  where N comes from the 429 response body meta.resetMs (already returned by the route).
  No additional GLM calls SHALL be made after the 429.
  Phase 2 (output page): app/output/page.tsx SHALL detect rate_limited=1 in URL params.
  When present, render OUTPUT_TEMPLATES["all"] directly (no /api/output fetch) AND display
  a message below the LLM prompt block: "Our AI advisor is busy and should be back in
  approximately X minutes." where X = Math.ceil(Number(resetMs) / 60000), minimum 1.
  The message SHALL NOT use "will be back" (implies guarantee) — use "should be back".
  The message SHALL NOT appear when rate_limited param is absent.
  "Start over" button SHALL remain visible and functional on the rate-limited output page.
  Unit tests SHALL cover: (a) 429 response triggers router.push with correct params;
  (b) rate_limited=1 + resetMs=180000 → message shows "approximately 3 minutes";
  (c) no rate_limited param → message absent.
  E2E spec SHALL be created at e2e/rate-limit.spec.ts with 5 test.describe blocks per
  rules/testing.md skeleton (auth edge N/A; empty state N/A with comment).
  /api/simulate 429 behaviour is unchanged — silent fail, panel hidden (no new code).
Scenarios:
  - GIVEN /api/converse returns 429 with meta.resetMs=300000 | THEN URL becomes
    /output?...rate_limited=1&resetMs=300000 within 1 render cycle
  - GIVEN output page with rate_limited=1&resetMs=180000 | THEN message "approximately 3 minutes"
  - GIVEN output page with no rate_limited param | THEN no "on call" message visible
  - GIVEN rate-limited output page | WHEN start over clicked | THEN URL === "/"
  - GIVEN rate-limited output page | THEN all 3 component guide steps rendered (from "all" template)
  - GIVEN e2e/rate-limit.spec.ts | THEN 5 test.describe blocks (or N/A comments)
Artifacts:
  - app/questionnaire/page.tsx (modified — 429 detection + navigation)
  - app/output/page.tsx (modified — rate_limited param detection + static template render + message)
  - e2e/rate-limit.spec.ts (new)
  - src/__tests__/rate-limit-ux.test.tsx (new unit tests)
Verify: pnpm test && pnpm exec playwright test e2e/rate-limit.spec.ts && pnpm exec tsc --noEmit

---

## TASK-046: Upstash Redis cache — replace module-scope Maps
Status: queued
Milestone: Quality & Resilience v1
Type: feature
Depends: none
Validation: backend-developer → cto
Model-hint: sonnet
Spec: |
  lib/simulate-cache.ts and lib/output-cache.ts SHALL replace their module-scope Maps
  with Upstash Redis via @upstash/redis.
  A shared lib/redis-client.ts singleton SHALL create the Redis client using
  UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars.
  If either env var is absent (local dev, CI without Redis), the singleton SHALL return
  null and all cache operations SHALL be no-ops — getCached returns null, setCached is
  a no-op. No throw, no blocked GLM call.
  Redis SET calls SHALL use EX option for 3600-second TTL (matching current 60 min).
  Cache key structure (MD5-style hash) SHALL remain unchanged.
  @upstash/redis SHALL be installed via pnpm add @upstash/redis.
  UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN SHALL be added to .env.example
  with placeholder comment: "# Get from Upstash console → Redis → REST API".
  Unit tests SHALL use vi.mock("@upstash/redis") and cover: hit (GET returns cached),
  miss (GET returns null), Redis client throws on GET (getCached returns null, no throw),
  Redis client throws on SET (setCached is no-op, no throw).
Scenarios:
  - GIVEN Redis GET returns cached value | THEN getCached returns result without GLM call
  - GIVEN Redis GET returns null | THEN getCached returns null, GLM call proceeds
  - GIVEN Redis client constructor throws | THEN all cache functions are no-ops, no crash
  - GIVEN Redis SET throws | THEN setCached is silent no-op, response already returned
  - GIVEN .env.example | THEN UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN present
  - GIVEN pnpm test | THEN all existing + new cache tests pass
Artifacts:
  - lib/redis-client.ts (new)
  - lib/simulate-cache.ts (modified — Map replaced with Redis)
  - lib/output-cache.ts (modified — Map replaced with Redis)
  - lib/__tests__/simulate-cache.test.ts (new)
  - lib/__tests__/output-cache.test.ts (new)
  - .env.example (modified — Redis env vars added)
  - package.json (modified — @upstash/redis dependency)
  - pnpm-lock.yaml (modified)
Verify: pnpm test && pnpm exec tsc --noEmit

---

## TASK-047: LLM evaluation — GLM-5 vs Qwen 3.6 side-by-side
Status: queued
Milestone: Quality & Resilience v1
Type: research
Depends: none
Validation: backend-developer → cto
Model-hint: sonnet
Spec: |
  A side-by-side evaluation of GLM-5 (current provider) vs Qwen 3.6 via OpenRouter SHALL
  be run across all 3 API task types:
  (1) /api/converse — question generation: send 3 representative intent strings, capture
  the question+options response.
  (2) /api/simulate — table generation: send 3 representative {useCase, components} pairs,
  capture the drafted_input/experiment_rows/outcome response.
  (3) /api/output — guide personalisation: send 3 representative {useCase, components}
  pairs, capture the guide_steps/llm_prompt response.
  Each response SHALL be scored 1–5 on: (a) plain language (Grade 8 readable, no ML
  jargon unexplained), (b) domain accuracy (autoresearch terms used correctly), (c)
  structure adherence (correct JSON shape: question+options, or guide_steps+llm_prompt).
  Cost SHALL be computed: input + output token count × published price per 1k tokens for
  each provider at 1x (~50 req/day) and 10x (~500 req/day).
  Qwen-turbo SHALL NOT be evaluated.
  If OPENROUTER_API_KEY is unavailable: document the gap in docs/llm-evaluation.md and
  use GLM-only results, noting evaluation is incomplete.
  docs/llm-evaluation.md SHALL contain: methodology, quality scores table
  (provider × task type, 1–5), cost table (1x + 10x), recommendation
  ("Qwen 3.6 qualifies as fallback" or "Qwen 3.6 does not qualify"), and reasoning.
  Quality bar for "qualifies": all 3 task types score ≥4 on plain language AND ≥3 on
  domain accuracy AND ≥4 on structure adherence for Qwen 3.6.
Scenarios:
  - GIVEN docs/llm-evaluation.md | THEN sections: methodology, quality scores, cost, recommendation, reasoning
  - GIVEN quality scores table | THEN 3 task type rows × 2 provider columns, each scored 1–5
  - GIVEN cost table | THEN 1x and 10x rows for each provider
  - GIVEN recommendation section | THEN contains "Qwen 3.6 qualifies" or "Qwen 3.6 does not qualify"
  - GIVEN evaluation | THEN no Qwen-turbo results
  - GIVEN test -f docs/llm-evaluation.md | THEN exits 0
Artifacts:
  - docs/llm-evaluation.md (new)
Produces: Qwen 3.6 pass/fail verdict consumed by TASK-048
Verify: test -f docs/llm-evaluation.md && grep -qE "qualifies|does not qualify" docs/llm-evaluation.md

---

## TASK-048: LLM provider abstraction (gates on TASK-047)
Status: queued
Milestone: Quality & Resilience v1
Type: feature
Depends: TASK-047
Validation: backend-developer → clo → cto
Model-hint: sonnet
Spec: |
  Read docs/llm-evaluation.md before implementing. Implementation path depends on verdict.
  IF Qwen 3.6 qualifies (per TASK-047 recommendation):
    CLO SHALL review OpenRouter's data handling policy (https://openrouter.ai/privacy)
    and confirm: (1) API request data is not used for model training, (2) data is not
    retained beyond the request lifecycle, (3) no explicit DPA is required for the
    data profile of this product (non-PII goal strings, no user accounts). CLO verdict
    SHALL be recorded as a comment in lib/llm-client.ts above the OpenRouter config block.
    If CLO raises a concern → CTO-STOP, surface to CEO before proceeding.
    lib/llm-client.ts SHALL be refactored to support a two-provider config: GLM-5 as
    primary, Qwen 3.6 via OpenRouter as fallback. When GLM-5 returns 429 or 503,
    lib/llm-client.ts SHALL retry once using Qwen 3.6 before propagating the error.
    Caller interface (function signatures, return types, thrown errors) SHALL be unchanged.
    OPENROUTER_API_KEY SHALL be added to .env.example. Key location: ~/.config/openrouter/key.
    OpenRouter endpoint: https://openrouter.ai/api/v1/chat/completions.
    Unit tests SHALL cover: GLM succeeds (Qwen never called); GLM 429 → Qwen called →
    success; GLM 429 → Qwen 429 → original 429 error propagated; GLM 503 → Qwen fallback.
  IF Qwen 3.6 does not qualify (per TASK-047 recommendation):
    lib/llm-client.ts SHALL be hardened for GLM-only: add exponential backoff (100ms,
    200ms, 400ms cap) for 502/503 retries before the existing MAX_ATTEMPTS logic.
    No new providers. No new env vars. Add inline comment referencing docs/llm-evaluation.md
    and stating evaluation outcome.
    Unit tests SHALL cover the new backoff timing.
  In both cases: pnpm test passes; pnpm exec tsc --noEmit passes; all 3 API routes
  (/api/converse, /api/output, /api/simulate) function identically from callers' perspective.
Scenarios:
  - (IF qualifies) GIVEN GLM 429 | THEN Qwen called, response returned without throw
  - (IF qualifies) GIVEN GLM 429 → Qwen 429 | THEN 429 error propagated to caller
  - (IF qualifies) GIVEN OPENROUTER_API_KEY | THEN present in .env.example
  - (IF not qualifies) GIVEN GLM 502 | THEN 3 retry attempts with exponential backoff
  - GIVEN all API routes | THEN caller interface unchanged (same params, same return shape)
  - GIVEN pnpm test | THEN all existing + new tests pass
Artifacts:
  - lib/llm-client.ts (modified — provider config OR backoff hardening)
  - lib/__tests__/llm-client.test.ts (modified — new test cases)
  - .env.example (modified if Qwen qualifies)
Verify: pnpm test && pnpm exec tsc --noEmit

---

## TASK-reelaborate — Re-elaborate incomplete task specs
- **Status:** done
- **Notes:** Scenarios, Verify, Artifacts added to TASK-033–035, TASK-037–040. File-count corrected. TASK-020 was superseded — skipped.
- **Milestone:** current
- **Type:** impl
- **Spec:** The system SHALL re-elaborate all incomplete tasks (TASK-020, TASK-033, TASK-034, TASK-035, TASK-037, TASK-038, TASK-039, TASK-040) to add missing Scenarios, Verify commands, and Artifacts fields following the OpenSpec format in task-schema.md.
- **Artifacts:** .claude/cleared-queue.md
- **Verify:** python3 -c "import re; t=open('.claude/cleared-queue.md').read(); blocks=re.split(r'(?=^## TASK-)',t,flags=re.MULTILINE); missing=[b.split('\n')[0] for b in blocks if b.startswith('## TASK-') and any(f not in b for f in ['Scenarios','Verify','Artifacts'])]; print('PASS' if not missing else f'FAIL: {missing}')"
- **Validation:** dev → em
- **Model-hint:** sonnet
- **File-count:** 1
- **Depends:** none
