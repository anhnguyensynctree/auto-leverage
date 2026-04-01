"use client";

import type { SimulationResult } from "@/lib/simulate-cache";

export default function SimulationCard({
  drafted_input,
  metric,
  experiment_rows,
  outcome,
}: SimulationResult) {
  return (
    <div className="w-full mt-12">
      <h2 className="text-[12px] font-bold text-slate-500 uppercase tracking-[0.08em] mb-8">
        See it in action
      </h2>

      {/* Example input */}
      <div className="mb-8">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.08em] mb-3">
          Example input
        </p>
        <div className="bg-slate-900 rounded-xl border-l-[3px] border-indigo-500 overflow-hidden">
          <pre className="font-mono text-[12px] text-slate-200 leading-relaxed whitespace-pre-wrap break-words p-5">
            <code>{drafted_input}</code>
          </pre>
        </div>
      </div>

      {/* What gets tracked */}
      <div className="mb-8">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.08em] mb-3">
          What gets tracked
        </p>
        <p className="text-[14px] text-slate-600 leading-relaxed">{metric}</p>
      </div>

      {/* Simulated run */}
      <div className="mb-8">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.08em] mb-3">
          Simulated run
        </p>
        <div className="bg-slate-900 rounded-xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-5 py-3 text-slate-400 font-semibold">
                  Experiment
                </th>
                <th className="text-left px-5 py-3 text-slate-400 font-semibold">
                  Result
                </th>
                <th className="text-left px-5 py-3 text-slate-400 font-semibold">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {experiment_rows.map((row) => (
                <tr
                  key={row.experiment}
                  className="border-b border-slate-800 last:border-0"
                >
                  <td className="px-5 py-3 text-slate-300">{row.experiment}</td>
                  <td className="px-5 py-3 text-slate-200 font-mono">
                    {row.result}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Outcome */}
      <div className="border-l-[3px] border-indigo-500 pl-4 py-1">
        <p className="text-[14px] text-slate-600 leading-relaxed italic">
          {outcome}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const lower = status.toLowerCase();
  const colorClass = lower.includes("best")
    ? "text-emerald-400"
    : lower.includes("improved")
      ? "text-sky-400"
      : lower.includes("worse")
        ? "text-rose-400"
        : "text-slate-400";
  return <span className={`font-medium ${colorClass}`}>{status}</span>;
}
