"use client";

import { useState } from "react";

interface ExportActionsProps {
  guideSteps: string[];
  llmPrompt: string;
}

export default function ExportActions({
  guideSteps,
  llmPrompt,
}: ExportActionsProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(llmPrompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownload() {
    const stepsText = guideSteps.join("\n");
    const content = `YOUR GUIDE\n\n${stepsText}\n\n---\n\nPROMPT FOR YOUR AI ASSISTANT\n\n${llmPrompt}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "autoresearch-guide.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col md:flex-row gap-3">
      <button
        onClick={handleCopy}
        className="flex-1 h-10 px-6 bg-primary text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:bg-primary-container active:scale-95"
      >
        <span className="text-base">{copied ? "✓" : "⎘"}</span>
        <span>{copied ? "Copied!" : "Copy to clipboard"}</span>
      </button>
      <button
        onClick={handleDownload}
        className="flex-1 h-10 px-6 bg-white border border-slate-200 text-slate-700 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors active:scale-95"
      >
        <span className="text-base">↓</span>
        <span>Download .txt</span>
      </button>
    </div>
  );
}
