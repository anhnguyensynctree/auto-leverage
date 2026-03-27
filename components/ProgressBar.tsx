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
        <span className="text-[13px] font-medium text-secondary uppercase tracking-wider">
          Question {current} of {max}
        </span>
      </div>
      <div className="w-full bg-surface-container-low h-[4px] rounded-full overflow-hidden">
        <div
          className="bg-primary h-full rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
