# Question Stubs — Static Decision Tree

## Home Screen Copy

**Headline:** What do you want to change about your AI research run?
**Sub-prompt:** Tell us what you're trying to do and we'll point you to the right place.
**Textarea placeholder:** e.g. "I want to download more training data" or "the model keeps crashing"
**CTA button:** Find my answer

---

## Path: Data Preparation (`prepare.py`)

Questions that route users to the data prep component. Each option includes "I'm not sure" as a fallback to the shared fallback path.

### Q-P1: What brings you to the data prep step?
- Option A: I want to download more data shards → Q-P2
- Option B: I need to change where data is stored on disk → terminal (prepare/cache)
- Option C: I want to adjust the tokenizer or vocabulary size → Q-P3
- Option D: I'm not sure → fallback path

*Routing: Any A/B/C response locks to `prepare.py`. Signal covered: "download more training data", "set up cache folder", "vocabulary size".*

### Q-P2: How much data do you want to use?
- Option A: I want more shards than the default 10 → terminal (prepare/shards-up)
- Option B: I have a small GPU and need to use fewer shards → terminal (prepare/shards-down)
- Option C: I want to change how long each training sequence is → terminal (prepare/seq-len)
- Option D: I'm not sure → fallback path

*Routing: B also surfaces `MAX_SEQ_LEN` tiebreaker — note to user that sequence length lives in `prepare.py`, not `train.py`. Signal covered: "small GPU reduce data size", "download all shards", "context window".*

### Q-P3: What do you want to change about the tokenizer?
- Option A: I want a larger or smaller vocabulary → terminal (prepare/vocab)
- Option B: I want more tokens used to score the model → terminal (prepare/eval-tokens)
- Option C: The tokenizer hasn't been trained yet and I need to run setup → terminal (prepare/first-run)
- Option D: I'm not sure → fallback path

*Routing: A routes primarily to `prepare.py` (VOCAB_SIZE lives here); flag that embedding table size in `train.py` is a downstream effect. Signal covered: "vocabulary size", "validation score not fair / more eval tokens", "tokenizer not trained yet".*

### Q-P4: Do you want to change how long each experiment run can go?
- Option A: Yes, I want to set a hard time limit → terminal (prepare/time-budget)
- Option B: No, I just want to check my current settings → terminal (prepare/review)
- Option C: I'm not sure → fallback path

*Routing: TIME_BUDGET lives in `prepare.py`. Signal covered: "time budget / wall-clock cap".*

---

## Path: Model Trainer (`train.py`)

Questions that route users to the model training configuration.

### Q-T1: What are you trying to change about the model?
- Option A: I want the model to be bigger or smaller → Q-T2
- Option B: The model is crashing with an out-of-memory error → terminal (train/oom)
- Option C: I want to change the learning rate or optimizer → Q-T3
- Option D: I want to change the model's internal structure → Q-T4
- Option E: I'm not sure → fallback path

*Routing: All options map to `train.py`. Signal covered: "make the model bigger", "OOM", "learning rate", "optimizer", "model architecture".*

### Q-T2: How do you want to resize the model?
- Option A: Add or remove transformer layers → terminal (train/depth)
- Option B: Make each layer wider or narrower → terminal (train/aspect-ratio)
- Option C: Change the attention head size → terminal (train/head-dim)
- Option D: I'm not sure → fallback path

*Routing: DEPTH, ASPECT_RATIO, HEAD_DIM all in `train.py`. Signal covered: "add more transformer layers", "make model bigger".*

### Q-T3: What do you want to change about learning?
- Option A: The main learning rates (embedding, matrix, output) → terminal (train/lr)
- Option B: How training starts and ends — warmup and cooldown → terminal (train/lr-schedule)
- Option C: The optimizer algorithm itself → terminal (train/optimizer)
- Option D: Batch size or how many tokens per step → terminal (train/batch)
- Option E: I'm not sure → fallback path

*Routing: WARMUP_RATIO, WARMDOWN_RATIO, FINAL_LR_FRAC, MATRIX_LR, EMBEDDING_LR, UNEMBEDDING_LR, SCALAR_LR, TOTAL_BATCH_SIZE, DEVICE_BATCH_SIZE all `train.py`. Signal covered: "learning rate", "tune optimizer", "batch size", "training convergence / warmup / warmdown".*

### Q-T4: What part of the model structure do you want to change?
- Option A: The attention window pattern (how far each layer can see) → terminal (train/window)
- Option B: The activation function inside each block → terminal (train/activation)
- Option C: The full architecture — I want to redesign it → terminal (train/architecture)
- Option D: I'm not sure → fallback path

*Routing: WINDOW_PATTERN, activation function, full GPT/Block/MLP classes all in `train.py`. Signal covered: "attention window size", "activation function", "model architecture".*

---

## Path: Experiment Instructions (`program.md`)

Questions that route users to the research strategy layer.

### Q-E1: What do you want to change about how the agent works?
- Option A: I want to limit what the agent is allowed to try → Q-E2
- Option B: I want to change what counts as a good result → terminal (program/objective)
- Option C: I want the agent to stop after a set number of runs → terminal (program/stop-condition)
- Option D: I want to change how results are logged → terminal (program/logging)
- Option E: I'm not sure → fallback path

*Routing: All map to `program.md`. Signal covered: "control what agent can modify", "good result definition", "stop after N experiments", "logging format".*

### Q-E2: How do you want to limit the agent?
- Option A: Block certain types of changes (e.g. no architecture edits) → terminal (program/scope-restrict)
- Option B: Point the agent at specific papers or code to read → terminal (program/context-files)
- Option C: Tell the agent to prefer simple solutions over small gains → terminal (program/simplicity)
- Option D: I'm not sure → fallback path

