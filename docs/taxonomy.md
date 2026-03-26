# Autoresearch Routing Taxonomy

## Overview

Autoresearch is an autonomous AI research system that runs LLM training experiments on a single GPU without human intervention. It has three components: **Data Prep** (one-time setup that downloads training data and trains a BPE tokenizer — fixed, never modified), **Model Trainer** (the editable training script containing the GPT architecture, optimizer configuration, and hyperparameters — the only file the AI agent modifies), and **Experiment Instructions** (the program.md Markdown file that governs agent behavior, experiment loop logic, and research strategy — edited by the human to steer the autonomous research org). Users do not touch Python directly; they configure outcomes by shaping the Experiment Instructions and understanding what decisions live in the Model Trainer.

---

## Component Summary

| Component | Plain Name | Business Factor |
|---|---|---|
| `prepare.py` | Data Prep | Controls how much and what kind of data the model trains on; shapes data quality ceiling |
| `train.py` | Model Trainer | Directly determines model quality (val_bpb), GPU utilization, and experiment throughput |
| `program.md` | Experiment Instructions | Determines how the AI agent reasons, experiments, and self-directs — the research strategy layer |

---

## User Decisions per Component

### Data Prep (`prepare.py`)

Prepare.py is marked "do not modify" for the core evaluation constants, but users who fork or tune for smaller hardware do influence these parameters:

| Decision | Variable | Default | What it changes |
|---|---|---|---|
| Number of training data shards to download | `--num-shards` CLI arg | 10 | More shards = larger, more diverse training set |
| Parallel download workers | `--download-workers` CLI arg | 8 | Speed of initial data download |
| Context window / sequence length | `MAX_SEQ_LEN` | 2048 tokens | Max token sequence per training row |
| Training time budget | `TIME_BUDGET` | 300s (5 min) | Hard wall-clock cap on each experiment run |
| Validation token count | `EVAL_TOKENS` | ~20M tokens | How many tokens are used to compute final val_bpb |
| Vocabulary size | `VOCAB_SIZE` | 8192 | BPE tokenizer vocabulary; affects model embedding table size |
| Cache/data directory | `CACHE_DIR` | `~/.cache/autoresearch` | Where shards and tokenizer are stored on disk |

### Model Trainer (`train.py`)

This is the only file the agent modifies. Every variable below is fair game:

| Decision | Variable | Default | What it changes |
|---|---|---|---|
| Number of transformer layers | `DEPTH` | 8 | Primary knob for model size and quality |
| Attention head dimension | `HEAD_DIM` | 128 | Controls model_dim = DEPTH × ASPECT_RATIO rounded to nearest HEAD_DIM |
| Model width scaling factor | `ASPECT_RATIO` | 64 | model_dim = DEPTH × ASPECT_RATIO |
| Attention window pattern | `WINDOW_PATTERN` | `"SSSL"` | L = full context; S = half context; pattern repeats across layers |
| Total tokens per optimizer step | `TOTAL_BATCH_SIZE` | 2^19 (~524K) | Effective batch size; must be power of 2 |
| Per-device batch size | `DEVICE_BATCH_SIZE` | 128 | Micro-batch size; reduce if GPU OOM |
| Embedding learning rate | `EMBEDDING_LR` | 0.6 | Adam LR for token embedding table |
| Unembedding learning rate | `UNEMBEDDING_LR` | 0.004 | Adam LR for lm_head output projection |
| Matrix learning rate | `MATRIX_LR` | 0.04 | Muon optimizer LR for all weight matrices |
| Scalar learning rate | `SCALAR_LR` | 0.5 | Adam LR for per-layer scale parameters |
| Weight decay | `WEIGHT_DECAY` | 0.2 | Cautious weight decay applied via Muon |
| Adam betas | `ADAM_BETAS` | (0.8, 0.95) | Momentum coefficients for Adam optimizer |
| LR warmup fraction | `WARMUP_RATIO` | 0.0 | Fraction of time budget spent warming up LR |
| LR warmdown fraction | `WARMDOWN_RATIO` | 0.5 | Fraction of time budget cooling LR to zero |
| Final LR fraction | `FINAL_LR_FRAC` | 0.0 | LR at end of warmdown as fraction of peak |
| Model architecture (full) | All of `GPT`, `Block`, `MLP`, `CausalSelfAttention` | GPT-style transformer | Agent can rewrite any class |
| Optimizer algorithm | `MuonAdamW` class | Muon + AdamW | Agent can change optimizer logic entirely |
| Activation function | `F.relu().square()` in MLP | ReGLU-style | Agent can swap to GeLU, SiLU, etc. |
| Value embeddings | `value_embeds` ModuleDict | Alternating layers | Agent can remove or restructure |

### Experiment Instructions (`program.md`)

Humans edit this file to shape how the autonomous agent operates:

