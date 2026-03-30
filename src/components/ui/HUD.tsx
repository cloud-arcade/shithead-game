/**
 * HUD (Heads-Up Display) Component
 * Shows score, lives, and other game info during gameplay
 */

import { useGameContext } from '../../context/GameContext';

export function HUD() {
  const { state } = useGameContext();

  return (
    <div className="absolute inset-x-0 top-0 flex justify-between items-start p-4 pointer-events-none z-10">
      <div className="flex flex-col gap-1">
        <span className="text-[0.65rem] text-zinc-500 uppercase tracking-wide">Score</span>
        <span className="text-xl font-bold font-mono text-white">{state.score}</span>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2">
        <span className="text-[0.65rem] text-zinc-600">ESC to pause</span>
      </div>

      <div className="flex gap-1.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <span 
            key={i} 
            className={`text-xl transition-colors ${i < state.lives ? 'text-red-500' : 'text-zinc-700'}`}
          >
            ♥
          </span>
        ))}
      </div>
    </div>
  );
}
