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
    router.push(`/output?${navParams.toString()}`);
  }

  function handleStartOver() {
    router.push("/");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f9f9ff] selection:bg-[#dbe1ff]">
      <header className="fixed top-0 w-full flex justify-start items-center px-8 py-6 bg-transparent">
        <span className="text-[12px] font-medium text-slate-400 uppercase tracking-wider">
          auto-leverage
        </span>
      </header>

      <main className="w-full max-w-[560px] px-6 py-20 flex flex-col items-center">
        <div className="mb-10 w-24 h-24 rounded-full bg-[#6bff8f] flex items-center justify-center">
          <span className="text-4xl text-[#006229]">✓</span>
        </div>

        <h1 className="text-xl font-semibold text-slate-900 text-center mb-8">
          Here&apos;s where we&apos;ll start
        </h1>

        <div className="w-full bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-8 mb-10 transition-all duration-300 hover:shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[#006229] text-xl">⚙</span>
            <h2 className="text-[18px] font-semibold text-slate-900">
              {title}
            </h2>
          </div>
          <p className="text-[14px] leading-relaxed text-slate-600">
            {isSingle && displayComponents[0]
              ? displayComponents[0].description
              : (multiDescription ??
                displayComponents.map((c) => c.description).join(" "))}
          </p>
        </div>

        <div className="w-full flex flex-col gap-3">
          <button
            onClick={handleConfirm}
            className="w-full h-[48px] rounded-lg bg-primary hover:bg-primary-container text-white font-medium transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
          >
            Yes, this fits
            <span className="text-sm">→</span>
          </button>
          <button
            onClick={handleStartOver}
            className="w-full py-2 text-[14px] text-slate-500 hover:text-slate-700 transition-colors text-center font-medium"
          >
            Start over
          </button>
        </div>
      </main>

      <footer className="fixed bottom-0 w-full mb-12 flex justify-center items-center px-4 text-center bg-transparent">
        <p className="font-sans text-[12px] text-slate-400 leading-relaxed">
          You can always go back and change your answers.
        </p>
      </footer>

      <div className="fixed top-0 left-0 -z-10 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#e7eeff] rounded-full blur-[120px] opacity-40" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-[#dbe1ff] rounded-full blur-[100px] opacity-20" />
      </div>
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
