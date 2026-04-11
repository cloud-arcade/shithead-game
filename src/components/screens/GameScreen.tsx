/**
 * GameScreen — Main Shithead gameplay screen.
 *
 * Integrates:
 * - Game phases (waiting → swapping → playing → finished)
 * - Turn timer (30s per turn, auto-play on timeout)
 * - Disconnect guard (30s grace for disconnected opponents)
 * - Session persistence (save/restore across refresh)
 */

import { useEffect, useState, useCallback } from 'react';
import { useShitheadGame } from '../../hooks/useShitheadGame';
import { useMultiplayerState } from '../../context/MultiplayerContext';
import { useTurnTimer } from '../../hooks/useTurnTimer';
import { useDisconnectGuard } from '../../hooks/useDisconnectGuard';
import { useSessionPersistence } from '../../hooks/useSessionPersistence';
import { requestFullscreenLandscape, exitFullscreenLandscape } from '../../platform/fullscreen';
import { SwapPhase } from '../game/SwapPhase';
import { GameBoard } from '../game/GameBoard';
import { GameOverView } from '../game/GameOverView';
import { DisconnectOverlay, GameLayout } from '../ui';

interface LogEntry {
  message: string;
  time: number;
}

export function GameScreen() {
  const {
    gameState,
    myPlayer,
    mySocketId,
    isHost,
    isMyTurn,
    deal,
    doSwapCards,
    doRedrawHand,
    doStartGame,
    doPlayCards,
    doPickUpPile,
    doEndTurn,
    doAutoPlay,
    doForfeitPlayer,
  } = useShitheadGame();

  const mp = useMultiplayerState();

  // ── Game Log State (for desktop side panel) ────────
  const [gameLog, setGameLog] = useState<LogEntry[]>([]);
  const handleLogUpdate = useCallback((entries: LogEntry[]) => {
    setGameLog(entries);
  }, []);

  // ── Session Persistence ────────────────────────────
  useSessionPersistence(gameState, mySocketId);

  // ── Turn Timer ─────────────────────────────────────
  const turnTimer = useTurnTimer({
    turnStartTime: gameState.turnStartTime,
    isMyTurn,
    isPlaying: gameState.phase === 'playing',
    currentTurn: gameState.currentTurn,
    onTimeout: doAutoPlay,
  });

  // ── Disconnect Guard ───────────────────────────────
  const { disconnectedPlayers } = useDisconnectGuard({
    players: mp.players,
    mySocketId,
    isPlaying:
      gameState.phase === 'playing' || gameState.phase === 'swapping',
    onForfeit: doForfeitPlayer,
  });

  // ── Force fullscreen landscape ─────────────────────
  useEffect(() => {
    requestFullscreenLandscape();
    return () => exitFullscreenLandscape();
  }, []);

  // ── Host auto-deals when screen mounts ─────────────
  useEffect(() => {
    if (
      gameState.phase === 'waiting' &&
      isHost &&
      mp.players.length >= 2
    ) {
      deal();
    }
  }, [gameState.phase, isHost, mp.players.length, deal]);

  return (
    <div className="game-screen">
      {/* Disconnect overlay (absolutely positioned, on top) */}
      <DisconnectOverlay disconnectedPlayers={disconnectedPlayers} />

      <GameLayout gameLog={gameLog}>
        {/* Waiting for deal */}
        {gameState.phase === 'waiting' && (
          <div className="game-table">
            <div className="waiting-screen">
              <div className="spinner" />
              <p
                style={{
                  fontSize: '0.7rem',
                  color: 'rgba(255,255,255,0.55)',
                  fontWeight: 500,
                }}
              >
                {mp.players.length < 2
                  ? 'Waiting for players…'
                  : isHost
                  ? 'Dealing cards…'
                  : 'Waiting for host to deal…'}
              </p>
            </div>
          </div>
        )}

        {/* Swap phase */}
        {gameState.phase === 'swapping' && myPlayer && (
          <SwapPhase
            myPlayer={myPlayer}
            isHost={isHost}
            onSwap={doSwapCards}
            onRedraw={doRedrawHand}
            onReady={doStartGame}
          />
        )}

        {/* Playing phase */}
        {gameState.phase === 'playing' && (
          <GameBoard
            gameState={gameState}
            mySocketId={mySocketId}
            isMyTurn={isMyTurn}
            onPlayCards={doPlayCards}
            onPickUpPile={doPickUpPile}
            onEndTurn={doEndTurn}
            onLogUpdate={handleLogUpdate}
            turnTimer={turnTimer}
          />
        )}

        {/* Game over */}
        {gameState.phase === 'finished' && (
          <GameOverView gameState={gameState} mySocketId={mySocketId} />
        )}
      </GameLayout>
    </div>
  );
}
