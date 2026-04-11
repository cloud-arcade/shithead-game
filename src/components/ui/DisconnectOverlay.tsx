/**
 * DisconnectOverlay — Shown when an opponent disconnects.
 * Displays a countdown and informs the player.
 */

import { memo } from 'react';

interface DisconnectedPlayer {
  socketId: string;
  displayName: string;
  timeRemaining: number;
}

interface DisconnectOverlayProps {
  disconnectedPlayers: DisconnectedPlayer[];
}

export const DisconnectOverlay = memo(function DisconnectOverlay({
  disconnectedPlayers,
}: DisconnectOverlayProps) {
  if (disconnectedPlayers.length === 0) return null;

  return (
    <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 flex flex-col gap-1.5 pointer-events-none">
      {disconnectedPlayers.map((dp) => (
        <div
          key={dp.socketId}
          className="casino-panel rounded-xl px-4 py-2 flex items-center gap-3 animate-fade-in pointer-events-auto"
          style={{
            borderColor: dp.timeRemaining <= 10
              ? 'rgba(239, 68, 68, 0.4)'
              : 'rgba(251, 191, 36, 0.3)',
          }}
        >
          {/* Spinner */}
          <div className="w-5 h-5 border-2 border-white/10 border-t-amber-400 rounded-full animate-spin shrink-0" />

          {/* Info */}
          <div className="flex flex-col">
            <span className="text-[0.6rem] font-bold text-amber-300">
              {dp.displayName} disconnected
            </span>
            <span className="text-[0.5rem] text-white/40">
              Waiting to reconnect...{' '}
              <span
                className={`font-bold tabular-nums ${
                  dp.timeRemaining <= 10
                    ? 'text-red-400'
                    : 'text-amber-400'
                }`}
              >
                {dp.timeRemaining}s
              </span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
});
