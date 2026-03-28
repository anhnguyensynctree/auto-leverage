"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import OutputCard from "@/components/OutputCard";
import SimulationCard from "@/components/SimulationCard";
import type { SimulationResult } from "@/app/api/simulate/route";

interface OutputData {
  component_names: string[];
  guide_steps: string[];
  llm_prompt: string;
}

interface ApiResponse {
  data: OutputData | null;
  error: string | null;
}

interface SimApiResponse {
  data: SimulationResult | null;
  error: string | null;
}

function OutputContent() {
  const params = useSearchParams();
  const router = useRouter();

  const [data, setData] = useState<OutputData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sim, setSim] = useState<SimulationResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  const rawComponents = params.get("components") ?? "";
  const useCase = params.get("useCase") ?? "";
  const components = rawComponents.split(",").filter(Boolean);

  const fetchOutput = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const requestBody: { components: string[]; useCase?: string } = {
        components,
      };
      if (useCase) requestBody.useCase = useCase;
      const res = await fetch("/api/output", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const json: ApiResponse = await res.json();
      if (!res.ok || json.error || !json.data) {
        setError(json.error ?? "Something went wrong — try again");
      } else {
        setData(json.data);
        fetchSimulation();
      }
    } catch {
      setError("Something went wrong — try again");
    } finally {
      setLoading(false);
    }
  }, [rawComponents]);

  const fetchSimulation = useCallback(async () => {
    setSimLoading(true);
    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useCase, components }),
      });
      const json: SimApiResponse = await res.json();
      if (res.ok && json.data) {
        setSim(json.data);
      }
    } catch {
      // simulation is an enhancement — silently hide on failure
    } finally {
      setSimLoading(false);
    }
  }, [rawComponents]);

  useEffect(() => {
    if (components.length === 0) {
      router.replace("/");
      return;
    }
    fetchOutput();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-slate-500 text-sm font-medium">
            Building your guide...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-[400px] w-full bg-error-container rounded-xl p-6 space-y-4">
          <p className="text-on-error-container font-medium text-sm">{error}</p>
          <button
            onClick={fetchOutput}
            className="w-full h-10 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-container transition-colors active:scale-95"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-sm shadow-slate-200/50">
        <div className="flex items-center justify-between px-6 py-4 max-w-[680px] mx-auto w-full">
          <span className="text-lg font-bold text-slate-900 tracking-tight">
            AI Research Configurator
          </span>
          <button
            onClick={() => router.push("/")}
            className="font-sans text-sm font-medium tracking-tight text-slate-600 hover:text-slate-900 transition-colors"
          >
            Start over
          </button>
        </div>
      </nav>

      <main className="pt-24 pb-12 px-6 max-w-[680px] mx-auto">
        <OutputCard
          componentNames={data.component_names}
          guideSteps={data.guide_steps}
          llmPrompt={data.llm_prompt}
        />
        {simLoading && (
          <div className="mt-12 space-y-4 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-32" />
            <div className="h-3 bg-slate-100 rounded w-full" />
            <div className="h-3 bg-slate-100 rounded w-5/6" />
          </div>
        )}
        {!simLoading && sim && <SimulationCard {...sim} />}
      </main>

      <footer className="w-full py-12 bg-transparent">
        <div className="flex flex-col items-center justify-center space-y-4 max-w-[680px] mx-auto w-full">
          <button
            onClick={() => router.push("/")}
            className="text-slate-400 hover:text-primary transition-all font-sans text-[13px] font-medium tracking-tight"
          >
            Start over
          </button>
        </div>
      </footer>
    </div>
  );
}

export default function OutputPage() {
  return (
    <Suspense>
      <OutputContent />
    </Suspense>
  );
}
