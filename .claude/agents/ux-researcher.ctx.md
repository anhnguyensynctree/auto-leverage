# UX Researcher Context — auto-leverage

## Role on This Project
Design and validate the questionnaire flow that routes non-technical users to the correct autoresearch component(s). Own the plain-language layer: question wording, confirmation copy, output presentation, and the entry free-text experience.

## Autoresearch Deep Knowledge (required for accurate routing)

### The 3 Components
1. **prepare.py** (Data & Evaluation Setup)
   - What it does: downloads training data (Shakespeare), trains a BPE tokenizer, defines the dataloader and evaluation function
   - Who needs this: users asking "how do I change what data the model trains on?" / "how do I measure if it's improving?" / "what does evaluation mean here?"
   - Plain name for users: "Data & Evaluation Setup"
   - Key signals in user language: "data", "training data", "how it measures", "accuracy", "results", "tokenizer"

2. **train.py** (Model & Training Configuration)
   - What it does: defines the full GPT model (attention, MLP, blocks), the optimizer (Muon for weights, AdamW for embeddings/biases), and the training loop
   - Who needs this: users asking "how do I make it train faster?" / "how do I change the model size?" / "what optimizer should I use?" / "can I adjust hyperparameters?"
   - Plain name for users: "Model & Training Configuration"
   - Key signals: "speed", "performance", "model", "training", "hyperparameters", "batch size", "memory", "GPU", "optimize the training"

3. **program.md** (Agent Instructions)
   - What it does: plain-text instructions the human writes to tell the agent what goal to pursue (e.g., "minimize val loss on Shakespeare, budget 1 hour")
   - Who needs this: users asking "how do I tell the AI what to do?" / "how do I change the goal?" / "can I give it different instructions?" / "I want to apply this to my use case, not Shakespeare"
   - Plain name for users: "Agent Instructions"
   - Key signals: "instructions", "goal", "tell it what to do", "use case", "my problem", "prompt", "customize"

### The Agent Loop (context for questionnaire design)
autoresearch runs a fixed autonomous loop:
1. Agent reads program.md (your instructions)
2. Agent edits train.py (the training code)
3. Runs a 5-minute training session on the GPU
4. Measures val_bpb — lower = smarter model (baseline ~0.9979)
5. If val_bpb improved: saves the change as a git commit. If not: discards.
6. Repeats — ~12 experiments/hour, ~100 overnight

prepare.py is never touched by the agent. The human's only ongoing job is improving program.md.

**Plain-language explanation to use in the product**: "You write simple instructions in a text file. An AI agent reads them, then runs experiments all night — changing the training code, testing the result, keeping what works, throwing away what doesn't. You wake up to real progress."

### What Users Wake Up To (essential for output guide copy)
After an overnight run, users find:
- **git log** — each commit is one successful experiment (the improvements the agent kept)
- **results.tsv** — spreadsheet of every experiment: val_bpb score, memory usage, kept or discarded
- **analysis.ipynb** — graphs showing val_bpb improvement over time (each dot = one experiment)
- **modified train.py** — the training code has been changed in ways that improve performance

**Expectation-setting for non-tech users (must appear in output guide):** Most experiments fail — only 10–20 out of ~100 overnight runs are keepers. This is completely normal. The agent discards failures automatically. Seeing lots of "discarded" entries in results.tsv is a sign the system is working, not broken.

### Business Factors Per Component (for use case testing plans)
Each component has a distinct business impact — this shapes what "success" looks like per use case:

| Component | Business factor | What success looks like |
|---|---|---|
| prepare.py | Data quality + evaluation reliability | User can measure model improvement accurately and consistently |
| train.py | Training speed + compute cost efficiency | More experiments per hour = faster research progress at lower cost |
| program.md | Research direction quality | Better instructions → agent explores higher-value directions → faster meaningful progress |

**The leverage insight**: Optimising program.md is the highest ROI action for most non-tech users. They don't need to touch train.py at all to make the agent dramatically more effective — better instructions is the business lever, not code changes.

## Questionnaire Design Principles for This Product

### Entry Point
Free-text: "Describe your problem in your own words" — open, non-intimidating.
Expansion prompts (shown if user pauses or submits < 10 words):
- "What are you trying to improve or automate?"
- "Is this about changing the data, changing how the model trains, or changing what you tell the AI to do?"
- "What outcome do you want — faster training, a different goal, or a different dataset?"

### Routing Signals
Questions should extract: (1) is the user's goal about data/evaluation, model behaviour, or agent instructions? (2) how technical are they (filters jargon level of output)? (3) what's their primary constraint — time, quality, or flexibility?

### Minimum Question Count
3 questions is the floor for confident routing. 7 is the ceiling before abandonment risk rises for non-tech users.

### Confirmation Screen Copy
Don't say "prepare.py", "train.py", "program.md" on the confirmation screen — use the plain names until the user is in the output guide.
Show: "Based on what you told us, here's what applies to your situation:" followed by the 3-part breakdown with one sentence each.

## Known User Failure Modes
- User describes outcome ("I want it to be faster") without identifying which layer causes slowness → questionnaire must probe: "Is it the training loop, the data loading, or both?"
- User doesn't know autoresearch exists as a loop concept → brief one-line context before first question: "Autoresearch works in 3 layers. We'll figure out which one(s) matter for you."
- User submits "I don't know" → always provide an "I'm not sure" branch that routes to all 3 components with a general guide
