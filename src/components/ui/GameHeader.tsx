/**
 * GameHeader — Premium top bar with game info and controls
 */

import { memo } from 'react';

interface GameHeaderProps {
  roomCode?: string;
  playerCount: number;
  currentRound?: number;
  onShowLog: () => void;
  showLog: boolean;
}

export const GameHeader = memo(function GameHeader({
  roomCode,
  playerCount,
  currentRound,
  onShowLog,
  showLog,
}: GameHeaderProps) {
  return (
    <div className="game-header">
      <div className="game-header__left">
        <div className="game-header__title">
          <span className="game-header__icon">🃏</span>
          <span className="game-header__text">Shithead</span>
        </div>
        {roomCode && (
          <div className="game-header__room">
            <span className="game-header__room-label">Room</span>
            <span className="game-header__room-code">{roomCode}</span>
          </div>
        )}
      </div>

      <div className="game-header__center">
        <div className="game-header__stat">
          <span className="game-header__stat-icon">👥</span>
          <span className="game-header__stat-value">{playerCount}</span>
        </div>
        {currentRound && currentRound > 1 && (
          <div className="game-header__stat">
            <span className="game-header__stat-icon">🔄</span>
            <span className="game-header__stat-value">Round {currentRound}</span>
          </div>
        )}
      </div>

      <div className="game-header__right">
        <button
          className={`game-header__btn ${showLog ? 'game-header__btn--active' : ''}`}
          onClick={onShowLog}
          title="Game log"
        >
          📋 Log
        </button>
      </div>
    </div>
  );
});
