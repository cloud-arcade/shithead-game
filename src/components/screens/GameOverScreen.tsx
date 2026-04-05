/**
 * Game Over Screen
 * Shown when the multiplayer game ends — redirects back to menu
 */

import { useGameContext } from '../../context/GameContext';
import { useCloudArcade } from '../../hooks/useCloudArcade';
import { getAssetPath } from '../../game/engine';
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
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
      <img
        src={getAssetPath('assets/game-assets/table_and_background_color/bg_1.png')}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
      <img
        src={getAssetPath('assets/game-assets/table_and_background_color/table_1.png')}
        alt=""
        className="absolute top-0 left-0 w-full object-cover object-top"
        style={{ height: '85%' }}
        draggable={false}
      />
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10 casino-panel rounded-xl flex flex-col items-center gap-4 text-center p-6">
        <h1 className="text-xl font-bold text-gold-light uppercase tracking-wide text-glow-gold">Game Complete</h1>
        <div className="flex flex-col gap-2 min-w-[180px]">
          <Button onClick={handlePlayAgain} variant="primary" size="large">
            Play Again
          </Button>
          <Button onClick={handleMenu} variant="secondary" size="medium">
            Back to Lobby
          </Button>
        </div>
      </div>
    </div>
  );
}
