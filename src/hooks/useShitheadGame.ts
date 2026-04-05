/**
 * useShitheadGame — Game state hook for Shithead card game.
 *
 * Connects the pure game engine to the multiplayer transport layer.
 *
 * Architecture:
 * - Turn-based actions (play/pickup) carry the FULL resulting state,
 *   so every player always converges to the exact same truth.
 * - Swap-phase actions are delta-based (only the swap indices), since
 *   each player's swaps are independent and commutative.
 * - sharedGameState (MP_SET_STATE) serves as a fallback for reconnects.
 * - ALL players sync authoritative state after their own actions (not
 *   just the host), ensuring smooth guest turns.
 */

import { useReducer, useEffect, useCallback, useRef } from 'react';
import { useMultiplayerState } from '../context/MultiplayerContext';
import { useMultiplayerActions } from '../hooks/useMultiplayer';
import {
  dealCards,
  swapCards,
  redrawHand,
  startPlaying,
  playCards,
  pickUpPile,
  serializeState,
  deserializeState,
  hasPlayableCard,
  getPlayerPlayableZone,
} from '../game/engine';
import type { ShitheadGameState, SerializedGameState } from '../game/types';

// ── Local Reducer ───────────────────────────────────────────

type LocalAction =
  | { type: 'RESTORE'; state: ShitheadGameState }
  | { type: 'SET_STATE'; state: ShitheadGameState };

const INITIAL: ShitheadGameState = {
  phase: 'waiting',
  players: [],
  drawPile: [],
  pile: [],
  burned: [],
  currentTurn: null,
  turnOrder: [],
  direction: 1,
  shithead: null,
  winner: null,
  finishOrder: [],
  lastMessage: null,
  lastActionTime: 0,
};

function reducer(_state: ShitheadGameState, action: LocalAction): ShitheadGameState {
  switch (action.type) {
    case 'RESTORE':
    case 'SET_STATE':
      return action.state;
    default:
      return _state;
  }
}

// ── Hook ────────────────────────────────────────────────────

