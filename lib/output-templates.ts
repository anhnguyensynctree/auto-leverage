export interface OutputTemplate {
  component_names: string[];
  guide_steps: string[];
  llm_prompt: string;
}

const PREPARE_PROMPT = `**Goal:** I want to improve the quality or size of the data my language model trains on. Specifically, I want to [describe what you want — e.g., "use more diverse training text", "reduce the amount of data to fit smaller hardware", "change how many words the model sees at once"].

**Constraints:**
- The scoring system used to judge model quality must not change — it is fixed and cannot be touched.
- The vocabulary size I use right now is [your current value, e.g. 8192 words]. Any change here requires retraining the word-recognition system from scratch.
- I am working with [describe your hardware limit, e.g. "a GPU with 8GB of memory" or "no hardware limit"].
- I need results that can be fairly compared to my previous experiments — so the scoring method must stay the same.

**Strategy:** [Choose one or describe your own]
- Download more text samples so the model trains on a broader range of content — I currently use [number] data batches and want to try [higher number].
- Reduce the length of each training example so the model fits on smaller hardware — I want to try sequences of [number] words instead of the current [number].
- Use a larger or smaller vocabulary so the model recognizes [more rare words / fewer words for simplicity].

**Success Signal:** After the change, the model's quality score (called val_bpb) should be [lower than before / similar to before but training fits on my hardware]. A lower val_bpb means the model predicts text more accurately. I'll consider this a success if val_bpb drops by at least [your threshold, e.g. "0.005"] compared to my last run, or if training now fits within my hardware limit without crashing.`;

const TRAIN_PROMPT = `**Goal:** I want to improve how my language model learns. My current quality score (val_bpb) is [your current score, e.g. 0.997] and I want to push it lower. I am specifically interested in trying [describe your idea — e.g., "making the model wider", "adjusting the learning speed", "using a different internal structure", "reducing memory use so it fits on my GPU"].

**Constraints:**
- Each training run has a fixed time limit of 5 minutes — no experiment can run longer than that.
- I cannot add new software packages — only what is already available can be used.
- The scoring function is fixed and cannot be changed — only the model itself can change.
- My GPU has [X] GB of memory. Memory use can increase a little for meaningful gains, but cannot grow dramatically.
- Changes that crash or run out of memory count as failures.

**Strategy:** [Describe what you want to try — examples below]
- Make the model larger by increasing the number of processing layers from [current number] to [target number], to see if more depth improves accuracy.
- Slow down or speed up learning by changing the learning rate from [current value] to [target value], since my model seems to be [converging too fast / learning too slowly].
- Try a different attention pattern — right now the model looks at [current pattern] of past context per layer; I want to test whether [full / half] context on more layers helps.
- Simplify the model by removing [specific component] to see if equal quality is achievable with less complexity.

**Success Signal:** The experiment is a success if val_bpb is lower than [your current best score]. If the new score is equal but the change removes code or reduces complexity, that also counts as a win. The run must complete within the time limit without crashing. I'll discard any change that adds complexity without improving the score by at least [your threshold, e.g. "0.002"].`;

const PROGRAM_PROMPT = `**Goal:** I want to steer how my autonomous research agent decides what experiments to run. Right now the agent [describe current behavior — e.g., "keeps trying variations I've already tested", "pursues overly complex changes", "doesn't focus on the area I care about"]. I want to change the agent's research strategy so it [describe desired behavior — e.g., "focuses on model size experiments", "prefers simpler solutions", "stops after a set number of runs", "explores a specific area like attention patterns"].

**Constraints:**
- The agent may only change the model training file — it must not touch the data preparation file or the scoring system.
- Results must stay comparable across experiments — the scoring method is fixed.
- The agent should not ask me for permission to continue between experiments; it should run autonomously.
- Any change to what the agent is allowed or forbidden to do must be explicit — vague guidance leads to unpredictable behavior.
- I [do / do not] want the agent to stop automatically. If yes: stop after [number] experiments or when the score reaches [target value].

**Strategy:** [Describe how you want the agent to behave — examples below]
- Focus the agent on a specific area: tell it to spend the next [number] experiments only trying [type of change, e.g. "changes to model depth and width"] before broadening.
- Raise the simplicity bar: tell the agent that a change must improve the score by at least [threshold] to be worth keeping if it adds any complexity. Changes that remove code and hold quality steady should always be kept.
- Expand the agent's reference material: instruct it to read [specific reference — e.g., "the notes in results.tsv from my last run"] before proposing new ideas.
- Add a stopping rule: the agent should stop and summarize findings once it has run [number] experiments or achieved a val_bpb of [target].

**Success Signal:** After updating the instructions, the agent's next [number] experiments should reflect the new focus — I should see it trying [type of experiments you expect]. Over a full session of [number] runs, the best val_bpb achieved should be [lower than / comparable to] the previous session. If the agent was previously getting stuck or repeating itself, I should see more variety in the experiment descriptions logged in the results file.`;

