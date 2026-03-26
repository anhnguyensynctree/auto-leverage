# Testing Plan — /api/classify Use Cases

Manual integration test checklist for the `/api/classify` endpoint. Each use case maps to a real user description, the expected routing decision, and what a correct vs. broken response looks like.

---

## Use Case 1: Small GPU, Reduce Data Size

**User Type:** Hobbyist ML practitioner running autoresearch on a consumer GPU with limited VRAM and disk space.

**User's Description:** "I only have a small GPU and I'm worried about running out of memory and disk space. How do I reduce the amount of data it downloads and trains on?"

**Expected Component(s):** `prepare.py` (Data Prep)

**Business Outcome:** The user gets a step-by-step guide explaining how to pass `--num-shards` to limit downloads, adjust `CACHE_DIR` to control storage location, and understand that `MAX_SEQ_LEN` and `TIME_BUDGET` cap how much of the downloaded data is actually consumed during training. They leave knowing exactly which constants to change before running prepare.py.

**Success Criteria:**
- Guide references `--num-shards` CLI argument with an example (e.g., `--num-shards 3`)
- Guide references `CACHE_DIR` and explains where data lands on disk
- Guide mentions `MAX_SEQ_LEN` as the sequence length cap and notes it lives in `prepare.py`
- Guide notes that `prepare.py` is marked read-only in the default workflow and explains the fork-or-accept tradeoff
- Guide does NOT instruct the user to edit `train.py` or `program.md` for this problem

**Failure Modes:**
- Response routes to `train.py` (DEVICE_BATCH_SIZE reduction is valid but secondary — the primary fix is reducing shards and sequence length at the data layer)
- Guide omits `--num-shards` and only mentions GPU memory settings
- Guide tells the user to edit DEPTH or DEVICE_BATCH_SIZE without first addressing data volume
- Guide treats `MAX_SEQ_LEN` as a `train.py` variable rather than a `prepare.py` constant

---

## Use Case 2: Model Runs Out of GPU Memory During Training

**User Type:** Researcher who has already run prepare.py successfully and is launching their first training run, which crashes with an OOM error.

**User's Description:** "The model keeps crashing with an out of memory error during training. It gets a few steps in and then dies. How do I fix this?"

**Expected Component(s):** `train.py` (Model Trainer)

**Business Outcome:** The user gets a targeted guide explaining which variables in `train.py` to reduce to bring GPU memory usage down: `DEVICE_BATCH_SIZE` first, then `DEPTH` if the model itself is too large. They understand the performance trade-off of each change and can make an informed decision.

**Success Criteria:**
- Guide identifies `DEVICE_BATCH_SIZE` as the primary lever for OOM errors (reduce to 64, 32, etc.)
- Guide mentions `DEPTH` as a secondary lever if the model architecture itself exceeds VRAM
- Guide explains that `TOTAL_BATCH_SIZE` stays fixed while `DEVICE_BATCH_SIZE` shrinks (gradient accumulation handles the difference)
- Guide confirms these changes are made directly in `train.py`, not in `program.md` or `prepare.py`
- Guide does not suggest changing `--num-shards` or any data prep setting

**Failure Modes:**
- Response routes to `prepare.py` (data size is unrelated to a training-time OOM)
- Guide suggests only reducing `DEPTH` without mentioning `DEVICE_BATCH_SIZE` as the first, lower-cost fix
- Guide tells user to edit `program.md` to "tell the agent" to use a smaller model (the agent handles code changes, but the immediate fix is a direct edit to resolve the crash)
- Guide omits the gradient accumulation explanation, leaving the user confused about why TOTAL_BATCH_SIZE stays constant

---

## Use Case 3: Control What the Agent Is Allowed to Try

**User Type:** Research lead who wants to constrain the autonomous agent to a specific class of experiments — e.g., only optimizer changes — for a focused ablation study.

**User's Description:** "I want the agent to only experiment with the optimizer and learning rates. I don't want it touching the model architecture at all. How do I set those boundaries?"

**Expected Component(s):** `program.md` (Experiment Instructions)

**Business Outcome:** The user gets a guide explaining how to edit the "What agent CAN modify" and "What agent CANNOT modify" sections of `program.md` to scope the agent's behavior. They understand that `program.md` is the only place these research strategy boundaries are defined, and that the agent reads this file at the start of each experiment loop.

