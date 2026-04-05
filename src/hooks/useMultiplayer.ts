/**
 * useMultiplayer Hook
 * Wires the multiplayer postMessage events into the MultiplayerContext
 * reducer so React components stay reactive.
 *
 * IMPORTANT: Call this hook ONCE at the app root (e.g. AppContent).
 * In child components, use `useMultiplayerActions()` or
 * `useMultiplayerState()` from the context instead.
 *
 * Data-flow recap (no DB needed):
 *   1. Your game calls  sendAction('PLACE_PIECE', { x: 3 })
 *   2. Parent relays it over Socket.IO to every player in the room.
 *   3. Every player's iframe receives  MP_ACTION → dispatched into context.
 *   4. React re-renders from context; each player sees the same update.
 *   Shared authoritative state can also be synced via setState() / MP_STATE_UPDATE.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useMultiplayerContext } from '../context/MultiplayerContext';

interface UseMultiplayerOptions {
  debug?: boolean;
}

// Outgoing message shape
interface OutgoingMessage {
  type: string;
  payload?: unknown;
}

// Message types the *game* sends TO the parent — never dispatched locally.
const OUTGOING_TYPES = new Set([
  'MP_SEND_ACTION',
  'MP_SET_STATE',
  'MP_END_TURN',
  'MP_UPDATE_META',
  'MP_END_GAME',
  'MP_REQUEST_STATE',
]);

/**
 * Root-level hook that both listens for incoming MP_* messages
 * and exposes the outgoing action helpers.
 */
export function useMultiplayer(options: UseMultiplayerOptions = {}) {
  const { debug = false } = options;
  const { state, dispatch } = useMultiplayerContext();
  const debugRef = useRef(debug);
  debugRef.current = debug;
  const initRef = useRef(false);

  const log = useCallback((...args: unknown[]) => {
    if (debugRef.current) console.log('[useMultiplayer]', ...args);
  }, []);

  // ── Send helpers ──────────────────────────────────────────

  const send = useCallback(
    (message: OutgoingMessage) => {
      log('Sending:', message.type, (message as { payload?: unknown }).payload);
      window.parent.postMessage(message, '*');
    },
    [log],
  );

  const sendAction = useCallback(
    (action: string, data: Record<string, unknown> = {}) => {
      send({ type: 'MP_SEND_ACTION', payload: { action, data } });
    },
    [send],
  );

  const setState = useCallback(
    (gameState: Record<string, unknown>) => {
      send({ type: 'MP_SET_STATE', payload: { state: gameState } });
    },
    [send],
  );

  const endTurn = useCallback(
    (nextPlayerSocketId?: string) => {
      send({ type: 'MP_END_TURN', payload: { nextPlayerSocketId } });
    },
    [send],
  );

  const updateMeta = useCallback(
    (meta: Record<string, unknown>) => {
      send({ type: 'MP_UPDATE_META', payload: { meta } });
    },
    [send],
  );

  const endGame = useCallback(() => {
    send({ type: 'MP_END_GAME' });
  }, [send]);

  const requestState = useCallback(() => {
    send({ type: 'MP_REQUEST_STATE' });
  }, [send]);

  // ── Incoming message listener (registered once) ───────────

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') return;
      if (!msg.type.startsWith('MP_')) return;

      // Ignore our OWN outgoing messages echoing back in standalone mode
      // (when window.parent === window).
      if (OUTGOING_TYPES.has(msg.type)) return;

      log('Received:', msg.type, msg.payload);

      switch (msg.type) {
        case 'MP_ROOM_STATE':
          dispatch({ type: 'MP_SET_ROOM', payload: msg.payload });
          break;
        case 'MP_GAME_STARTED':
          dispatch({ type: 'MP_GAME_STARTED', payload: msg.payload });
          break;
        case 'MP_GAME_ENDED':
          dispatch({ type: 'MP_GAME_ENDED', payload: msg.payload });
          break;
        case 'MP_ACTION':
          dispatch({ type: 'MP_ACTION', payload: msg.payload });
          break;
        case 'MP_STATE_UPDATE':
          dispatch({ type: 'MP_STATE_UPDATE', payload: msg.payload });
          break;
        case 'MP_TURN_CHANGED':
          dispatch({ type: 'MP_TURN_CHANGED', payload: msg.payload });
          break;
        case 'MP_ERROR':
          dispatch({ type: 'MP_ERROR', payload: msg.payload });
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    // Request current state once on first mount
    // (handles iframe reloads mid-game / reconnects).
    if (!initRef.current) {
      initRef.current = true;
      send({ type: 'MP_REQUEST_STATE' });
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [dispatch, log, send]);

  return {
    // State (reactive)
    isInRoom: state.isInRoom,
    mySocketId: state.mySocketId,
    isHost: state.isHost,
    isMyTurn: state.isMyTurn,
    room: state.room,
    players: state.players,
    currentTurn: state.currentTurn,
    turnOrder: state.turnOrder,
    sharedGameState: state.sharedGameState,
    lastAction: state.lastAction,
    lastError: state.lastError,

    // Actions (outgoing)
    sendAction,
    setState,
    endTurn,
    updateMeta,
    endGame,
    requestState,

    // Direct dispatch for advanced usage
    dispatch,
  };
}

/**
 * Lightweight accessor — returns ONLY the outgoing action helpers.
 * Safe to call in any child component without registering a second listener.
 */
export function useMultiplayerActions() {
  const { dispatch } = useMultiplayerContext();

  const send = useCallback((message: OutgoingMessage) => {
    window.parent.postMessage(message, '*');
  }, []);

  return {
    sendAction: useCallback(
      (action: string, data: Record<string, unknown> = {}) =>
        send({ type: 'MP_SEND_ACTION', payload: { action, data } }),
      [send],
    ),
    setState: useCallback(
      (gameState: Record<string, unknown>) =>
        send({ type: 'MP_SET_STATE', payload: { state: gameState } }),
      [send],
    ),
    endTurn: useCallback(
      (nextPlayerSocketId?: string) =>
        send({ type: 'MP_END_TURN', payload: { nextPlayerSocketId } }),
      [send],
    ),
    updateMeta: useCallback(
      (meta: Record<string, unknown>) =>
        send({ type: 'MP_UPDATE_META', payload: { meta } }),
      [send],
    ),
    endGame: useCallback(() => send({ type: 'MP_END_GAME' }), [send]),
    requestState: useCallback(() => send({ type: 'MP_REQUEST_STATE' }), [send]),
    dispatch,
  };
}
