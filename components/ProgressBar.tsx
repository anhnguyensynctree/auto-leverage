"use client";

interface ProgressBarProps {
  current: number;
  total: number;
}

export default function ProgressBar({ current, total }: ProgressBarProps) {
  const percent = Math.min((current / total) * 100, 100);

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <span className="text-[13px] font-medium text-secondary uppercase tracking-wider">
          Step {current} of {total}
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
