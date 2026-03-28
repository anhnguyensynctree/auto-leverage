"use client";

interface ProgressBarProps {
  turnCount: number;
  max?: number;
}

export default function ProgressBar({ turnCount, max = 5 }: ProgressBarProps) {
  const current = Math.min(turnCount + 1, max);
  const percent = Math.min((current / max) * 100, 100);

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <span className="text-[11px] font-semibold text-secondary uppercase tracking-widest">
          Question {current} of {max}
        </span>
      </div>
      <div className="w-full bg-surface-container-high h-[3px] rounded-full overflow-hidden">
        <div
          className="bg-primary h-full rounded-full transition-all duration-500 shadow-glow-sm"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