**Success Criteria:**
- Guide directs user to `program.md`, not `train.py` or `prepare.py`
- Guide explains the "in-scope file list" and "agent CAN/CANNOT modify" fields in `program.md`
- Guide provides a concrete example of how to restrict scope (e.g., add an explicit instruction forbidding architecture changes)
- Guide explains that the optimization objective ("lowest val_bpb") is also defined in `program.md` and can be rephrased to emphasize optimizer-only experiments
- Guide notes that the agent reads `program.md` fresh at each loop iteration, so changes take effect immediately on the next run

**Failure Modes:**
- Response routes to `train.py` (the user is asking about agent strategy, not about a specific code change)
- Guide tells user to add comments to `train.py` to prevent certain changes (comments do not constrain agent behavior)
- Guide conflates "what code to change" (train.py domain) with "what the agent is allowed to try" (program.md domain)
- Guide omits any mention of the crash handling policy or loop continuation rules, leaving the user without a full picture of what else they may want to tighten

---

## Use Case 4: Not Sure Where to Start — Full System Setup

**User Type:** First-time user who has cloned the repo and is trying to understand the full workflow before running anything.

**User's Description:** "I just got this set up and I'm not sure where to begin. What do I need to do first? What runs the experiments? What do I actually configure?"

**Expected Component(s):** All three — `prepare.py`, `train.py`, `program.md`

**Business Outcome:** The user gets a sequenced onboarding guide: (1) run `prepare.py` once to download data and train the tokenizer, (2) review `train.py` to understand the default model configuration and know what the agent will be modifying, (3) read and optionally edit `program.md` to understand and shape the agent's research strategy before starting the loop.

**Success Criteria:**
- Guide presents the three components in dependency order: prepare → train → program
- Guide explains that `prepare.py` is a one-time setup step and is not modified during experiments
- Guide explains that `train.py` is the only file the agent edits autonomously
- Guide explains that `program.md` is the human's control surface for steering the agent
- Guide includes a note that `prepare.py` constants (`TIME_BUDGET`, `EVAL_TOKENS`, `VOCAB_SIZE`) define the evaluation harness and must stay fixed for results to be comparable
- Guide does not assume any prior ML knowledge in its language

**Failure Modes:**
- Response routes to only one component (omits the full system overview the user needs)
- Guide presents the components in wrong order (e.g., program.md before prepare.py)
- Guide tells user to start by editing `train.py` directly before running `prepare.py`
- Guide uses unexplained jargon (val_bpb, OOM, BPE) without a brief definition on first use
- Guide does not explain the agent's autonomous loop, leaving the user unclear on what actually runs experiments

---

## Use Case 5: Change How Training Converges

**User Type:** ML practitioner who has seen the training curve and wants to adjust the learning rate schedule to improve final model quality.

**User's Description:** "The training loss drops fast at the start but then plateaus. I want to try a slower warmup and a longer cooldown to see if the final val score improves. How do I change the learning rate schedule?"

**Expected Component(s):** `train.py` (Model Trainer)

**Business Outcome:** The user gets a targeted guide identifying `WARMUP_RATIO` and `WARMDOWN_RATIO` as the two variables that control the LR schedule shape, and `FINAL_LR_FRAC` as the floor LR at the end of warmdown. They understand these are set in `train.py`, that the total budget is fixed by `TIME_BUDGET` in `prepare.py`, and that the ratios are fractions of that total budget.

**Success Criteria:**
- Guide identifies `WARMUP_RATIO`, `WARMDOWN_RATIO`, and `FINAL_LR_FRAC` by name
- Guide explains that ratios are fractions of `TIME_BUDGET` (e.g., `WARMDOWN_RATIO = 0.6` means 60% of the 300s budget)
- Guide notes that `TIME_BUDGET` is defined in `prepare.py` and is fixed in the default workflow
- Guide confirms changes are made in `train.py` directly
- Guide does not suggest editing `program.md` unless the user wants the agent to explore LR schedules autonomously (distinguishes "I want to set a specific schedule" from "I want the agent to search for the best schedule")

**Failure Modes:**
- Response routes to `program.md` (the user is specifying a concrete parameter change, not delegating to the agent)
- Guide conflates `WARMUP_RATIO` with `WARMDOWN_RATIO` or describes them incorrectly
- Guide omits `FINAL_LR_FRAC` despite it being directly relevant to the plateau behavior the user described
- Guide omits the connection to `TIME_BUDGET` in `prepare.py`, leaving the user unclear on what the ratios are relative to
- Guide suggests the user change the optimizer learning rates (`MATRIX_LR`, `EMBEDDING_LR`, etc.) instead of the schedule shape, which addresses a different problem
