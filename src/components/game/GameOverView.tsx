/**
 * GameOverView — Shows the final results when the game is finished
 */

import { memo } from 'react';
import type { ShitheadGameState } from '../../game/types';

interface GameOverViewProps {
  gameState: ShitheadGameState;
  mySocketId: string | null;
}

export const GameOverView = memo(function GameOverView({ gameState, mySocketId }: GameOverViewProps) {
  const iAmShithead = gameState.shithead === mySocketId;
  const iAmWinner = gameState.winner === mySocketId;

  // Build finish order with names
  const rankings = gameState.finishOrder.map((sid, idx) => {
    const player = gameState.players.find((p) => p.socketId === sid);
    const isShithead = sid === gameState.shithead;
    const isMe = sid === mySocketId;
    return {
      position: idx + 1,
      name: player?.displayName ?? 'Unknown',
      isShithead,
      isMe,
      socketId: sid,
    };
  });

  return (
    <div className="flex flex-col items-center justify-center gap-4 sm:gap-6 p-4 sm:p-6 text-center max-h-full overflow-hidden">
      {/* Title */}
      <div>
        {iAmShithead ? (
          <>
            <p className="text-3xl sm:text-5xl mb-1 sm:mb-2">💩</p>
            <h1 className="text-xl sm:text-3xl font-bold text-red-400">You're the Shithead!</h1>
            <p className="text-xs text-zinc-400 mt-1">Better luck next time...</p>
          </>
        ) : iAmWinner ? (
          <>
            <p className="text-3xl sm:text-5xl mb-1 sm:mb-2">🏆</p>
            <h1 className="text-xl sm:text-3xl font-bold text-yellow-300">You Won!</h1>
            <p className="text-xs text-zinc-400 mt-1">First to empty all cards!</p>
          </>
        ) : (
          <>
            <p className="text-3xl sm:text-5xl mb-1 sm:mb-2">🎮</p>
            <h1 className="text-xl sm:text-3xl font-bold text-white">Game Over!</h1>
          </>
        )}
      </div>

      {/* Rankings */}
      <div className="w-full max-w-xs">
        <h2 className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Final Standings</h2>
        <div className="flex flex-col gap-1">
          {rankings.map((r) => (
            <div
              key={r.socketId}
              className={`
                flex items-center justify-between px-3 py-2 rounded-lg text-sm
                ${r.isMe ? 'bg-emerald-500/10 border border-emerald-400/20' : 'bg-white/5'}
                ${r.isShithead ? 'bg-red-500/10 border border-red-400/20' : ''}
              `}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {r.position === 1 ? '🥇' : r.position === 2 ? '🥈' : r.position === 3 ? '🥉' : r.isShithead ? '💩' : `#${r.position}`}
                </span>
                <span className={`font-medium ${r.isMe ? 'text-emerald-300' : 'text-white'}`}>
                  {r.name}
                  {r.isMe && ' (You)'}
                </span>
              </div>
              {r.isShithead && (
                <span className="text-xs text-red-400 font-bold uppercase">Shithead</span>
              )}
              {r.position === 1 && (
                <span className="text-xs text-yellow-400 font-bold uppercase">Winner</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
