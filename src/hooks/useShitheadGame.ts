/**
 * useShitheadGame — Game state hook for Shithead card game.
 *
 * Connects the pure game engine to the multiplayer transport layer.
 * Each player keeps a local copy of the full game state. Actions are
 * broadcast via the multiplayer postMessage bridge, and every client
 * applies them deterministically to stay in sync.
 */

import { useReducer, useEffect, useCallback, useRef } from 'react';
import { useMultiplayerState } from '../context/MultiplayerContext';
import { useMultiplayerActions } from '../hooks/useMultiplayer';
import {
  dealCards,
  swapCards,
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
  const lastActionRef = useRef(lastAction);

  // ── React to multiplayer actions ─────────────────────────

  useEffect(() => {
    if (!lastAction || lastAction === lastActionRef.current) return;
    lastActionRef.current = lastAction;

    switch (lastAction.action) {
      case 'DEAL': {
        const gs = deserializeState(lastAction.data.gameState as unknown as SerializedGameState);
        localDispatch({ type: 'SET_STATE', state: gs });
        break;
      }
      case 'SYNC_STATE': {
        const gs = deserializeState(lastAction.data.gameState as unknown as SerializedGameState);
        localDispatch({ type: 'SET_STATE', state: gs });
        break;
      }
      case 'SWAP_CARDS': {
        const { socketId, handIndex, faceUpIndex } = lastAction.data as {
          socketId: string;
          handIndex: number;
          faceUpIndex: number;
        };
        localDispatch({
          type: 'SET_STATE',
          state: swapCards(gameState, socketId, handIndex, faceUpIndex),
        });
        break;
      }
      case 'READY_TO_PLAY': {
        // If all ready messages received, start playing
        // The host controls this transition
        break;
      }
      case 'PLAY_CARDS': {
        const { socketId: sid, cardIds } = lastAction.data as {
          socketId: string;
          cardIds: string[];
        };
        const result = playCards(gameState, sid, cardIds);
        if (result.success) {
          localDispatch({ type: 'SET_STATE', state: result.state });
        }
        break;
      }
      case 'PICK_UP_PILE': {
        const { socketId: sid2 } = lastAction.data as { socketId: string };
        const result = pickUpPile(gameState, sid2);
        if (result.success) {
          localDispatch({ type: 'SET_STATE', state: result.state });
        }
        break;
      }
      case 'START_GAME': {
        localDispatch({ type: 'SET_STATE', state: startPlaying(gameState) });
        break;
      }
    }
  }, [lastAction]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Restore from shared state on reconnect ────────────────

  useEffect(() => {
    if (sharedGameState && (sharedGameState as Record<string, unknown>).phase) {
      const gs = deserializeState(sharedGameState as unknown as SerializedGameState);
      localDispatch({ type: 'RESTORE', state: gs });
    }
  }, [sharedGameState]);

  // ── Host: Deal cards when game starts ─────────────────────

  const deal = useCallback(() => {
    if (!isHost) return;

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
      sendAction('SWAP_CARDS', { socketId: mySocketId, handIndex, faceUpIndex });
      localDispatch({
        type: 'SET_STATE',
        state: swapCards(gameState, mySocketId, handIndex, faceUpIndex),
      });
    },
    [mySocketId, gameState, sendAction]
  );

  const doStartGame = useCallback(() => {
    if (!isHost) return;
    sendAction('START_GAME', {});
    const newState = startPlaying(gameState);
    localDispatch({ type: 'SET_STATE', state: newState });

    // Sync state for all
    const serialized = serializeState(newState);
    mpSetState(serialized as unknown as Record<string, unknown>);
  }, [isHost, gameState, sendAction, mpSetState]);

  const doPlayCards = useCallback(
    (cardIds: string[]) => {
      if (!mySocketId || gameState.currentTurn !== mySocketId) return;

      const result = playCards(gameState, mySocketId, cardIds);
      if (!result.success) return;

      sendAction('PLAY_CARDS', { socketId: mySocketId, cardIds });
      localDispatch({ type: 'SET_STATE', state: result.state });

      // Sync state from host side
      if (isHost) {
        const serialized = serializeState(result.state);
        mpSetState(serialized as unknown as Record<string, unknown>);
      }

      // End turn via multiplayer bridge
      if (result.state.currentTurn !== mySocketId) {
        endTurn(result.state.currentTurn ?? undefined);
      }

      // Check game over
      if (result.state.phase === 'finished') {
        mpEndGame();
      }
    },
    [mySocketId, gameState, sendAction, endTurn, isHost, mpSetState, mpEndGame]
  );

  const doPickUpPile = useCallback(() => {
    if (!mySocketId || gameState.currentTurn !== mySocketId) return;

    const result = pickUpPile(gameState, mySocketId);
    if (!result.success) return;

    sendAction('PICK_UP_PILE', { socketId: mySocketId });
    localDispatch({ type: 'SET_STATE', state: result.state });

    if (isHost) {
      const serialized = serializeState(result.state);
      mpSetState(serialized as unknown as Record<string, unknown>);
    }

    endTurn(result.state.currentTurn ?? undefined);
  }, [mySocketId, gameState, sendAction, endTurn, isHost, mpSetState]);

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
    doStartGame,
    doPlayCards,
    doPickUpPile,
  };
}
