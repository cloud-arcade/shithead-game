/**
 * TurnTimer — Circular countdown timer displayed next to the current player.
 * Uses SVG stroke-dashoffset for a smooth circular depletion effect.
 */

import { memo } from 'react';

interface TurnTimerProps {
  timeRemaining: number;
  totalDuration: number;
  progress: number;
  isUrgent: boolean;
  isCritical: boolean;
  size?: number;
}

export const TurnTimer = memo(function TurnTimer({
  timeRemaining,
  progress,
  isUrgent,
  isCritical,
  size = 36,
}: TurnTimerProps) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  const color = isCritical
    ? '#ef4444' // red
    : isUrgent
    ? '#f59e0b' // amber
    : '#22c55e'; // green

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Background circle */}
      <svg
        width={size}
        height={size}
        className="absolute inset-0 -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 0.3s linear, stroke 0.3s ease',
            filter: isCritical
              ? 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.6))'
              : 'none',
          }}
        />
      </svg>

      {/* Time text */}
      <span
        className={`text-[0.55rem] font-bold tabular-nums ${
          isCritical
            ? 'text-red-400 animate-pulse'
            : isUrgent
            ? 'text-amber-400'
            : 'text-white/70'
        }`}
      >
        {timeRemaining}
      </span>
    </div>
  );
});
