/**
 * GameOverView — End-of-game results display.
 *
 * Shows winner/shithead announcement and player rankings.
 */

import type { ShitheadGameState } from '../../game/types';

interface GameOverViewProps {
  gameState: ShitheadGameState;
  mySocketId: string | null;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export function GameOverView({ gameState, mySocketId }: GameOverViewProps) {
  const me = gameState.players.find((p) => p.socketId === mySocketId);
  const isShithead = gameState.shithead === mySocketId;
  const isWinner = gameState.winner === mySocketId;

  // Sort by finish position
  const rankings = [...gameState.players]
    .filter((p) => p.isFinished)
    .sort((a, b) => (a.finishPosition || 999) - (b.finishPosition || 999));

  return (
    <div className="game-over">
      {/* Title banner */}
      <h1
        className={`game-over__title ${
          isShithead
            ? 'game-over__title--lose'
            : isWinner
            ? 'game-over__title--win'
            : 'game-over__title--default'
        }`}
      >
        {isShithead
          ? '💩 SHITHEAD!'
          : isWinner
          ? '🏆 YOU WIN!'
          : `#${me?.finishPosition || '?'} — Game Over`}
      </h1>

      {isShithead && (
        <p className="game-over__subtitle">
          You&rsquo;re the last one standing… that&rsquo;s not a good thing.
        </p>
      )}

      {isWinner && (
        <p className="game-over__subtitle">
          Congratulations! You got rid of all your cards first.
        </p>
      )}

      {/* Rankings */}
      <div className="game-over__rankings">
        {rankings.map((player) => {
          const isMe = player.socketId === mySocketId;
          const pos = player.finishPosition || 999;
          const isLast = player.socketId === gameState.shithead;
          const name = isMe
            ? 'You'
            : player.displayName || `Player ${player.playerNumber}`;

          return (
            <div
              key={player.socketId}
              className={`game-over__rank-row ${isMe ? 'game-over__rank-row--me' : ''}`}
            >
              <span className="game-over__rank-pos">
                {isLast ? '💩' : MEDALS[pos - 1] || `#${pos}`}
              </span>
              <span className="game-over__rank-name">{name}</span>
              {isLast && (
                <span
                  className="game-over__rank-label"
                  style={{
                    background: 'rgba(239,68,68,0.15)',
                    color: '#fca5a5',
                  }}
                >
                  Shithead
                </span>
              )}
              {pos === 1 && !isLast && (
                <span
                  className="game-over__rank-label"
                  style={{
                    background: 'rgba(255,215,0,0.12)',
                    color: '#ffd700',
                  }}
                >
                  Winner
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
