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
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-lg border-b border-outline-variant/30">
        <div className="flex items-center justify-between px-6 py-4 max-w-[600px] mx-auto w-full">
          <span className="text-sm font-semibold tracking-widest text-on-surface-variant uppercase">
            auto-leverage
          </span>
        </div>
      </header>

      <main className="max-w-[600px] mx-auto px-6 pt-10 pb-24 w-full flex-1">
        <nav className="flex flex-col gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-secondary text-sm font-medium hover:text-on-surface transition-colors group w-fit"
          >
            <span className="material-symbols-outlined text-lg group-hover:-translate-x-1 transition-transform">
              arrow_back
            </span>
            Back
          </button>
          <ProgressBar turnCount={turnCount} />
        </nav>

        <section className="mt-10">
          <h1 className="text-[22px] font-bold text-on-surface tracking-tight leading-snug">
            {question}
          </h1>
        </section>

        <div
          className="mt-8 flex flex-col gap-2"
          role="radiogroup"
          aria-label="Options"
        >
          {options.map((option, idx) => {
            const isSelected = selectedOption === option;
            const isElse = option === ELSE_OPTION;

            return (
              <label
                key={option}
                className={[
                  "flex items-center gap-4 w-full p-4 rounded-xl cursor-pointer transition-all border",
                  isElse
                    ? "bg-surface-container-low border-outline-variant/20 hover:border-outline-variant/50 mt-2"
                    : isSelected
                      ? "bg-surface-container border-primary shadow-glow-sm"
                      : "bg-surface-container-lowest border-outline-variant/30 hover:border-primary/50 hover:bg-surface-container-low",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="question-option"
                  value={option}
                  checked={isSelected}
                  onChange={() => onSelect(option)}
                  className="sr-only"
                />
                {!isElse && (
                  <span
                    className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-[11px] font-bold transition-colors ${
                      isSelected
                        ? "bg-primary border-primary text-white"
                        : "border-outline-variant text-secondary"
                    }`}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                )}
                <span
                  className={[
                    "text-sm font-medium transition-colors",
                    isElse
                      ? "text-secondary italic"
                      : isSelected
                        ? "text-on-surface"
                        : "text-on-surface-variant",
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
              className="mt-2 w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-4 text-sm text-on-surface placeholder:text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none transition-colors"
              aria-label="Describe your need"
            />
          )}
        </div>

        <div className="mt-8">
          <button
            onClick={onNext}
            disabled={nextDisabled || loading}
            className="w-full h-12 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-on-primary-fixed-variant transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-glow"
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