*Routing: "in-scope file list", "agent CAN/CANNOT modify", simplicity criterion all in `program.md`. Signal covered: "focus on specific experiment type", "agent read reference papers", "prefer simpler solutions".*

### Q-E3: Do you want to change how the agent handles problems?
- Option A: The agent keeps trying things that crash and I want to guide it → terminal (program/crash-policy)
- Option B: I want to add more agents to run experiments at the same time → terminal (program/multi-agent)
- Option C: I want to set up a fresh experiment run from scratch → terminal (program/new-run)
- Option D: I'm not sure → fallback path

*Routing: crash handling policy, loop continuation, agent identity/framing all in `program.md`. Signal covered: "agent keeps crashing", "add more agents", "new experiment run from scratch".*

---

## Path: "I'm not sure" (all components)

Used when a user selects "I'm not sure" on any branching question, or types something that doesn't clearly map to one component.

### Q-F1: Which of these sounds closest to your goal?
- Option A: I need to set up the data before training can start → routes to Q-P1
- Option B: I want to change how the model itself trains or is built → routes to Q-T1
- Option C: I want to change what the AI agent does or decides → routes to Q-E1
- Option D: I need a full walkthrough — I'm new to this → terminal (all/onboarding)

*Routing: D → all three components, in order: prepare → train → program. Mirrors Use Case 4 in testing-plan.md.*

### Q-F2 (shown if Q-F1 is still unclear): Does your question involve…
- Option A: Files, folders, or downloading data → routes to Q-P1 (fallback rule 1: files/data/environment → Data Prep)
- Option B: A specific number, setting, or piece of code → routes to Q-T1 (fallback rule 2: numeric parameter/architecture/code → Model Trainer)
- Option C: What the agent is allowed to do or try → routes to Q-E1 (fallback rule 3: agent behavior/strategy → Experiment Instructions)
- Option D: I still don't know → terminal (all/onboarding)

*Routing: Directly implements the 4-step fallback logic from taxonomy.md routing notes.*

---

## Confirmation Screen Copy (7 combinations)

### prepare
- **Title:** Data Preparation
- **Description:** You're changing how data is downloaded and prepared before training starts. This is a one-time setup step. Most of these settings are fixed by default — changes here may require re-running `prepare.py`.
- **CTA:** Yes, this fits / Start over

### train
- **Title:** Model Trainer
- **Description:** You're changing how the model is built or how it learns. These settings live in `train.py` and are the only ones the AI agent edits during experiments.
- **CTA:** Yes, this fits / Start over

### program
- **Title:** Experiment Instructions
- **Description:** You're changing how the AI agent decides what to try. This is your control panel for research strategy — edit `program.md` to shape the agent's behavior without touching any Python.
- **CTA:** Yes, this fits / Start over

### prepare+train
- **Title:** Data Preparation + Model Trainer
- **Description:** Your question touches both how data is set up and how the model trains. We'll cover the data side first, then the model settings that may need to match.
- **CTA:** Yes, this fits / Start over

### prepare+program
- **Title:** Data Preparation + Experiment Instructions
- **Description:** You're setting up data and also shaping how the agent runs experiments. Start with the data step, then update the experiment instructions to match your goals.
- **CTA:** Yes, this fits / Start over

### train+program
- **Title:** Model Trainer + Experiment Instructions
- **Description:** You're making a direct change to the model and also want the agent to explore that direction on its own. We'll cover the manual code change first, then how to tell the agent to keep experimenting there.
- **CTA:** Yes, this fits / Start over

### all
- **Title:** Full System Setup
- **Description:** We'll walk you through all three parts in order: first get your data ready, then review the model defaults, then set up the experiment instructions so the agent knows what to do.
- **CTA:** Yes, this fits / Start over

---

## Routing Logic Notes

**Sequence length tiebreaker (prepare vs. train):** `MAX_SEQ_LEN` is defined in `prepare.py`. If a user asks about "context window" or "shorter sequences", route to Data Prep first. Flag that `DEVICE_BATCH_SIZE` in `train.py` may need a compensating reduction. Q-P2 Option C surfaces this.

**Vocabulary size tiebreaker (prepare vs. train):** `VOCAB_SIZE` is set in `prepare.py` during tokenizer training. Route to Data Prep because re-running `prepare.py` is required. The model embedding table size is a downstream effect. Q-P3 Option A surfaces this.

**Agent strategy vs. direct code change (train vs. program):** "What should the agent try next?" → always Experiment Instructions. "What specific setting should I change right now?" → always Model Trainer. Q-E1 and Q-T1 are designed so users self-select the correct split. If a user phrase blends both (e.g., "make the agent try wider models"), route to Experiment Instructions — the agent handles the code side.

**OOM errors:** Primary fix is `DEVICE_BATCH_SIZE` reduction in `train.py`. Secondary fix is `DEPTH` reduction. Do not route to `prepare.py` for a training-time OOM. Q-T1 Option B goes directly to the OOM terminal.

**Fallback trigger:** Q-F1 and Q-F2 are shown when: (a) user selects "I'm not sure" three or more times, (b) free-text input cannot be mapped to a component after checking routing signals and overlap rules, or (c) user selects "I'm not sure" on Q-F1 itself.

**Fixed vs. editable boundary:** Any terminal in the Data Prep path should note that `prepare.py` is marked read-only in the default workflow. Changes require forking the repo or accepting that evaluation comparisons may no longer be valid if the evaluation harness constants (`TIME_BUDGET`, `EVAL_TOKENS`, `VOCAB_SIZE`) change.

**"I'm not sure" requirement:** Every branching question (Q-P1 through Q-E3, Q-F1, Q-F2) includes "I'm not sure" as an explicit option. Selecting it either moves to the next fallback question or routes to the onboarding terminal if fallback questions are exhausted.
