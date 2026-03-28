"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface ComponentInfo {
  title: string;
  description: string;
}

const COMPONENT_INFO: Record<string, ComponentInfo> = {
  prepare: {
    title: "Data Preparation",
    description:
      "You're changing how data is downloaded and prepared before training starts. Most of these settings are fixed by default — changes here may require re-running prepare.py.",
  },
  train: {
    title: "Model Trainer",
    description:
      "You're changing how the model is built or how it learns. These settings live in train.py and are the only ones the AI agent edits during experiments.",
  },
  program: {
    title: "Experiment Instructions",
    description:
      "You're changing how the AI agent decides what to try. This is your control panel for research strategy — edit program.md to shape the agent's behavior without touching any Python.",
  },
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

function ConfirmContent() {
  const params = useSearchParams();
  const router = useRouter();

  const rawComponents = params.get("components") ?? "";
  const confidence = params.get("confidence") ?? "";
  const useCase = params.get("useCase") ?? "";
  const components = rawComponents.split(",").filter(Boolean);

  if (components.length === 0) {
    router.replace("/");
    return null;
  }

  const sortedKey = [...components].sort().join("+");
  const multiDescription = MULTI_DESCRIPTIONS[sortedKey];
  const isSingle = components.length === 1;

  const displayComponents = components
    .map((c) => COMPONENT_INFO[c])
    .filter(Boolean);

  const title = isSingle
    ? (displayComponents[0]?.title ?? "Your Setup")
    : displayComponents.map((c) => c.title).join(" + ");

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

        <div className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-7 mb-8 hover:border-primary/30 transition-colors duration-300">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px] text-primary">
                settings
              </span>
            </div>
            <h2 className="text-[16px] font-bold text-on-surface">{title}</h2>
          </div>
          <p className="text-[13px] leading-relaxed text-on-surface-variant">
            {isSingle && displayComponents[0]
              ? displayComponents[0].description
              : (multiDescription ??
                displayComponents.map((c) => c.description).join(" "))}
          </p>
        </div>

        <div className="w-full flex flex-col gap-3">
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