export const OUTPUT_TEMPLATES: Record<string, OutputTemplate> = {
  prepare: {
    component_names: ["Data Preparation"],
    guide_steps: [
      "1. Open the prompt below and fill in the bracketed placeholders with your actual values — your GPU size, current number of data shards, and vocabulary size.",
      "2. Paste the filled-in prompt into Claude or ChatGPT and describe what you want to change about your training data.",
      "3. Follow the suggestions you receive to update the settings in prepare.py, then re-run the script to rebuild your dataset.",
      "4. After the script finishes, start a new training run and check whether the quality score (val_bpb) improved.",
    ],
    llm_prompt: PREPARE_PROMPT,
  },

  train: {
    component_names: ["Model Trainer"],
    guide_steps: [
      "1. Note your current quality score (val_bpb) from your most recent training run — you will need this number.",
      "2. Fill in the bracketed placeholders in the prompt below with your score, GPU memory, and the specific change you want to try.",
      "3. Paste the filled-in prompt into Claude or ChatGPT and work through the suggestions to update train.py.",
      "4. Run one experiment and compare the new val_bpb to your previous best — if it is lower, keep the change.",
    ],
    llm_prompt: TRAIN_PROMPT,
  },

  program: {
    component_names: ["Experiment Instructions"],
    guide_steps: [
      "1. Decide what you want the agent to do differently — for example, focus on a specific type of change, stop after a set number of runs, or prefer simpler solutions.",
      "2. Fill in the bracketed placeholders in the prompt below with your goals and any limits you want to set.",
      "3. Paste the filled-in prompt into Claude or ChatGPT and use the output to update your program.md file.",
      "4. Start the agent and watch the first few experiment descriptions in the results file to confirm it is following the new strategy.",
    ],
    llm_prompt: PROGRAM_PROMPT,
  },

  "prepare+train": {
    component_names: ["Data Preparation", "Model Trainer"],
    guide_steps: [
      "1. Start with Data Preparation: fill in the first prompt with your hardware limits and data goals, then update prepare.py and rebuild your dataset.",
      "2. Once the dataset is ready, move to Model Trainer: fill in the second prompt with your current val_bpb score and the model changes you want to try.",
      "3. Paste each filled-in prompt into Claude or ChatGPT separately — one for data, one for the model — and apply the suggestions to the matching file.",
      "4. Run a training experiment after both files are updated and check whether val_bpb improved.",
      "5. If only one change helped, roll back the other — keeping changes separate makes it easier to know what worked.",
    ],
    llm_prompt: `## Data Preparation

${PREPARE_PROMPT}

---

## Model Trainer

${TRAIN_PROMPT}`,
  },

  "prepare+program": {
    component_names: ["Data Preparation", "Experiment Instructions"],
    guide_steps: [
      "1. Start with Data Preparation: fill in the first prompt with your hardware limits and data goals, then update prepare.py and rebuild your dataset.",
      "2. Next, update the agent strategy: fill in the second prompt to describe how you want the agent to behave going forward.",
      "3. Paste each filled-in prompt into Claude or ChatGPT separately and apply the changes to prepare.py and program.md.",
      "4. Start the agent on the new dataset and watch the first few experiment results to confirm both changes are taking effect.",
    ],
    llm_prompt: `## Data Preparation

${PREPARE_PROMPT}

---

## Experiment Instructions

${PROGRAM_PROMPT}`,
  },

  "program+train": {
    component_names: ["Model Trainer", "Experiment Instructions"],
    guide_steps: [
      "1. Start with Experiment Instructions: fill in the second prompt to define what the agent is allowed to try and what counts as a good result.",
      "2. Then set up the Model Trainer baseline: fill in the first prompt with your current val_bpb and any manual changes you want to make before handing off to the agent.",
      "3. Paste each filled-in prompt into Claude or ChatGPT separately and apply the changes to train.py and program.md.",
      "4. Run the agent and check that experiment descriptions match the strategy you set — if not, refine program.md first before changing train.py.",
    ],
    llm_prompt: `## Model Trainer

${TRAIN_PROMPT}

---

## Experiment Instructions

${PROGRAM_PROMPT}`,
  },

  all: {
    component_names: [
      "Data Preparation",
      "Model Trainer",
      "Experiment Instructions",
    ],
    guide_steps: [
      "1. Run Data Preparation first: fill in the first prompt with your hardware limits and data goals, update prepare.py, and rebuild your dataset — this must finish before training can start.",
      "2. Set up the Model Trainer: fill in the second prompt with your current val_bpb and any manual model changes you want to make before the agent takes over.",
      "3. Configure Experiment Instructions last: fill in the third prompt to set the agent's strategy, stopping rules, and what counts as a win.",
      "4. Paste each filled-in prompt into Claude or ChatGPT separately, apply the suggestions to the matching file, then start the agent.",
      "5. Watch the first few experiment results to confirm all three components are working together — data loads correctly, the model trains without crashing, and the agent follows its instructions.",
    ],
    llm_prompt: `## Data Preparation

${PREPARE_PROMPT}

---

## Model Trainer

${TRAIN_PROMPT}

---

## Experiment Instructions

${PROGRAM_PROMPT}`,
  },
};

export function getTemplate(components: string[]): OutputTemplate | null {
  const key = [...components].sort().join("+");
  // "all" is an alias for the sorted three-component key
  if (key === "prepare+program+train") {
    return OUTPUT_TEMPLATES["all"];
  }
  return OUTPUT_TEMPLATES[key] ?? null;
}
