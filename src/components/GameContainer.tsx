/**
 * Game Container — Full responsive game window
 * Auto-transitions ALL players to the game screen when multiplayer events arrive.
 */

import { useEffect } from 'react';
import { useGameContext } from '../context/GameContext';
import { useMultiplayerState } from '../context/MultiplayerContext';
import { LoadingScreen } from './screens/LoadingScreen';
import { MenuScreen } from './screens/MenuScreen';
import { GameScreen } from './screens/GameScreen';
import { GameOverScreen } from './screens/GameOverScreen';

export function GameContainer() {
  const { state, dispatch } = useGameContext();
  const mp = useMultiplayerState();
  const { gameState } = state;

  // Auto-transition ALL players (including guests) to 'playing'
  // when the game starts via multiplayer. The host transitions
  // immediately on button click, but guests need to detect
  // the game-start from multiplayer signals.
  useEffect(() => {
    if (gameState !== 'menu') return;

    // 1. Shared game state already has a non-waiting phase (reconnect / late join)
    const sharedPhase = (mp.sharedGameState as Record<string, unknown>)?.phase as string | undefined;
    if (sharedPhase && sharedPhase !== 'waiting') {
      dispatch({ type: 'SET_STATE', payload: 'playing' });
      return;
    }

    // 2. A DEAL or SYNC_STATE action was received (game has started)
    if (
      mp.lastAction?.action === 'DEAL' ||
      mp.lastAction?.action === 'SYNC_STATE' ||
      mp.lastAction?.action === 'START_GAME'
    ) {
      dispatch({ type: 'SET_STATE', payload: 'playing' });
      return;
    }

    // 3. Platform room status changed to in_progress
    if (mp.roomStatus === 'in_progress') {
      dispatch({ type: 'SET_STATE', payload: 'playing' });
      return;
    }
  }, [gameState, mp.sharedGameState, mp.lastAction, mp.roomStatus, dispatch]);

  return (
    <div className="relative w-full h-full bg-background overflow-hidden" style={{ touchAction: 'manipulation' }}>
      {gameState === 'loading' && <LoadingScreen />}
      {gameState === 'menu' && <MenuScreen />}
      {(gameState === 'playing' || gameState === 'paused') && <GameScreen />}
      {gameState === 'gameover' && <GameOverScreen />}
    </div>
  );
}