export function useShitheadGame() {
  const [gameState, localDispatch] = useReducer(reducer, INITIAL);
  const {
    lastAction,
    sharedGameState,
    isHost,
    mySocketId,
    players: mpPlayers,
    isInRoom,
  } = useMultiplayerState();
  const {
    sendAction,
    setState: mpSetState,
    endTurn,
    endGame: mpEndGame,
  } = useMultiplayerActions();

  // Refs for latest values — prevents stale closure bugs in effects
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // Start as null so the first mount processes whatever lastAction exists
  const lastProcessedRef = useRef<typeof lastAction>(null);

  // Guard: only restore from sharedGameState once (on mount / reconnect)
  const restoredRef = useRef(false);

  // Guard: prevent double-dealing
  const dealtRef = useRef(false);

  // ── React to multiplayer actions ─────────────────────────

  useEffect(() => {
    if (!lastAction || lastAction === lastProcessedRef.current) return;
    lastProcessedRef.current = lastAction;

    const fromMe = lastAction.senderSocketId === mySocketId;

    switch (lastAction.action) {
      // ── Full-state actions (always carry the authoritative state) ─

      case 'DEAL': {
        // Always apply DEAL — even from self (host may have re-mounted)
        const gs = deserializeState(lastAction.data.gameState as unknown as SerializedGameState);
        localDispatch({ type: 'SET_STATE', state: gs });
        break;
      }

      case 'SYNC_STATE':
      case 'START_GAME':
      case 'PLAY_CARDS':
      case 'PICK_UP_PILE': {
        // Skip our own — we already applied locally before broadcasting
        if (fromMe) break;
        if (lastAction.data.gameState) {
          const gs = deserializeState(lastAction.data.gameState as unknown as SerializedGameState);
          localDispatch({ type: 'SET_STATE', state: gs });
        }
        break;
      }

      // ── Delta action (swap is per-player, independent) ──────────

      case 'SWAP_CARDS': {
        if (fromMe) break; // Already applied locally
        const { socketId, handIndex, faceUpIndex } = lastAction.data as {
          socketId: string;
          handIndex: number;
          faceUpIndex: number;
        };
        // Use the ref to always get the latest state (no stale closure)
        const current = gameStateRef.current;
        localDispatch({
          type: 'SET_STATE',
          state: swapCards(current, socketId, handIndex, faceUpIndex),
        });
        break;
      }

      case 'REDRAW_HAND': {
        // Redraw carries full state since it modifies the draw pile
        if (fromMe) break;
        if (lastAction.data.gameState) {
          const gs = deserializeState(lastAction.data.gameState as unknown as SerializedGameState);
          localDispatch({ type: 'SET_STATE', state: gs });
        }
        break;
      }
    }
  }, [lastAction, mySocketId]);

  // ── Restore from shared state on mount / reconnect ────────

  useEffect(() => {
    if (restoredRef.current) return;
    if (sharedGameState && (sharedGameState as Record<string, unknown>).phase) {
      const gs = deserializeState(sharedGameState as unknown as SerializedGameState);
      localDispatch({ type: 'RESTORE', state: gs });
      restoredRef.current = true;
    }
  }, [sharedGameState]);

  // ── Host: Deal cards when game starts ─────────────────────

  const deal = useCallback(() => {
    if (!isHost || dealtRef.current) return;
    dealtRef.current = true;

    const playerInfos = mpPlayers.map((p) => ({
      socketId: p.socketId,
      displayName: p.displayName,
      playerNumber: p.playerNumber,
      isHost: p.isHost,
    }));

    const newState = dealCards(playerInfos);
    const serialized = serializeState(newState);

    // Broadcast the dealt state to all players
    sendAction('DEAL', { gameState: serialized as unknown as Record<string, unknown> });
    mpSetState(serialized as unknown as Record<string, unknown>);
    localDispatch({ type: 'SET_STATE', state: newState });
  }, [isHost, mpPlayers, sendAction, mpSetState]);

  // ── Player actions ────────────────────────────────────────

  const doSwapCards = useCallback(
    (handIndex: number, faceUpIndex: number) => {
      if (!mySocketId || gameState.phase !== 'swapping') return;

      // Apply locally immediately
      const newState = swapCards(gameState, mySocketId, handIndex, faceUpIndex);
      localDispatch({ type: 'SET_STATE', state: newState });

      // Delta broadcast — other players apply the swap individually
      sendAction('SWAP_CARDS', { socketId: mySocketId, handIndex, faceUpIndex });
    },
    [mySocketId, gameState, sendAction],
  );

  const doRedrawHand = useCallback(() => {
    if (!mySocketId || gameState.phase !== 'swapping') return;

    const newState = redrawHand(gameState, mySocketId);
    localDispatch({ type: 'SET_STATE', state: newState });

    // Full-state sync because draw pile changes
    const serialized = serializeState(newState);
    sendAction('REDRAW_HAND', {
      socketId: mySocketId,
      gameState: serialized as unknown as Record<string, unknown>,
    });
    mpSetState(serialized as unknown as Record<string, unknown>);
  }, [mySocketId, gameState, sendAction, mpSetState]);

  const doStartGame = useCallback(() => {
    if (!isHost) return;

    const newState = startPlaying(gameState);
    localDispatch({ type: 'SET_STATE', state: newState });

    // Full-state sync — all players transition to 'playing'
    const serialized = serializeState(newState);
    sendAction('START_GAME', { gameState: serialized as unknown as Record<string, unknown> });
    mpSetState(serialized as unknown as Record<string, unknown>);

    // Tell the platform whose turn it is
    if (newState.currentTurn) {
      endTurn(newState.currentTurn);
    }
  }, [isHost, gameState, sendAction, mpSetState, endTurn]);

  const doPlayCards = useCallback(
    (cardIds: string[]) => {
      if (!mySocketId || gameState.currentTurn !== mySocketId) return;

      const result = playCards(gameState, mySocketId, cardIds);
      if (!result.success) return;

      localDispatch({ type: 'SET_STATE', state: result.state });

      // Broadcast FULL state — every player converges
      const serialized = serializeState(result.state);
      sendAction('PLAY_CARDS', {
        socketId: mySocketId,
        cardIds,
        gameState: serialized as unknown as Record<string, unknown>,
      });
      mpSetState(serialized as unknown as Record<string, unknown>);

      // Notify platform of the turn change
      if (result.state.currentTurn && result.state.currentTurn !== mySocketId) {
        endTurn(result.state.currentTurn);
      }

      // Check game over
      if (result.state.phase === 'finished') {
        mpEndGame();
      }
    },
    [mySocketId, gameState, sendAction, endTurn, mpSetState, mpEndGame],
  );

  const doPickUpPile = useCallback(() => {
    if (!mySocketId || gameState.currentTurn !== mySocketId) return;

    const result = pickUpPile(gameState, mySocketId);
    if (!result.success) return;

    localDispatch({ type: 'SET_STATE', state: result.state });

    // Broadcast FULL state
    const serialized = serializeState(result.state);
    sendAction('PICK_UP_PILE', {
      socketId: mySocketId,
      gameState: serialized as unknown as Record<string, unknown>,
    });
    mpSetState(serialized as unknown as Record<string, unknown>);

    // Notify platform of the turn change
    if (result.state.currentTurn) {
      endTurn(result.state.currentTurn);
    }
  }, [mySocketId, gameState, sendAction, endTurn, mpSetState]);

  // ── Derived state ─────────────────────────────────────────

  const myPlayer = gameState.players.find((p) => p.socketId === mySocketId) ?? null;
  const myZone = myPlayer ? getPlayerPlayableZone(myPlayer) : null;
  const canPlay = mySocketId ? hasPlayableCard(gameState, mySocketId) : false;
  const isMyGameTurn = gameState.currentTurn === mySocketId;

  return {
    gameState,
    myPlayer,
    mySocketId,
    isHost,
    isInRoom,
    isMyTurn: isMyGameTurn,
    myZone,
    canPlay,

    // Actions
    deal,
    doSwapCards,
    doRedrawHand,
    doStartGame,
    doPlayCards,
    doPickUpPile,
  };
}
