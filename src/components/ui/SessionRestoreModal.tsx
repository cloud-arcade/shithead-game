/**
 * SessionRestoreModal — Shown when a player reloads and has an active game session.
 * Offers to rejoin the game or leave.
 */

import { memo } from 'react';

interface SessionRestoreModalProps {
  onRejoin: () => void;
  onLeave: () => void;
}

export const SessionRestoreModal = memo(function SessionRestoreModal({
  onRejoin,
  onLeave,
}: SessionRestoreModalProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="casino-panel rounded-2xl p-6 max-w-xs w-full mx-4 text-center animate-fade-in">
        {/* Icon */}
        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
          <span className="text-2xl">🃏</span>
        </div>

        {/* Title */}
        <h2 className="text-base font-bold text-gold-light uppercase tracking-wide mb-1">
          Active Game Found
        </h2>
        <p className="text-[0.65rem] text-white/50 mb-4 leading-relaxed">
          You were in a game that's still in progress. Would you like to rejoin?
        </p>

        {/* Buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onRejoin}
            className="btn btn-primary btn-md w-full"
          >
            Rejoin Game
          </button>
          <button
            onClick={onLeave}
            className="btn btn-secondary btn-sm w-full"
          >
            Leave Game
          </button>
        </div>

        {/* Info */}
        <p className="text-[0.5rem] text-white/25 mt-3">
          Leaving will count as a forfeit
        </p>
      </div>
    </div>
  );
});
