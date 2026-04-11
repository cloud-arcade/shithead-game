/**
 * useSessionPersistence — Save/restore game state across page refreshes.
 *
 * Persists the full game state to sessionStorage on every change.
 * On mount, detects an existing session and provides it for restoration.
 * Uses localStorage for the 30-second reconnect window after tab close.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import type { ShitheadGameState, SerializedGameState } from '../game/types';
import { serializeState, deserializeState } from '../game/engine';

const SESSION_KEY = 'shithead_game_session';
const RECONNECT_KEY = 'shithead_reconnect';
const SESSION_EXPIRY_MS = 60 * 60 * 1000; // 1 hour max staleness

interface StoredSession {
  gameState: SerializedGameState;
  mySocketId: string;
  timestamp: number;
}

export function useSessionPersistence(
  gameState: ShitheadGameState,
  mySocketId: string | null,
) {
  const [pendingSession, setPendingSession] = useState<StoredSession | null>(null);
  const [hasChecked, setHasChecked] = useState(false);
  const saveThrottle = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Check for existing session on mount ───────────────────

  useEffect(() => {
    if (hasChecked) return;
    setHasChecked(true);

    try {
      // Check sessionStorage first (refresh), then localStorage (tab close)
      const raw =
        sessionStorage.getItem(SESSION_KEY) ??
        localStorage.getItem(RECONNECT_KEY);
      if (!raw) return;

      const stored: StoredSession = JSON.parse(raw);

      // Validate staleness
      if (Date.now() - stored.timestamp > SESSION_EXPIRY_MS) {
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(RECONNECT_KEY);
        return;
      }

      // Only restore if the game was actually in progress
      if (
        stored.gameState.phase === 'playing' ||
        stored.gameState.phase === 'swapping'
      ) {
        setPendingSession(stored);
      }
    } catch {
      // Corrupt data — clear it
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(RECONNECT_KEY);
    }
  }, [hasChecked]);

  // ── Save game state on every change ───────────────────────

  useEffect(() => {
    if (
      !mySocketId ||
      gameState.phase === 'waiting' ||
      gameState.players.length === 0
    ) {
      return;
    }

    // Throttle saves to avoid perf issues
    if (saveThrottle.current) clearTimeout(saveThrottle.current);
    saveThrottle.current = setTimeout(() => {
      const stored: StoredSession = {
        gameState: serializeState(gameState),
        mySocketId,
        timestamp: Date.now(),
      };
      const json = JSON.stringify(stored);

      try {
        sessionStorage.setItem(SESSION_KEY, json);
        // Also save to localStorage for 30s reconnect after tab close
        localStorage.setItem(RECONNECT_KEY, json);
      } catch {
        // Storage full — ignore
      }
    }, 300);

    return () => {
      if (saveThrottle.current) clearTimeout(saveThrottle.current);
    };
  }, [gameState, mySocketId]);

  // ── Save on beforeunload (synchronous) ────────────────────

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (
        !mySocketId ||
        gameState.phase === 'waiting' ||
        gameState.players.length === 0
      ) {
        return;
      }
      const stored: StoredSession = {
        gameState: serializeState(gameState),
        mySocketId,
        timestamp: Date.now(),
      };
      const json = JSON.stringify(stored);
      try {
        sessionStorage.setItem(SESSION_KEY, json);
        localStorage.setItem(RECONNECT_KEY, json);
      } catch {
        // ignore
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [gameState, mySocketId]);

  // ── Restore session ───────────────────────────────────────

  const restoreSession = useCallback((): ShitheadGameState | null => {
    if (!pendingSession) return null;
    try {
      const gs = deserializeState(pendingSession.gameState);
      return gs;
    } catch {
      return null;
    }
  }, [pendingSession]);

  const clearSession = useCallback(() => {
    setPendingSession(null);
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(RECONNECT_KEY);
  }, []);

  // ── Clear on game end ─────────────────────────────────────

  useEffect(() => {
    if (gameState.phase === 'finished') {
      // Don't clear immediately — let the game over screen show first
      const timer = setTimeout(() => {
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(RECONNECT_KEY);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [gameState.phase]);

  return {
    pendingSession,
    hasExistingSession: !!pendingSession,
    restoreSession,
    clearSession,
    hasChecked,
  };
}
