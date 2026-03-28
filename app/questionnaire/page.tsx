"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import QuestionCard from "@/components/QuestionCard";

const ELSE_OPTION = "Something else — I'll describe it";

interface Turn {
  q: string;
  a: string;
}

interface ConverseNotDone {
  done: false;
  question: string;
  options: string[];
}

interface ConverseDone {
  done: true;
  components: string[];
  useCase: string;
  confidence: number;
}

type ConverseResult = ConverseNotDone | ConverseDone;

async function fetchConverse(
  intent: string,
  turns: Turn[],
  turnCount: number,
): Promise<ConverseResult> {
  const res = await fetch("/api/converse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent, turns, turnCount }),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const json = await res.json();
  if (json.error) {
    throw new Error(json.error);
  }

  return json.data as ConverseResult;
}

function QuestionnaireContent() {
  const params = useSearchParams();
  const router = useRouter();

  const intent = params.get("intent") ?? "";

  const [turns, setTurns] = useState<Turn[]>([]);
  const [turnCount, setTurnCount] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [freeText, setFreeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Snapshot stack for Back navigation — each entry captures the UI state before advancing
  const [stateStack, setStateStack] = useState<
    Array<{
      question: string;
      options: string[];
      selected: string | null;
      free: string;
    }>
  >([]);

  const callConverse = useCallback(
    async (currentTurns: Turn[], currentTurnCount: number) => {
      setLoading(true);
      setError(false);
      try {
        const result = await fetchConverse(
          intent,
          currentTurns,
          currentTurnCount,
        );

        if (result.done) {
          const navParams = new URLSearchParams({
            components: result.components.join(","),
            useCase: result.useCase,
            confidence: String(result.confidence),
          });
          router.push(`/confirm?${navParams.toString()}`);
          return;
        }

        setCurrentQuestion(result.question);
        setCurrentOptions(result.options);
        setSelectedOption(null);
        setFreeText("");
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [intent, router],
  );

  // Initial load
  useEffect(() => {
    callConverse([], 0);
  }, []);

  const handleNext = useCallback(() => {
    if (!selectedOption) return;

    const answer =
      selectedOption === ELSE_OPTION && freeText.trim()
        ? freeText.trim()
        : selectedOption;

    const newTurns = [...turns, { q: currentQuestion, a: answer }];
    const newTurnCount = turnCount + 1;

    // Push current state onto the stack before advancing
    setStateStack((prev) => [
      ...prev,
      {
        question: currentQuestion,
        options: currentOptions,
        selected: selectedOption,
        free: freeText,
      },
    ]);

    setTurns(newTurns);
    setTurnCount(newTurnCount);
    callConverse(newTurns, newTurnCount);
  }, [
    selectedOption,
    freeText,
    turns,
    turnCount,
    currentQuestion,
    currentOptions,
    callConverse,
  ]);

  const handleBack = useCallback(() => {
    if (stateStack.length === 0) {
      router.back();
      return;
    }

    const prev = stateStack[stateStack.length - 1];
    setStateStack((s) => s.slice(0, -1));
    setTurns((t) => t.slice(0, -1));
    setTurnCount((c) => Math.max(0, c - 1));
    setCurrentQuestion(prev.question);
    setCurrentOptions(prev.options);
    setSelectedOption(prev.selected);
    setFreeText(prev.free);
    setError(false);
  }, [stateStack, router]);

  const handleRetry = useCallback(() => {
    setError(false);
    callConverse(turns, turnCount);
  }, [turns, turnCount, callConverse]);

  const showFreeText = selectedOption === ELSE_OPTION;
  const nextDisabled =
    !selectedOption ||
    (selectedOption === ELSE_OPTION && freeText.trim() === "");

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-[400px] w-full bg-error-container border border-error/20 rounded-xl p-6 space-y-4">
          <p className="text-on-error-container font-medium text-sm">
            Something went wrong — try again
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleRetry}
              className="flex-1 h-10 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-on-primary-fixed-variant transition-colors"
            >
              Retry
            </button>
            <button
              onClick={handleBack}
              className="flex-1 h-10 border border-outline-variant/40 text-on-surface-variant text-sm font-medium rounded-xl hover:bg-surface-container transition-colors"
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion && !loading) {
    return null;
  }

  if (loading && !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="animate-spin material-symbols-outlined text-primary text-3xl">
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <QuestionCard
      question={currentQuestion}
      options={currentOptions}
      selectedOption={selectedOption}
      onSelect={setSelectedOption}
      freeText={freeText}
      onFreeTextChange={setFreeText}
      showFreeText={showFreeText}
      turnCount={turnCount}
      onBack={handleBack}
      onNext={handleNext}
      loading={loading}
      nextDisabled={nextDisabled}
    />
  );
}

export default function QuestionnairePage() {
  return (
    <Suspense>
      <QuestionnaireContent />
    </Suspense>
  );
}
