"use client";

import type { QuestionNode } from "@/lib/questionnaire-schema";
import ProgressBar from "@/components/ProgressBar";

interface QuestionCardProps {
  node: QuestionNode;
  onAnswer: (answer: string) => void;
  onBack: () => void;
  current: number;
  total: number;
}

export default function QuestionCard({
  node,
  onAnswer,
  onBack,
  current,
  total,
}: QuestionCardProps) {
  const options = node.options ?? [];
  const regularOptions = options.filter((o) => o.label !== "I'm not sure");
  const notSureOption = options.find((o) => o.label === "I'm not sure");

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg shadow-[0_4px_40px_rgba(11,28,48,0.06)]">
        <div className="flex items-center justify-between px-6 py-4 max-w-[600px] mx-auto w-full">
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            The Lucid Researcher
          </span>
        </div>
        <div className="bg-slate-100 h-px w-full" />
      </header>

      <main className="max-w-[600px] mx-auto px-6 pt-12 pb-24 w-full flex-1">
        <nav className="flex flex-col gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-secondary text-sm font-medium hover:text-primary transition-colors group w-fit"
          >
            <span className="material-symbols-outlined text-lg group-hover:-translate-x-1 transition-transform">
              arrow_back
            </span>
            Back
          </button>
          <ProgressBar current={current} total={total} />
        </nav>

        <section className="mt-8">
          <h1 className="text-[22px] font-semibold text-on-background tracking-tight leading-tight">
            {node.question}
          </h1>
        </section>

        <div className="mt-8 flex flex-col gap-2">
          {regularOptions.map((option) => (
            <button
              key={option.label}
              onClick={() => onAnswer(option.label)}
              className="group flex items-center justify-between w-full p-4 bg-surface-container-lowest border border-outline-variant/40 rounded-xl text-left transition-all hover:bg-surface-container hover:border-primary active:scale-[0.99]"
            >
              <span className="text-on-surface-variant font-medium group-hover:text-primary">
                {option.label}
              </span>
              <span className="material-symbols-outlined opacity-0 group-hover:opacity-100 text-primary transition-opacity">
                chevron_right
              </span>
            </button>
          ))}

          {notSureOption && (
            <button
              onClick={() => onAnswer(notSureOption.label)}
              className="flex items-center justify-between w-full p-4 bg-surface-container-low rounded-xl text-left transition-all hover:bg-surface-container-high active:scale-[0.99] mt-2"
            >
              <span className="text-secondary italic text-sm">
                I&apos;m not sure
              </span>
              <span className="material-symbols-outlined text-secondary text-sm">
                help_outline
              </span>
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