| Decision | What it controls |
|---|---|
| Experiment branch naming convention | How runs are organized in git history |
| In-scope file list | Which files the agent reads for context before experimenting |
| What agent CAN modify | Scope boundary: currently only `train.py` |
| What agent CANNOT modify | Hard constraints: `prepare.py`, evaluation harness, packages |
| Optimization objective | "Get the lowest val_bpb" — human can reframe this |
| Simplicity criterion | Trade-off rule: complexity cost vs. improvement magnitude |
| Logging format | TSV schema: commit, val_bpb, memory_gb, status, description |
| Loop continuation rules | "NEVER STOP" — agent runs until manually interrupted |
| Crash handling policy | Fix trivial bugs; skip fundamentally broken ideas |
| Timeout threshold | Kill run if it exceeds 10 minutes |
| Agent identity / framing | Intro narrative that shapes agent persona and research mindset |

---

## Routing Signals

Plain-language phrases non-technical users say, mapped to the component that handles them.

| User Language / Phrase | Maps To Component | Tiebreaker (if any) |
|---|---|---|
| "I want to download more training data" | Data Prep | — |
| "How do I get the data ready before training?" | Data Prep | — |
| "The tokenizer isn't trained yet" | Data Prep | — |
| "I only have a small GPU, how do I reduce the data size?" | Data Prep | If about sequence length → also Model Trainer |
| "How do I set up the cache folder / where data lives?" | Data Prep | — |
| "I want to download all the shards, not just 10" | Data Prep | — |
| "Can I use a different vocabulary size?" | Data Prep | If about embedding table size → also Model Trainer |
| "The validation score isn't fair / I want more eval tokens" | Data Prep | — |
| "I want to make the model bigger" | Model Trainer | — |
| "Can I change the learning rate?" | Model Trainer | — |
| "How do I tune the optimizer?" | Model Trainer | — |
| "I want to try a different activation function" | Model Trainer | — |
| "The model is running out of memory (OOM)" | Model Trainer | Reduce DEVICE_BATCH_SIZE or DEPTH first |
| "I want to experiment with attention window size" | Model Trainer | — |
| "How do I adjust batch size?" | Model Trainer | — |
| "Can I change the model architecture?" | Model Trainer | — |
| "I want to add more transformer layers" | Model Trainer | — |
| "How do I control how fast training converges?" | Model Trainer | Could touch warmup/warmdown ratios |
| "I want to try a different optimizer" | Model Trainer | — |
| "How do I make the agent smarter about what to try?" | Experiment Instructions | — |
| "I want the agent to focus on a specific type of experiment" | Experiment Instructions | — |
| "Can I change what the agent is allowed to modify?" | Experiment Instructions | — |
| "I want the agent to stop after N experiments instead of running forever" | Experiment Instructions | — |
| "How do I tell the agent what counts as a good result?" | Experiment Instructions | — |
| "The agent keeps trying things that crash — how do I guide it?" | Experiment Instructions | — |
| "I want to add more agents to the research team" | Experiment Instructions | — |
| "How do I change the logging format / what gets recorded?" | Experiment Instructions | — |
| "I want the agent to read additional reference papers or code" | Experiment Instructions | — |
| "How do I set up a new experiment run from scratch?" | Experiment Instructions | — |
| "I want the agent to prefer simpler solutions over marginal gains" | Experiment Instructions | Already coded; user adjusts the framing text |

---

## Routing Notes

### Overlapping signals and tiebreakers

**Data Prep vs. Model Trainer — sequence length:** `MAX_SEQ_LEN` is defined in `prepare.py` and consumed by `train.py`. If a user says "I want a shorter context window", route to **Data Prep** first (the constant lives there), but flag that `DEVICE_BATCH_SIZE` in Model Trainer may need compensating adjustment.

**Data Prep vs. Model Trainer — vocabulary size:** `VOCAB_SIZE` is set in `prepare.py` during tokenizer training. If a user asks about changing it, route to **Data Prep** because a re-run of `prepare.py` is required to retrain the tokenizer. The model embedding table size is a downstream consequence.

**Model Trainer vs. Experiment Instructions — experiment scope:** "What should the agent try next?" is always **Experiment Instructions**. "How should the code change for this specific idea?" is always **Model Trainer**. When a user blends both (e.g., "make the agent try wider models"), route to **Experiment Instructions** since that shapes strategy; the agent handles the code.

### Fallback logic

If a user phrase cannot be unambiguously mapped after checking both the table above and the overlap rules, apply this order:
1. Does it involve files, data, or environment setup? → **Data Prep**
2. Does it involve a specific numeric parameter, architecture, or code change? → **Model Trainer**
3. Does it involve agent behavior, research strategy, or what the agent is allowed/forbidden to do? → **Experiment Instructions**
4. If still ambiguous: present the user with a clarifying question asking whether they want to change *how the model trains* (Model Trainer) or *how the agent decides what to try* (Experiment Instructions).

### Fixed vs. editable boundary

`prepare.py` is intentionally read-only in the default autoresearch workflow. Routing signals that map to Data Prep should be accompanied by a note that these constants require either forking the repo or understanding that the evaluation harness (`evaluate_bpb`) must remain unchanged for results to be comparable across experiments.
