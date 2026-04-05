/**
 * Game Screen — Main Shithead gameplay screen
 * Renders the appropriate phase: swapping, playing, or finished.
 */

import { useEffect } from 'react';
import { useShitheadGame } from '../../hooks/useShitheadGame';
import { useMultiplayerState } from '../../context/MultiplayerContext';
import { requestFullscreenLandscape, exitFullscreenLandscape } from '../../platform/fullscreen';
import { getAssetPath } from '../../game/engine';
import { SwapPhase } from '../game/SwapPhase';
import { GameBoard } from '../game/GameBoard';
import { GameOverView } from '../game/GameOverView';

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
  } = useShitheadGame();

  const mp = useMultiplayerState();

  // Force fullscreen landscape while game is active
  useEffect(() => {
    requestFullscreenLandscape();
    return () => exitFullscreenLandscape();
  }, []);

  // Host auto-deals when the game screen mounts with enough players
  useEffect(() => {
    if (gameState.phase === 'waiting' && isHost && mp.players.length >= 2) {
      deal();
    }
  }, [gameState.phase, isHost, mp.players.length, deal]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Full-bleed casino background */}
      <img
        src={getAssetPath('assets/game-assets/interface_game/bg_1.png')}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />

      {/* Table PNG - full screen height, preserve rounded edge on desktop */}
      <img
        src={getAssetPath('assets/game-assets/interface_game/table_1.png')}
        alt=""
        className="absolute top-0 left-0 w-full h-screen object-cover object-top lg:object-bottom"
        draggable={false}
      />

      {/* Content layer */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Slim top HUD bar */}
        <div className="flex items-center justify-between px-3 py-1 shrink-0"
          style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)' }}
        >
          <span className="text-[0.6rem] font-bold text-gold-light uppercase tracking-widest drop-shadow">Shithead</span>
          <div className="flex items-center gap-2 text-[0.5rem] font-semibold">
            {gameState.phase !== 'waiting' && (
              <>
                <span className="text-white/50">Draw {gameState.drawPile.length}</span>
                <span className="text-white/20">|</span>
                <span className="text-white/50">Pile {gameState.pile.length}</span>
                <span className="text-white/20">|</span>
              </>
            )}
            <span className={`uppercase tracking-wider font-bold ${
              gameState.phase === 'playing' ? 'text-green-400' :
              gameState.phase === 'finished' ? 'text-red-400' :
              'text-gold'
            }`}>
              {gameState.phase}
            </span>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {/* Waiting for deal */}
          {gameState.phase === 'waiting' && (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-8 h-8 border-[3px] border-white/10 border-t-gold rounded-full animate-spin" />
              <p className="text-xs text-white/70 font-medium drop-shadow">
                {mp.players.length < 2
                  ? 'Waiting for more players...'
                  : isHost
                  ? 'Dealing cards...'
                  : 'Waiting for host to deal...'}
              </p>
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
            />
          )}

          {/* Game over */}
          {gameState.phase === 'finished' && (
            <GameOverView gameState={gameState} mySocketId={mySocketId} />
          )}
        </div>
      </div>
    </div>
  );
}
