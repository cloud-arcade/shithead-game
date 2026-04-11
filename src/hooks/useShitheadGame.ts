/**
 * useShitheadGame — Game state hook for Shithead card game.
 *
 * Connects the pure game engine to the multiplayer transport layer.
 *
 * Architecture:
 * - Turn-based actions carry FULL resulting state for convergence.
 * - Swap-phase actions are delta-based (independent, commutative).
 * - Turn timer: 30s per turn, auto-plays on timeout.
 * - AFK detection: 3 consecutive timeouts = auto-forfeit.
 * - Disconnect guard: 30s grace period for disconnected players.
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
  endPlayerTurn,
  autoPlayForTimeout,
  forfeitPlayer,
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
  turnStartTime: 0,
  consecutiveTimeouts: {},
  turnPlayedRank: null,
  goAgain: false,
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
      case 'PICK_UP_PILE':
      case 'END_TURN':
      case 'PLAYER_TIMEOUT':
      case 'PLAYER_FORFEIT': {
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

  // ── End Turn Explicitly ────────────────────────────────────

  const doEndTurn = useCallback(() => {
    if (!mySocketId || gameState.currentTurn !== mySocketId || gameState.phase !== 'playing') return;

    const result = endPlayerTurn(gameState, mySocketId);
    if (!result.success) return;

    localDispatch({ type: 'SET_STATE', state: result.state });

    // Broadcast FULL state
    const serialized = serializeState(result.state);
    sendAction('END_TURN', {
      socketId: mySocketId,
      gameState: serialized as unknown as Record<string, unknown>,
    });
    mpSetState(serialized as unknown as Record<string, unknown>);

    // Notify platform of the turn change
    if (result.state.currentTurn) {
      endTurn(result.state.currentTurn);
    }
  }, [mySocketId, gameState, sendAction, endTurn, mpSetState]);

  // ── Auto-play on timeout (called by turn timer) ───────────

  const doAutoPlay = useCallback(() => {
    if (!mySocketId || gameState.currentTurn !== mySocketId || gameState.phase !== 'playing') return;

    const result = autoPlayForTimeout(gameState, mySocketId);
    if (!result.success) return;

    // Increment consecutive timeout counter
    let newState = result.state;
    const timeouts = { ...(newState.consecutiveTimeouts || {}) };
    timeouts[mySocketId] = (timeouts[mySocketId] || 0) + 1;
    newState = { ...newState, consecutiveTimeouts: timeouts };

    // Adjust last message
    const playerName = newState.players.find((p) => p.socketId === mySocketId)?.displayName ?? 'Player';
    newState = {
      ...newState,
      lastMessage: `⏰ ${playerName} ran out of time! Auto-played. (${timeouts[mySocketId]}/3 warnings)`,
    };

    localDispatch({ type: 'SET_STATE', state: newState });
    const serialized = serializeState(newState);
    sendAction('PLAYER_TIMEOUT', {
      socketId: mySocketId,
      gameState: serialized as unknown as Record<string, unknown>,
    });
    mpSetState(serialized as unknown as Record<string, unknown>);

    // 3 consecutive timeouts → auto-forfeit
    if (timeouts[mySocketId] >= 3) {
      // Small delay so the timeout state syncs first
      setTimeout(() => {
        const currentGS = gameStateRef.current;
        const forfeitState = forfeitPlayer(currentGS, mySocketId);
        localDispatch({ type: 'SET_STATE', state: forfeitState });
        const fSerialized = serializeState(forfeitState);
        sendAction('PLAYER_FORFEIT', {
          socketId: mySocketId,
          gameState: fSerialized as unknown as Record<string, unknown>,
        });
        mpSetState(fSerialized as unknown as Record<string, unknown>);
        if (forfeitState.phase === 'finished') mpEndGame();
      }, 1000);
    } else if (newState.currentTurn && newState.currentTurn !== mySocketId) {
      endTurn(newState.currentTurn);
    }
  }, [mySocketId, gameState, sendAction, mpSetState, endTurn, mpEndGame]);

  // ── Forfeit a disconnected player (called by disconnect guard) ─

  const doForfeitPlayer = useCallback(
    (socketId: string) => {
      if (gameState.phase !== 'playing') return;
      const newState = forfeitPlayer(gameState, socketId);
      localDispatch({ type: 'SET_STATE', state: newState });
      const serialized = serializeState(newState);
      sendAction('PLAYER_FORFEIT', {
        socketId,
        gameState: serialized as unknown as Record<string, unknown>,
      });
      mpSetState(serialized as unknown as Record<string, unknown>);
      if (newState.phase === 'finished') mpEndGame();
      else if (newState.currentTurn) endTurn(newState.currentTurn);
    },
    [gameState, sendAction, mpSetState, endTurn, mpEndGame],
  );

  // ── Restore from session storage (fallback) ───────────────

  const restoreFromSession = useCallback(
    (savedState: ShitheadGameState) => {
      localDispatch({ type: 'RESTORE', state: savedState });
      restoredRef.current = true;
      const serialized = serializeState(savedState);
      mpSetState(serialized as unknown as Record<string, unknown>);
    },
    [mpSetState],
  );

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
    doEndTurn,
    doAutoPlay,
    doForfeitPlayer,
    restoreFromSession,
  };
}
