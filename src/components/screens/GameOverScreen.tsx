/**
 * Game Over Screen
 * Shown when the multiplayer game ends — redirects back to menu
 */

import { useGameContext } from '../../context/GameContext';
import { useCloudArcade } from '../../hooks/useCloudArcade';
import { Button } from '../ui/Button';

export function GameOverScreen() {
  const { dispatch } = useGameContext();
  const { endSession, startSession } = useCloudArcade();

  const handlePlayAgain = () => {
    startSession();
    dispatch({ type: 'RESET_GAME' });
    dispatch({ type: 'SET_STATE', payload: 'playing' });
  };

  const handleMenu = () => {
    endSession();
    dispatch({ type: 'RESET_GAME' });
    dispatch({ type: 'SET_STATE', payload: 'menu' });
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-zinc-950 to-background">
      <div className="flex flex-col items-center gap-6 text-center p-8">
        <p className="text-5xl">🃏</p>
        <h1 className="text-3xl font-bold text-white tracking-tight">Game Complete</h1>

        <div className="flex flex-col gap-3 min-w-[200px]">
          <Button onClick={handlePlayAgain} variant="primary" size="large">
            Play Again
          </Button>
          <Button onClick={handleMenu} variant="secondary" size="large">
            Back to Lobby
          </Button>
        </div>
      </div>
    </div>
  );
}
