/**
 * Game Container Component
 * Main container that manages game screens and canvas
 */

import { useGameContext } from '../context/GameContext';
import { LoadingScreen } from './screens/LoadingScreen';
import { MenuScreen } from './screens/MenuScreen';
import { GameScreen } from './screens/GameScreen';
import { PauseOverlay } from './ui/PauseOverlay';
import { GameOverScreen } from './screens/GameOverScreen';

export function GameContainer() {
  const { state } = useGameContext();
  const { gameState } = state;

  return (
    <div className="relative w-full h-full max-w-4xl max-h-[600px] bg-background rounded-xl overflow-hidden shadow-2xl border border-white/5">
      {gameState === 'loading' && <LoadingScreen />}
      {gameState === 'menu' && <MenuScreen />}
      {(gameState === 'playing' || gameState === 'paused') && (
        <>
          <GameScreen />
          {gameState === 'paused' && <PauseOverlay />}
        </>
      )}
      {gameState === 'gameover' && <GameOverScreen />}
    </div>
  );
}
