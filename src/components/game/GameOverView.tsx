/**
 * GameOverView — Casino-style game results display
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
    <div className="flex flex-col items-center justify-center h-full gap-3 p-4 text-center">
      {/* Result banner */}
      <div className="casino-panel rounded-xl px-6 py-4 max-w-sm w-full">
        {/* Title */}
        <div className="mb-3">
          {iAmShithead ? (
            <>
              <img src="/assets/game-assets/lose/panel.png" alt="" className="w-16 h-auto mx-auto mb-1" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <h1 className="text-lg font-bold text-red-400 uppercase tracking-wide">You're the Shithead!</h1>
              <p className="text-[0.55rem] text-white/40 mt-0.5">Better luck next time...</p>
            </>
          ) : iAmWinner ? (
            <>
              <div className="flex justify-center items-center gap-2 mb-1">
                <img src="/assets/game-assets/win/stars_left.png" alt="" className="w-8 h-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <img src="/assets/game-assets/win/coins.png" alt="" className="w-10 h-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <img src="/assets/game-assets/win/stars_right.png" alt="" className="w-8 h-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
              <h1 className="text-lg font-bold text-gold-light uppercase tracking-wide text-glow-gold">You Won!</h1>
              <p className="text-[0.55rem] text-white/40 mt-0.5">First to empty all cards!</p>
            </>
          ) : (
            <>
              <h1 className="text-lg font-bold text-white uppercase tracking-wide">Game Over</h1>
            </>
          )}
        </div>

        {/* Rankings */}
        <div className="w-full">
          <h2 className="text-[0.55rem] text-white/30 uppercase tracking-wider font-semibold mb-1.5">
            Final Standings
          </h2>
          <div className="flex flex-col gap-1">
            {rankings.map((r) => (
              <div
                key={r.socketId}
                className={`
                  flex items-center justify-between px-3 py-1.5 rounded-lg text-xs
                  ${r.isMe ? 'bg-green-500/10 border border-green-400/20' : 'bg-white/5'}
                  ${r.isShithead ? 'bg-red-500/10 border border-red-400/20' : ''}
                `}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {r.position === 1 ? '🥇' : r.position === 2 ? '🥈' : r.position === 3 ? '🥉' : r.isShithead ? '💩' : `#${r.position}`}
                  </span>
                  <span className={`font-semibold ${r.isMe ? 'text-green-300' : 'text-white/80'}`}>
                    {r.name}
                    {r.isMe && ' (You)'}
                  </span>
                </div>
                {r.isShithead && (
                  <span className="text-[0.55rem] text-red-400 font-bold uppercase">Shithead</span>
                )}
                {r.position === 1 && (
                  <span className="text-[0.55rem] text-gold-light font-bold uppercase">Winner</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
