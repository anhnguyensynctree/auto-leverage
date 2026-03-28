"use client";

import ExportActions from "./ExportActions";

interface OutputCardProps {
  guideSteps: string[];
  llmPrompt: string;
  componentNames: string[];
}

export default function OutputCard({
  guideSteps,
  llmPrompt,
  componentNames,
}: OutputCardProps) {
  return (
    <div className="w-full">
      <header className="mb-12">
        <p className="text-[11px] font-bold text-primary uppercase tracking-widest mb-3">
          Your Plan
        </p>
        <h1 className="text-3xl md:text-4xl font-extrabold text-on-surface leading-tight tracking-tight mb-4">
          {componentNames.join(" + ")}
        </h1>
        <p className="text-[15px] text-on-surface-variant leading-relaxed">
          Follow the steps below, then paste the prompt into your AI assistant.
        </p>
      </header>

      <section className="mb-10">
        <h2 className="text-[11px] font-bold text-secondary uppercase tracking-widest mb-6">
          Your Guide
        </h2>
        <ol className="space-y-6 list-none p-0 m-0">
          {guideSteps.map((step, index) => {
            const text = step.replace(/^\d+\.\s*/, "");
            return (
              <li key={index} className="flex gap-5">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-[13px] font-bold shadow-glow-sm mt-0.5">
                  {index + 1}
                </div>
                <p className="text-[14px] text-on-surface-variant leading-relaxed pt-1">
                  {text}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      <hr className="border-t border-outline-variant/40 my-8" />

      <section className="mb-16">
        <h2 className="text-[11px] font-bold text-secondary uppercase tracking-widest mb-4">
          Prompt for your AI assistant
        </h2>
        <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/40 border-l-[3px] border-l-primary mb-6">
          <pre className="font-mono text-[13px] text-on-surface-variant leading-relaxed whitespace-pre-wrap break-words">
            <code>{llmPrompt}</code>
          </pre>
        </div>
        <ExportActions guideSteps={guideSteps} llmPrompt={llmPrompt} />
      </section>
    </div>
  );
}
