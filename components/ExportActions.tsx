"use client";

import { useState } from "react";
import { track } from "@vercel/analytics/react";

interface ExportActionsProps {
  guideSteps: string[];
  llmPrompt: string;
}

export default function ExportActions({
  guideSteps,
  llmPrompt,
}: ExportActionsProps) {
  const [copied, setCopied] = useState(false);
  const [sharedCopied, setSharedCopied] = useState(false);

  function handleCopy() {
    track("output_copy_prompt");
    navigator.clipboard.writeText(llmPrompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setSharedCopied(true);
      setTimeout(() => setSharedCopied(false), 2000);
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
        className="flex-1 h-10 px-6 bg-primary text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:bg-on-primary-fixed-variant active:scale-95 shadow-glow-sm"
      >
        <span className="text-base">{copied ? "✓" : "⎘"}</span>
        <span>{copied ? "Copied!" : "Copy to clipboard"}</span>
      </button>
      <button
        onClick={handleShare}
        className="flex-1 h-10 px-6 bg-surface-container border border-outline-variant/40 text-on-surface-variant rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-surface-container-high hover:text-on-surface transition-all active:scale-95"
      >
        <span className="text-base">{sharedCopied ? "✓" : "↗"}</span>
        <span>{sharedCopied ? "Copied!" : "Share this guide"}</span>
      </button>
      <button
        onClick={handleDownload}
        className="flex-1 h-10 px-6 bg-surface-container border border-outline-variant/40 text-on-surface-variant rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-surface-container-high hover:text-on-surface transition-all active:scale-95"
      >
        <span className="text-base">↓</span>
        <span>Download .txt</span>
      </button>
    </div>
  );
}
