"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

const MAX_CHARS = 500;
const MIN_WORDS = 3;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function EntryForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const charCount = value.length;

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    if (e.target.value.length <= MAX_CHARS) {
      setValue(e.target.value);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (countWords(value) < MIN_WORDS) {
      setError("Please use at least 3 words to describe your goal.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: { q0: value.trim() } }),
      });

      const json = (await res.json()) as {
        data: { components: string[]; confidence: number } | null;
        error: string | null;
      };

      if (!res.ok || json.error || !json.data) {
        setError(json.error ?? "Something went wrong. Please try again.");
        return;
      }

      const params = new URLSearchParams({
        intent: value.trim(),
        components: json.data.components.join(","),
        confidence: String(json.data.confidence),
      });

      router.push(`/questionnaire?${params.toString()}`);
    } catch {
      setError(
        "Could not reach the server. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="relative group">
          {/* Glow ring on focus */}
          <div className="absolute -inset-px rounded-xl bg-primary/20 blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <textarea
            value={value}
            onChange={handleChange}
            rows={4}
            placeholder='e.g. "I want to download more training data" or "the model keeps crashing"'
            aria-label="Describe your goal"
            aria-describedby={error ? "entry-error" : undefined}
            className="relative w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-5 text-base text-on-surface placeholder:text-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-none shadow-lg"
          />
        </div>
        <div className="flex justify-between items-center px-1">
          <span className="text-xs text-secondary" aria-live="polite">
            {error ? (
              <span id="entry-error" className="text-error font-medium">
                {error}
              </span>
            ) : null}
          </span>
          <span
            className={`text-xs tabular-nums ${
              charCount >= MAX_CHARS ? "text-error" : "text-secondary"
            }`}
            aria-live="polite"
          >
            {charCount}/{MAX_CHARS}
          </span>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full h-[52px] bg-primary hover:bg-on-primary-fixed-variant disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-all active:scale-[0.98] shadow-glow flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span
              className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            />
            Finding your strategy…
          </>
        ) : (
          <>
            Analyze Goal
            <span className="material-symbols-outlined text-[18px]">bolt</span>
          </>
        )}
      </button>
    </form>
  );
}
