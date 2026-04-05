/**
 * Multiplayer Context
 * Reactive state for the multiplayer room, players, turns, etc.
 *
 * This context handles the TRANSPORT layer — room membership, turns, and
 * the raw action stream.  Your actual game state (board, scores, etc.)
 * should live in a separate store (see useGameStore.ts for a pattern).
 *
 * Pairs with the useMultiplayer hook which wires the postMessage events.
 */

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import type { RoomSnapshot, RoomPlayer } from '@/types';

// ── State ───────────────────────────────────────────────────

export interface MultiplayerState {
  /** Whether a multiplayer room is active. */
  isInRoom: boolean;
  /** My socket ID assigned by the server. */
  mySocketId: string | null;
  /** Whether I am the room host. */
  isHost: boolean;
  /** Whether it is currently my turn. */
  isMyTurn: boolean;
  /** The full room snapshot (null until first MP_ROOM_STATE / MP_GAME_STARTED). */
  room: RoomSnapshot | null;
  /** Room status shorthand: 'waiting' | 'in_progress' | 'ended' | null */
  roomStatus: RoomSnapshot['status'] | null;
  /** Convenience: player list from the room. */
  players: RoomPlayer[];
  /** My player info (derived from players + mySocketId). */
  myPlayer: RoomPlayer | null;
  /** Current turn socket ID. */
  currentTurn: string | null;
  /** Ordered turn list. */
  turnOrder: string[];
  /** Shared game state set via MP_SET_STATE. */
  sharedGameState: Record<string, unknown>;
  /** Most recently received action (for reactive consumers). */
  lastAction: { action: string; data: Record<string, unknown>; senderSocketId: string } | null;
  /** Rolling list of received actions (capped at 50). */
  actionHistory: { action: string; data: Record<string, unknown>; senderSocketId: string }[];
  /** Last error received. */
  lastError: { code: string; message: string } | null;
}

const MAX_ACTION_HISTORY = 50;

const initialState: MultiplayerState = {
  isInRoom: false,
  mySocketId: null,
  isHost: false,
  isMyTurn: false,
  room: null,
  roomStatus: null,
  players: [],
  myPlayer: null,
  currentTurn: null,
  turnOrder: [],
  sharedGameState: {},
  lastAction: null,
  actionHistory: [],
  lastError: null,
};

// ── Actions ─────────────────────────────────────────────────

type MultiplayerAction =
  | { type: 'MP_SET_ROOM'; payload: { room: RoomSnapshot; mySocketId: string; isHost: boolean; isMyTurn: boolean } }
  | { type: 'MP_GAME_STARTED'; payload: { room: RoomSnapshot; mySocketId: string; isHost: boolean; isMyTurn: boolean } }
  | { type: 'MP_GAME_ENDED'; payload: { room: RoomSnapshot } }
  | { type: 'MP_ACTION'; payload: { action: string; data: Record<string, unknown>; senderSocketId: string } }
  | { type: 'MP_STATE_UPDATE'; payload: { gameState: Record<string, unknown> } }
  | { type: 'MP_TURN_CHANGED'; payload: { currentTurn: string; isMyTurn: boolean; turnOrder: string[] } }
  | { type: 'MP_ERROR'; payload: { code: string; message: string } }
  | { type: 'MP_RESET' };

// ── Helpers ─────────────────────────────────────────────────

function deriveMyPlayer(players: RoomPlayer[], socketId: string | null): RoomPlayer | null {
  if (!socketId) return null;
  return players.find((p) => p.socketId === socketId) ?? null;
}

// ── Reducer ─────────────────────────────────────────────────

function multiplayerReducer(state: MultiplayerState, action: MultiplayerAction): MultiplayerState {
  switch (action.type) {
    case 'MP_SET_ROOM':
    case 'MP_GAME_STARTED': {
      const { room, mySocketId, isHost, isMyTurn } = action.payload;
      const players = room.players;
      return {
        ...state,
        isInRoom: true,
        mySocketId,
        isHost,
        isMyTurn,
        room,
        roomStatus: room.status,
        players,
        myPlayer: deriveMyPlayer(players, mySocketId),
        currentTurn: room.currentTurn,
        turnOrder: room.turnOrder,
        sharedGameState: room.gameState ?? {},
        lastError: null,
      };
    }

    case 'MP_GAME_ENDED': {
      const { room } = action.payload;
      return {
        ...state,
        isMyTurn: false,
        room,
        roomStatus: room.status,
        players: room.players,
        myPlayer: deriveMyPlayer(room.players, state.mySocketId),
      };
    }

    case 'MP_ACTION': {
      const history = [...state.actionHistory, action.payload].slice(-MAX_ACTION_HISTORY);
      return {
        ...state,
        lastAction: action.payload,
        actionHistory: history,
      };
    }

    case 'MP_STATE_UPDATE':
      return {
        ...state,
        sharedGameState: action.payload.gameState,
      };

    case 'MP_TURN_CHANGED':
      return {
        ...state,
        currentTurn: action.payload.currentTurn,
        isMyTurn: action.payload.isMyTurn,
        turnOrder: action.payload.turnOrder,
      };

    case 'MP_ERROR':
      return {
        ...state,
        lastError: action.payload,
      };

    case 'MP_RESET':
      return initialState;

    default:
      return state;
  }
}

// ── Context ─────────────────────────────────────────────────

const MultiplayerContext = createContext<{
  state: MultiplayerState;
  dispatch: React.Dispatch<MultiplayerAction>;
} | null>(null);

export function MultiplayerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(multiplayerReducer, initialState);

  return (
    <MultiplayerContext.Provider value={{ state, dispatch }}>
      {children}
    </MultiplayerContext.Provider>
  );
}

export function useMultiplayerContext() {
  const ctx = useContext(MultiplayerContext);
  if (!ctx) {
    throw new Error('useMultiplayerContext must be used within a MultiplayerProvider');
  }
  return ctx;
}

/** Convenience: just the state. */
export function useMultiplayerState(): MultiplayerState {
  return useMultiplayerContext().state;
}
