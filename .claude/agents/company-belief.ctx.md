# Company Belief — auto-leverage

## What We Are Building
An advisory web platform that helps non-technical users understand and apply Karpathy's autoresearch framework to their specific problem — producing a step-by-step guide and a high-quality LLM prompt they can run themselves.

## Who It Is For
Non-technical founders, product managers, domain experts, and curious builders who want to use autoresearch to improve a workflow, script, or product — but lack the ML/engineering background to navigate the framework on their own.

## Our Operating Belief
The barrier to autoresearch is comprehension, not capability. Non-technical users can unlock its full value once they understand which of the 3 core components (prepare.py, train.py, program.md) applies to their situation and what that component allows them to change. Our job is to surface that clarity through structured questions and plain-language output.

## The 3 Autoresearch Components We Map Users To
1. **prepare.py** — fixed constants, one-time data prep (downloads training data, trains a BPE tokenizer), and runtime utilities (dataloader, evaluation). Not modified. Users who need to understand the data/tokenization layer.
2. **train.py** — the single file the agent edits. Contains the full GPT model, optimizer (Muon + AdamW), and training loop. Architecture, hyperparameters, optimizer, batch size — all fair game. Users who want to iterate on model behaviour.
3. **program.md** — baseline instructions for one agent. The human edits this. Users who want to change what the agent is told to do — the "prompt layer" of the system.

## Strategic Constraints
- Advisory only — we explain, we do not execute autoresearch on behalf of users
- No user accounts, no session history — ephemeral by default
- Export at the end: step-by-step guide + copy-paste LLM prompt
- Cost-aware: static branching questionnaire as primary path; LLM-driven fallback for edge cases; link back to static when possible
- Plain language throughout — every label, question, and output readable at a Grade 8 level

## Out of Scope
- Running autoresearch jobs server-side on behalf of users
- User authentication and session persistence
- Model training or fine-tuning infrastructure
- General-purpose LLM chat interface (this is a structured advisory tool, not a chatbot)
