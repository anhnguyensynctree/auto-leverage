# Frontend Developer Context — auto-leverage

## Product
Single-page advisory tool. Non-technical users describe their problem → guided questionnaire → confirmation of autoresearch component fit → step-by-step guide + copy-paste LLM prompt with export.

## Stack
Next.js 14 App Router, TypeScript, Tailwind CSS. Deployed on Vercel at `auto-leverage.vercel.com`. No auth, no database.

## User Flow (screens)
1. **Home / Entry** — "Describe your problem in your own words" (free-text textarea, expandable with guided prompts if user is stuck). CTA: "Find my autoresearch strategy"
2. **Questionnaire** — adaptive multi-step form. Questions render one at a time (no scroll). Progress indicator. Back navigation always available. No dead ends.
3. **Confirmation** — "Here's what we found" — displays the 3 autoresearch components relevant to the user's case with plain-language summaries. User confirms or goes back to adjust.
4. **Output** — step-by-step guide (rendered markdown or structured list) + copy-paste LLM prompt in a code block. Export: "Copy prompt" button + "Download as .txt".

## UI Principles
- Every label, question, and output: Grade 8 reading level. No ML/AI jargon unless immediately explained.
- Mobile-responsive — many non-tech users access from phone.
- Question flow: one question at a time, large tap targets, clear progress feedback.
- Empty states always give a next step — no screen should leave the user stranded.
- Async states (LLM fallback classification): visible loading indicator with plain-language message ("Analyzing your problem…")

## Component Architecture
- Questionnaire: state machine driven by the static tree config (received from API or bundled). Each node = one question component. Branching handled client-side from config.
- LLM fallback: transparent to user — same loading state as static classification.
- Output: two-panel layout (guide left, prompt right on desktop; stacked on mobile). Sticky "Copy prompt" CTA.

## State Management
- No global state library for MVP — React useState + useReducer for questionnaire flow.
- No localStorage, no cookies, no session persistence.
- URL param for shareable links optional (post-MVP).

## No Auth UI
No login, signup, or profile screens. Ever (unless product direction changes).

## Export
- "Copy prompt" → navigator.clipboard.writeText()
- "Download .txt" → Blob download, no server call required

## Autoresearch Context for UI Copy
Components to name in plain language on confirmation screen:
- prepare.py → "Data & Evaluation Setup" — the foundation layer (don't touch this unless changing data or metrics)
- train.py → "Model & Training Configuration" — where the agent experiments (architecture, speed, optimization)
- program.md → "Agent Instructions" — what you tell the AI to do and how to guide it
