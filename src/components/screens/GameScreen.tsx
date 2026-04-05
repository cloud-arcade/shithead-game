/**
 * Game Screen — Main Shithead gameplay screen
 * Renders the appropriate phase: swapping, playing, or finished.
 */

import { useShitheadGame } from '../../hooks/useShitheadGame';
import { useMultiplayerState } from '../../context/MultiplayerContext';
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
    doStartGame,
    doPlayCards,
    doPickUpPile,
  } = useShitheadGame();

  const mp = useMultiplayerState();

  // If game hasn't been dealt yet and we're host, deal
  if (gameState.phase === 'waiting' && isHost && mp.players.length >= 2) {
    setTimeout(() => deal(), 0);
  }

  return (
    <div className="absolute inset-0 flex flex-col bg-gradient-to-b from-zinc-950 via-[#0d1117] to-zinc-950">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/40 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm">🃏</span>
          <span className="text-xs font-medium text-zinc-400">Shithead</span>
        </div>
        <div className="flex items-center gap-3 text-[0.6rem] text-zinc-500">
          {gameState.phase !== 'waiting' && (
            <>
              <span>Draw: {gameState.drawPile.length}</span>
              <span>Pile: {gameState.pile.length}</span>
            </>
          )}
          <span className={`uppercase tracking-wider ${
            gameState.phase === 'playing' ? 'text-emerald-400' :
            gameState.phase === 'finished' ? 'text-red-400' :
            'text-yellow-400'
          }`}>
            {gameState.phase}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* Waiting for deal */}
        {gameState.phase === 'waiting' && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-10 h-10 border-[3px] border-white/10 border-t-yellow-400 rounded-full animate-spin" />
            <p className="text-sm text-zinc-400">
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
          <div className="flex items-center justify-center h-full p-4">
            <SwapPhase
              myPlayer={myPlayer}
              isHost={isHost}
              onSwap={doSwapCards}
              onReady={doStartGame}
            />
          </div>
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
          <div className="flex items-center justify-center h-full">
            <GameOverView gameState={gameState} mySocketId={mySocketId} />
          </div>
        )}
      </div>
    </div>
  );
}
