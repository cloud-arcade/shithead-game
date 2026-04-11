/**
 * useDisconnectGuard — Tracks disconnected players with a 30-second
 * grace period before triggering forfeit.
 *
 * Watches the multiplayer players list for status changes.
 * When a player goes 'disconnected', starts a 30s countdown.
 * If they reconnect within 30s, cancels. Otherwise, calls onForfeit.
 */

import { useState, useEffect, useRef } from 'react';
import type { RoomPlayer } from '../types';

const DISCONNECT_GRACE_MS = 30_000; // 30 seconds

interface DisconnectedPlayer {
  socketId: string;
  displayName: string;
  disconnectedAt: number;
  timeRemaining: number;
}

interface UseDisconnectGuardOptions {
  players: RoomPlayer[];
  mySocketId: string | null;
  isPlaying: boolean;
  onForfeit: (socketId: string) => void;
}

export function useDisconnectGuard({
  players,
  mySocketId,
  isPlaying,
  onForfeit,
}: UseDisconnectGuardOptions) {
  const [disconnectedPlayers, setDisconnectedPlayers] = useState<
    DisconnectedPlayer[]
  >([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const onForfeitRef = useRef(onForfeit);
  onForfeitRef.current = onForfeit;
  const prevStatusRef = useRef<Map<string, string>>(new Map());

  // Track player status changes
  useEffect(() => {
    if (!isPlaying) return;

    for (const player of players) {
      if (player.socketId === mySocketId) continue;

      const prevStatus = prevStatusRef.current.get(player.socketId);
      const currentStatus = player.status;

      // Player just disconnected
      if (
        currentStatus === 'disconnected' &&
        prevStatus !== 'disconnected'
      ) {
        const disconnectedAt = Date.now();

        setDisconnectedPlayers((prev) => [
          ...prev.filter((d) => d.socketId !== player.socketId),
          {
            socketId: player.socketId,
            displayName: player.displayName,
            disconnectedAt,
            timeRemaining: DISCONNECT_GRACE_MS / 1000,
          },
        ]);

        // Start forfeit timer
        const timer = setTimeout(() => {
          timersRef.current.delete(player.socketId);
          onForfeitRef.current(player.socketId);
          setDisconnectedPlayers((prev) =>
            prev.filter((d) => d.socketId !== player.socketId)
          );
        }, DISCONNECT_GRACE_MS);

        // Clear any existing timer for this player
        const existingTimer = timersRef.current.get(player.socketId);
        if (existingTimer) clearTimeout(existingTimer);
        timersRef.current.set(player.socketId, timer);
      }

      // Player reconnected
      if (
        currentStatus !== 'disconnected' &&
        prevStatus === 'disconnected'
      ) {
        const timer = timersRef.current.get(player.socketId);
        if (timer) {
          clearTimeout(timer);
          timersRef.current.delete(player.socketId);
        }
        setDisconnectedPlayers((prev) =>
          prev.filter((d) => d.socketId !== player.socketId)
        );
      }

      prevStatusRef.current.set(player.socketId, currentStatus);
    }
  }, [players, mySocketId, isPlaying]);

  // Update countdown display every second
  useEffect(() => {
    if (disconnectedPlayers.length === 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      setDisconnectedPlayers((prev) =>
        prev.map((d) => ({
          ...d,
          timeRemaining: Math.max(
            0,
            Math.ceil((DISCONNECT_GRACE_MS - (now - d.disconnectedAt)) / 1000)
          ),
        }))
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [disconnectedPlayers.length]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      for (const timer of timersRef.current.values()) {
        clearTimeout(timer);
      }
    };
  }, []);

  return {
    disconnectedPlayers,
    hasDisconnectedPlayers: disconnectedPlayers.length > 0,
  };
}
