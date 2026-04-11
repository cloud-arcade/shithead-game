/**
 * Game Container — Full responsive game window.
 *
 * Auto-transitions players to the game screen when multiplayer events arrive.
 * Detects existing sessions from page refresh and offers to rejoin.
 */

import { useEffect, useState, useCallback } from 'react';
import { useGameContext } from '../context/GameContext';
import { useMultiplayerState } from '../context/MultiplayerContext';
import { LoadingScreen } from './screens/LoadingScreen';
import { MenuScreen } from './screens/MenuScreen';
import { GameScreen } from './screens/GameScreen';
import { GameOverScreen } from './screens/GameOverScreen';
import { SessionRestoreModal } from './ui/SessionRestoreModal';
import { TEST_MODE_ENABLED } from '../hooks/useTestMode';

const SESSION_KEY = 'shithead_game_session';
const RECONNECT_KEY = 'shithead_reconnect';

export function GameContainer() {
  const { state, dispatch } = useGameContext();
  const mp = useMultiplayerState();
  const { gameState } = state;
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  // ── Detect existing session on mount ──────────────────────

  useEffect(() => {
    if (gameState !== 'loading' && gameState !== 'menu') return;

    try {
      const raw =
        sessionStorage.getItem(SESSION_KEY) ??
        localStorage.getItem(RECONNECT_KEY);
      if (!raw) return;

      const stored = JSON.parse(raw);
      const age = Date.now() - (stored.timestamp || 0);

      // Only restore if less than 1 hour old and game was in progress
      if (
        age < 60 * 60 * 1000 &&
        (stored.gameState?.phase === 'playing' ||
          stored.gameState?.phase === 'swapping')
      ) {
        setShowRestoreModal(true);
      }
    } catch {
      // Corrupt data — clear
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(RECONNECT_KEY);
    }
  }, []);

  // ── Auto-transition ALL players to 'playing' ─────────────

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

  // ── Session restore handlers ──────────────────────────────

  const handleRejoin = useCallback(() => {
    setShowRestoreModal(false);
    // Skip straight to playing — the game hooks will restore from
    // sessionStorage + sharedGameState automatically
    dispatch({ type: 'SET_STATE', payload: 'playing' });
  }, [dispatch]);

  const handleLeaveSession = useCallback(() => {
    setShowRestoreModal(false);
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(RECONNECT_KEY);
    // Stay on menu / proceed to menu normally
    if (gameState === 'loading') {
      // Let loading screen finish naturally
    }
  }, [gameState]);

  return (
    <div className="relative w-full h-full bg-background overflow-hidden" style={{ touchAction: 'manipulation' }}>
      {gameState === 'loading' && <LoadingScreen />}
      {gameState === 'menu' && <MenuScreen />}
      {(gameState === 'playing' || gameState === 'paused') && <GameScreen />}
      {gameState === 'gameover' && <GameOverScreen />}

      {/* Session restore modal */}
      {showRestoreModal && (
        <SessionRestoreModal onRejoin={handleRejoin} onLeave={handleLeaveSession} />
      )}

      {/* Test mode indicator */}
      {TEST_MODE_ENABLED && (
        <div className="fixed top-0 right-0 z-[9999] bg-amber-500 text-black text-[0.5rem] font-bold px-2 py-0.5 rounded-bl-md uppercase tracking-wider opacity-70 pointer-events-none select-none">
          TEST MODE
        </div>
      )}
    </div>
  );
}
