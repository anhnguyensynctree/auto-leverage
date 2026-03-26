# CEO Decisions — auto-leverage

<!-- Append-only. Format: [date] | [decision] | [rationale] -->
[2026-03-25] | Advisory-only product model | No execution infra — we guide, user runs it themselves.
[2026-03-25] | 3 autoresearch components = prepare.py / train.py / program.md | Confirmed as the taxonomy for all questionnaire routing and output.
[2026-03-25] | Output = step-by-step guide + copy-paste LLM prompt | Dual format serves comprehension and immediate action.
[2026-03-25] | Static branching primary, LLM fallback for edge cases | Cost-aware architecture — static where possible, LLM only when classification fails, link back to static output.
[2026-03-25] | Free-text entry with optional guided expansion | Lower barrier for non-tech users; structured prompts available if they struggle to describe the problem.
[2026-03-25] | Ephemeral sessions, no auth, export only | No login friction; user owns their output via copy/download.
[2026-03-25] | UX researcher must deeply understand autoresearch 3 components | To accurately map user problems to the correct component and design question flows that route correctly.
[2026-03-25] | Stack: Next.js 14 App Router, TypeScript, Tailwind CSS, Vercel | Matches existing project patterns; no new tooling to learn.
[2026-03-25] | Deployment target: auto-leverage.vercel.com | Check availability at setup; fallback to Vercel default if unavailable.
[2026-03-25] | OMS manages full deployment pipeline | GitHub Actions CI + Vercel auto-deploy — no manual deploy steps. FEATURE-005 added to milestone.
[2026-03-25] | FEATURE-001 scope: taxonomy + per-use-case testing plan + business factors + 3 LLM prompt templates | Testing plan covers not just prompting but business outcome expected per use case and failure modes to validate against.
