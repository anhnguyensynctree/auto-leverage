"use client";

import ProgressBar from "@/components/ProgressBar";

const ELSE_OPTION = "Something else — I'll describe it";

interface QuestionCardProps {
  question: string;
  options: string[];
  selectedOption: string | null;
  onSelect: (option: string) => void;
  freeText: string;
  onFreeTextChange: (value: string) => void;
  showFreeText: boolean;
  turnCount: number;
  onBack: () => void;
  onNext: () => void;
  loading: boolean;
  nextDisabled: boolean;
}

export default function QuestionCard({
  question,
  options,
  selectedOption,
  onSelect,
  freeText,
  onFreeTextChange,
  showFreeText,
  turnCount,
  onBack,
  onNext,
  loading,
  nextDisabled,
}: QuestionCardProps) {
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
          <ProgressBar turnCount={turnCount} />
        </nav>

        <section className="mt-8">
          <h1 className="text-[22px] font-semibold text-on-background tracking-tight leading-tight">
            {question}
          </h1>
        </section>

        <div
          className="mt-8 flex flex-col gap-2"
          role="radiogroup"
          aria-label="Options"
        >
          {options.map((option) => {
            const isSelected = selectedOption === option;
            const isElse = option === ELSE_OPTION;

            return (
              <label
                key={option}
                className={[
                  "flex items-center gap-3 w-full p-4 rounded-xl cursor-pointer transition-all",
                  isElse
                    ? "bg-surface-container-low hover:bg-surface-container-high mt-2"
                    : "bg-surface-container-lowest border border-outline-variant/40 hover:bg-surface-container hover:border-primary",
                  isSelected && !isElse
                    ? "border-primary bg-surface-container"
                    : "",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="question-option"
                  value={option}
                  checked={isSelected}
                  onChange={() => onSelect(option)}
                  className="accent-primary w-4 h-4 flex-shrink-0"
                />
                <span
                  className={[
                    "font-medium",
                    isElse
                      ? "text-secondary italic text-sm"
                      : "text-on-surface-variant",
                    isSelected ? "text-primary" : "",
                  ].join(" ")}
                >
                  {option}
                </span>
              </label>
            );
          })}

          {showFreeText && (
            <textarea
              value={freeText}
              onChange={(e) => onFreeTextChange(e.target.value)}
              placeholder="Describe what you need…"
              rows={3}
              className="mt-2 w-full rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-4 text-sm text-on-surface placeholder:text-secondary/60 focus:outline-none focus:border-primary resize-none transition-colors"
              aria-label="Describe your need"
            />
          )}
        </div>

        <div className="mt-8">
          <button
            onClick={onNext}
            disabled={nextDisabled || loading}
            className="w-full h-12 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-on-primary-fixed-variant transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin material-symbols-outlined text-lg">
                  progress_activity
                </span>
                Thinking…
              </>
            ) : (
              "Next"
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
