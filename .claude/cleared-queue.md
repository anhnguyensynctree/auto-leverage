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
Status: queued
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

## TASK-002: Per-Use-Case Testing Plan
Status: queued
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

## TASK-003: LLM Prompt Templates (3 Components)
Status: queued
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

## TASK-004: Question Stubs for Static Decision Tree
Status: queued
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

## TASK-005: Questionnaire JSON Config (Source of Truth)
Status: queued
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

## TASK-006: POST /api/classify Route
Status: queued
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

## TASK-007: Output Templates + POST /api/output Route
Status: queued
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

## TASK-008: Unit Tests — All 7 Output Combinations
Status: queued
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

## TASK-009: Next.js App Scaffold
Status: queued
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

## TASK-010: Home Page + Free-Text Entry Screen
Status: queued
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

## TASK-011: Questionnaire Flow UI
Status: queued
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

## TASK-012: Confirmation + Output Screen
Status: queued
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

## TASK-013: LLM Fallback Classifier
Status: queued
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

## TASK-014: GitHub Actions CI Pipeline
Status: queued
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

## TASK-015: Vercel Config + Domain Setup
Status: queued
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

## TASK-016: UI Design — All 4 Screens (Stitch)
Status: queued
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
