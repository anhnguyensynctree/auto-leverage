# 2026-03-26-feature-007-e2e-suite: Elaborate FEATURE-007 — E2E Test Suite
Date: 2026-03-26  Tier: 1  Domain Lead: qa-engineer  Agents: qa-engineer, cto  Rounds: 1

## Router
Task type: test | Tier 1 — 2 domains (QA + CI infra), reversible, known pattern
Activated: qa-engineer (lead), cto

## Round 1

### qa-engineer
TASK-024 missing @playwright/test as explicit devDep artifact. CI E2E job needs `needs: ci` or it races unit tests. webServer should use `reuseExistingServer: !process.env.CI`. TASK-025–028 need explicit `page.route('**/api/...')` pattern in spec — `route.fulfill()` is correct API but agents need the intercept syntax.

### cto
pnpm v9 in CI vs v10 on Vercel dev machines — note the version mismatch risk when adding @playwright/test. `playwright install --with-deps chromium` correct for ubuntu-latest runners. `.eslintignore` for e2e/ is required, not optional — Playwright test globals will fail ESLint without it.

## Synthesis
Tier 1 — agents agreed, OMS inline synthesis.
Four spec gaps closed: (1) @playwright/test in devDeps + artifacts; (2) needs:ci on E2E job; (3) reuseExistingServer flag; (4) explicit page.route() pattern in all mock specs.
FEATURE-007: draft → queued. TASK-024 spec updated. TASK-025–028 mock patterns updated.

## Trainer
Tier 1 — routing accurate, both agents on-domain, no lessons to write.
