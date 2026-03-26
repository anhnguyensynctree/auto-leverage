# 2026-03-25-feature-004-llm-fallback: LLM Fallback Classifier
Date: 2026-03-25  Tier: 1  Domain Lead: backend-developer  Agents: backend-developer, cto  Rounds: 1
Pre-mortem: fallback returns raw LLM text instead of resolving to static template

## Synthesis
1 task. Small scope — extend /api/classify with a conditional fallback branch. Hard constraint: output shape is identical whether static or LLM path was taken. Threshold from env var. Depends on TASK-006.
