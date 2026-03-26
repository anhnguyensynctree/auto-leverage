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
        <h1 className="text-4xl font-extrabold text-on-surface leading-tight tracking-tighter mb-4">
          {componentNames.join(" + ")}
        </h1>
        <p className="text-lg text-slate-500 leading-relaxed">
          Follow the steps below, then paste the prompt into your AI assistant.
        </p>
      </header>

      <section className="mb-8">
        <h2 className="text-[12px] font-bold text-slate-500 uppercase tracking-[0.08em] mb-6">
          Your guide
        </h2>
        <ol className="space-y-8 list-none p-0 m-0">
          {guideSteps.map((step, index) => {
            const text = step.replace(/^\d+\.\s*/, "");
            return (
              <li key={index} className="flex gap-5">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[14px] font-bold shadow-sm">
                  {index + 1}
                </div>
                <p className="text-[14px] text-slate-600 leading-relaxed pt-0.5">
                  {text}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      <hr className="border-t border-slate-200 my-10" />

      <section className="mb-16">
        <h2 className="text-[12px] font-bold text-slate-500 uppercase tracking-[0.08em] mb-4">
          Prompt for your AI assistant
        </h2>
        <div className="bg-slate-100 rounded-xl p-6 border-l-[3px] border-primary mb-6 shadow-sm">
          <pre className="font-mono text-[13px] text-slate-800 leading-relaxed whitespace-pre-wrap break-words">
            <code>{llmPrompt}</code>
          </pre>
        </div>
        <ExportActions guideSteps={guideSteps} llmPrompt={llmPrompt} />
      </section>
    </div>
  );
}
