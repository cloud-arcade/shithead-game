/**
 * Game Container — Full responsive game window
 */

import { useGameContext } from '../context/GameContext';
import { LoadingScreen } from './screens/LoadingScreen';
import { MenuScreen } from './screens/MenuScreen';
import { GameScreen } from './screens/GameScreen';
import { GameOverScreen } from './screens/GameOverScreen';

export function GameContainer() {
  const { state } = useGameContext();
  const { gameState } = state;

  return (
    <div className="relative w-full h-full bg-background overflow-hidden">
      {gameState === 'loading' && <LoadingScreen />}
      {gameState === 'menu' && <MenuScreen />}
      {(gameState === 'playing' || gameState === 'paused') && <GameScreen />}
      {gameState === 'gameover' && <GameOverScreen />}
    </div>
  );
}
