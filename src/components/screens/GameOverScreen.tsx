/**
 * Game Over Screen Component
 * DELETE THIS and replace with your game's game over screen
 */

import { useEffect } from 'react';
import { useGameContext } from '../../context/GameContext';
import { useCloudArcade } from '../../hooks/useCloudArcade';
import { Button } from '../ui/Button';

export function GameOverScreen() {
  const { state, dispatch } = useGameContext();
  const { submitScore, endSession, startSession } = useCloudArcade();

  // Submit score and end session on mount
  useEffect(() => {
    submitScore(state.score, { level: state.level });
    endSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePlayAgain = () => {
    startSession();
    dispatch({ type: 'RESET_GAME' });
    dispatch({ type: 'SET_STATE', payload: 'playing' });
  };

  const handleMenu = () => {
    dispatch({ type: 'RESET_GAME' });
    dispatch({ type: 'SET_STATE', payload: 'menu' });
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-zinc-950 to-background">
      <div className="flex flex-col items-center gap-6 text-center p-8">
        <h1 className="text-4xl font-semibold text-red-500 tracking-tight">Session Ended</h1>
        
        <div className="flex flex-col items-center gap-2">
          <p className="flex flex-col gap-1">
            <span className="text-sm text-zinc-500">Final Score</span>
            <strong className="text-5xl font-bold font-mono text-green-500">{state.score}</strong>
          </p>
          {state.score >= state.highScore && state.score > 0 && (
            <p className="text-amber-500 font-medium animate-pulse-slow">New High Score!</p>
          )}
        </div>

        <div className="flex flex-col gap-3 min-w-[200px]">
          <Button onClick={handlePlayAgain} variant="primary" size="large">
            Test Again
          </Button>
          <Button onClick={handleMenu} variant="secondary" size="large">
            Back to Menu
          </Button>
        </div>
      </div>
    </div>
  );
}
