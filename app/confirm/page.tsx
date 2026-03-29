"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface Turn {
  q: string;
  a: string;
}

interface ComponentCard {
  key: string;
  title: string;
  description: string;
}

const COMPONENT_TITLES: Record<string, string> = {
  prepare: "Data Preparation",
  train: "Model Trainer",
  program: "Experiment Instructions",
};

const COMPONENT_ICONS: Record<string, string> = {
  prepare: "database",
  train: "model_training",
  program: "lab_profile",
};

const COMPONENT_BASE_DESCRIPTIONS: Record<string, string> = {
  prepare:
    "You're changing how data is downloaded and prepared before training starts. Most of these settings are fixed by default — changes here may require re-running prepare.py.",
  train:
    "You're changing how the model is built or how it learns. These settings live in train.py and are the only ones the AI agent edits during experiments.",
  program:
    "You're changing how the AI agent decides what to try. This is your control panel for research strategy — edit program.md to shape the agent's behavior without touching any Python.",
};

const COMPONENT_USECASE_DESCRIPTIONS: Record<
  string,
  (useCase: string) => string
> = {
  prepare: (useCase) =>
    useCase
      ? `For "${useCase}", this covers how your training data is sourced and shaped before the model ever sees it.`
      : COMPONENT_BASE_DESCRIPTIONS.prepare,
  train: (useCase) =>
    useCase
      ? `For "${useCase}", this is where the model architecture and learning behaviour are configured.`
      : COMPONENT_BASE_DESCRIPTIONS.train,
  program: (useCase) =>
    useCase
      ? `For "${useCase}", this tells the AI agent what experiments to run and what direction to explore.`
      : COMPONENT_BASE_DESCRIPTIONS.program,
};

const MULTI_DESCRIPTIONS: Record<string, string> = {
  "prepare+train":
    "Your question touches both how data is set up and how the model trains. We'll cover the data side first, then the model settings that may need to match.",
  "prepare+program":
    "You're setting up data and also shaping how the agent runs experiments. Start with the data step, then update the experiment instructions to match your goals.",
  "train+program":
    "You're making a direct change to the model and also want the agent to explore that direction on its own. We'll cover the manual code change first, then how to tell the agent to keep experimenting there.",
  "prepare+program+train":
    "We'll walk you through all three parts in order: first get your data ready, then review the model defaults, then set up the experiment instructions so the agent knows what to do.",
};

function readTurnsFromStorage(): Turn[] {
  try {
    const raw = sessionStorage.getItem("al_turns");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t): t is Turn =>
        typeof t === "object" &&
        t !== null &&
        typeof t.q === "string" &&
        typeof t.a === "string",
    );
  } catch {
    return [];
  }
}

