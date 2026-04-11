/**
 * useTurnTimer — 30-second per-turn countdown.
 *
 * - Displays remaining time for the current turn.
 * - When timer reaches 0 and it's the local player's turn,
 *   fires the `onTimeout` callback (auto-play).
 * - Resets whenever the turn or phase changes.
 */

import { useState, useEffect, useRef } from 'react';

const TURN_DURATION = 30; // seconds

interface UseTurnTimerOptions {
  turnStartTime: number;
  isMyTurn: boolean;
  isPlaying: boolean;
  currentTurn: string | null;
  onTimeout: () => void;
}

export function useTurnTimer({
  turnStartTime,
  isMyTurn,
  isPlaying,
  currentTurn,
  onTimeout,
}: UseTurnTimerOptions) {
  const [timeRemaining, setTimeRemaining] = useState(TURN_DURATION);
  const timeoutFiredRef = useRef(false);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  // Reset whenever the turn or phase changes
  useEffect(() => {
    timeoutFiredRef.current = false;

    if (!isPlaying || !currentTurn) {
      setTimeRemaining(TURN_DURATION);
      return;
    }

    // Calculate remaining time based on turnStartTime
    const elapsed = (Date.now() - turnStartTime) / 1000;
    const remaining = Math.max(0, TURN_DURATION - elapsed);
    setTimeRemaining(Math.ceil(remaining));

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedNow = (now - turnStartTime) / 1000;
      const rem = Math.max(0, TURN_DURATION - elapsedNow);
      setTimeRemaining(Math.ceil(rem));

      if (rem <= 0 && !timeoutFiredRef.current) {
        timeoutFiredRef.current = true;
        clearInterval(interval);

        // Only the current turn player's client triggers auto-play
        if (isMyTurn) {
          // Small delay to prevent race conditions
          setTimeout(() => onTimeoutRef.current(), 500);
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [turnStartTime, isMyTurn, isPlaying, currentTurn]);

  const progress = timeRemaining / TURN_DURATION; // 1 = full, 0 = empty

  return {
    timeRemaining,
    progress,
    totalDuration: TURN_DURATION,
    isExpired: timeRemaining <= 0,
    isUrgent: timeRemaining <= 10,
    isCritical: timeRemaining <= 5,
  };
}
