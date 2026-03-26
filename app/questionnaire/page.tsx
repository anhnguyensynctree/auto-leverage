"use client";

import { useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import questionnaire from "@/lib/questionnaire.json";
import { QuestionnaireSchema } from "@/lib/questionnaire-schema";
import type { QuestionNode } from "@/lib/questionnaire-schema";
import QuestionCard from "@/components/QuestionCard";

const TREE = QuestionnaireSchema.parse(questionnaire);
const NODE_MAP = new Map<string, QuestionNode>(
  TREE.nodes.map((n) => [n.id, n]),
);

function getDepth(nodeId: string, visited = new Set<string>()): number {
  if (visited.has(nodeId)) return 0;
  visited.add(nodeId);
  const node = NODE_MAP.get(nodeId);
  if (!node || node.terminal) return 0;
  const options = node.options ?? [];
  const maxChild = options.reduce((max, opt) => {
    return Math.max(max, getDepth(opt.next, new Set(visited)));
  }, 0);
  return 1 + maxChild;
}

const ESTIMATED_TOTAL = Math.max(getDepth(TREE.start), 4);

function QuestionnaireContent() {
  const params = useSearchParams();
  const router = useRouter();

  const [currentNodeId, setCurrentNodeId] = useState<string>(TREE.start);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<string[]>([]);
  const [answerHistory, setAnswerHistory] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const currentNode = NODE_MAP.get(currentNodeId);

  const handleAnswer = useCallback(
    (answer: string) => {
      if (!currentNode) return;

      const option = (currentNode.options ?? []).find(
        (o) => o.label === answer,
      );
      if (!option) return;

      const nextNode = NODE_MAP.get(option.next);
      if (!nextNode) return;

      const newAnswers = { ...answers, [currentNodeId]: answer };
      setAnswers(newAnswers);
      setHistory((prev) => [...prev, currentNodeId]);
      setAnswerHistory((prev) => [...prev, answer]);
      setError(null);

      if (nextNode.terminal) {
        const { components, confidence } = nextNode.terminal;
        const initialComponents = params.get("components") ?? "";
        const mergedComponents = Array.from(
          new Set([
            ...initialComponents.split(",").filter(Boolean),
            ...components,
          ]),
        );
        const navParams = new URLSearchParams({
          components: mergedComponents.join(","),
          confidence: String(confidence),
        });
        router.push(`/confirm?${navParams.toString()}`);
        return;
      }

      setCurrentNodeId(option.next);
    },
    [currentNode, currentNodeId, answers, params, router],
  );

  const handleBack = useCallback(() => {
    if (history.length === 0) {
      router.back();
      return;
    }
    const prevNodeId = history[history.length - 1];
    const prevAnswers = { ...answers };
    delete prevAnswers[prevNodeId];
    setAnswers(prevAnswers);
    setHistory((prev) => prev.slice(0, -1));
    setAnswerHistory((prev) => prev.slice(0, -1));
    setCurrentNodeId(prevNodeId);
    setError(null);
  }, [history, answers, router]);

  if (!currentNode) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <p className="text-on-surface font-medium">
            Something went wrong loading the questionnaire.
          </p>
          <button
            onClick={() => router.push("/")}
            className="text-primary text-sm font-medium hover:underline"
          >
            Start over
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-6">
        <div className="max-w-[400px] w-full bg-error-container rounded-xl p-6 space-y-4">
          <p className="text-on-error-container font-medium text-sm">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={() => setError(null)}
              className="flex-1 h-10 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-on-primary-fixed-variant transition-colors"
            >
              Retry
            </button>
            <button
              onClick={handleBack}
              className="flex-1 h-10 border border-outline-variant text-on-surface text-sm font-medium rounded-lg hover:bg-surface-container transition-colors"
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stepNumber = history.length + 1;

  return (
    <QuestionCard
      node={currentNode}
      onAnswer={handleAnswer}
      onBack={handleBack}
      current={stepNumber}
      total={ESTIMATED_TOTAL}
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