function ConfirmContent() {
  const params = useSearchParams();
  const router = useRouter();

  const rawComponents = params.get("components") ?? "";
  const confidence = params.get("confidence") ?? "";
  const useCase = params.get("useCase") ?? "";
  const components = rawComponents.split(",").filter(Boolean);

  const [turns, setTurns] = useState<Turn[]>([]);

  useEffect(() => {
    setTurns(readTurnsFromStorage());
  }, []);

  if (components.length === 0) {
    router.replace("/");
    return null;
  }

  const sortedKey = [...components].sort().join("+");
  const multiDescription = MULTI_DESCRIPTIONS[sortedKey];
  const isSingle = components.length === 1;

  const componentCards: ComponentCard[] = components
    .filter((c) => COMPONENT_TITLES[c])
    .map((c) => ({
      key: c,
      title: COMPONENT_TITLES[c],
      description: useCase
        ? (COMPONENT_USECASE_DESCRIPTIONS[c]?.(useCase) ??
          COMPONENT_BASE_DESCRIPTIONS[c])
        : COMPONENT_BASE_DESCRIPTIONS[c],
    }));

  function handleConfirm() {
    const navParams = new URLSearchParams({
      components: rawComponents,
      confidence,
    });
    if (useCase) navParams.set("useCase", useCase);
    router.push(`/output?${navParams.toString()}`);
  }

  function handleStartOver() {
    router.replace("/");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <header className="fixed top-0 w-full flex justify-start items-center px-8 py-6">
        <span className="text-[11px] font-semibold text-secondary uppercase tracking-widest">
          auto-leverage
        </span>
      </header>

      <main className="w-full max-w-[520px] px-6 py-20 flex flex-col items-center">
        {/* Check mark */}
        <div className="mb-10 w-20 h-20 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shadow-glow-sm">
          <span className="material-symbols-outlined text-3xl text-primary">
            check_circle
          </span>
        </div>

        <h1 className="text-xl font-bold text-on-surface text-center mb-8 tracking-tight">
          Here&apos;s where we&apos;ll start
        </h1>

        {useCase && (
          <div className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-5 py-4 mb-5">
            <p className="text-[11px] text-secondary uppercase tracking-widest font-semibold mb-1">
              What we understood
            </p>
            <p className="text-[14px] text-on-surface leading-relaxed">
              {useCase}
            </p>
          </div>
        )}

        {/* What we asked — conversation turns */}
        {turns.length > 0 && (
          <div className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-5 py-4 mb-5">
            <p className="text-[11px] text-secondary uppercase tracking-widest font-semibold mb-3">
              What we asked
            </p>
            <ol className="space-y-3">
              {turns.map((turn, i) => (
                <li key={i} className="flex flex-col gap-0.5">
                  <span className="text-[12px] text-on-surface-variant leading-snug">
                    {turn.q}
                  </span>
                  <span className="text-[13px] text-on-surface font-medium leading-snug">
                    {turn.a}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* What we identified — component cards */}
        <div className="w-full mb-5">
          <p className="text-[11px] text-secondary uppercase tracking-widest font-semibold mb-3">
            What we identified
          </p>
          {isSingle && componentCards[0] ? (
            <div className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-5 hover:border-primary/30 transition-colors duration-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px] text-primary">
                    {COMPONENT_ICONS[componentCards[0].key] ?? "settings"}
                  </span>
                </div>
                <h2 className="text-[15px] font-bold text-on-surface">
                  {componentCards[0].title}
                </h2>
              </div>
              <p className="text-[13px] leading-relaxed text-on-surface-variant">
                {componentCards[0].description}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {componentCards.length > 1 && multiDescription && (
                <p className="text-[13px] text-on-surface-variant leading-relaxed mb-1">
                  {multiDescription}
                </p>
              )}
              {componentCards.map((card) => (
                <div
                  key={card.key}
                  className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-5 hover:border-primary/30 transition-colors duration-300"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[16px] text-primary">
                        {COMPONENT_ICONS[card.key] ?? "settings"}
                      </span>
                    </div>
                    <h2 className="text-[15px] font-bold text-on-surface">
                      {card.title}
                    </h2>
                  </div>
                  <p className="text-[13px] leading-relaxed text-on-surface-variant">
                    {card.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="w-full flex flex-col gap-3 mt-3">
          <button
            onClick={handleConfirm}
            className="w-full h-12 rounded-xl bg-primary hover:bg-on-primary-fixed-variant text-white font-semibold text-sm transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 shadow-glow"
          >
            Yes, this fits
            <span className="material-symbols-outlined text-[18px]">
              arrow_forward
            </span>
          </button>
          <button
            onClick={handleStartOver}
            className="w-full py-2 text-[13px] text-secondary hover:text-on-surface transition-colors text-center font-medium"
          >
            Start over
          </button>
        </div>
      </main>

      <footer className="fixed bottom-0 w-full mb-10 flex justify-center items-center px-4 text-center">
        <p className="text-[11px] text-secondary/60 leading-relaxed">
          You can always go back and change your answers.
        </p>
      </footer>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense>
      <ConfirmContent />
    </Suspense>
  );
}
