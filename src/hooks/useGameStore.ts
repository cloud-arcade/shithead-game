/**
 * useGameStore — Local game state that reacts to multiplayer actions.
 *
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  HOW MULTIPLAYER DATA FLOWS (no DB required)                    ║
 * ║                                                                 ║
 * ║  1. Player makes a move → sendAction('PLACE_PIECE', {x,y})     ║
 * ║  2. The parent (Cloud Arcade) relays it via Socket.IO           ║
 * ║     to every player in the room.                                ║
 * ║  3. Every player's iframe receives MP_ACTION with the same      ║
 * ║     payload → dispatched into MultiplayerContext.               ║
 * ║  4. This hook watches `lastAction` from that context and        ║
 * ║     applies it to the local game board / state.                 ║
 * ║                                                                 ║
 * ║  Each client keeps its OWN copy of the game board in memory.    ║
 * ║  Because every client receives the same ordered stream of       ║
 * ║  actions, all boards stay in sync — no database needed.         ║
 * ║                                                                 ║
 * ║  For extra safety the host can periodically call                ║
 * ║    setState(fullBoardState)                                     ║
 * ║  which broadcasts MP_STATE_UPDATE → `sharedGameState` in the    ║
 * ║  context, giving every client an authoritative snapshot.        ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * USAGE (in your game component):
 *   const { board, applyAction } = useGameStore();
 *
 * DELETE / replace this file with your real game logic.
 * It exists purely as a reference implementation.
 */

import { useReducer, useEffect, useCallback } from 'react';
import { useMultiplayerState } from '../context/MultiplayerContext';
import { useMultiplayerActions } from './useMultiplayer';

// ── Example: Tic-Tac-Toe board state ─────────────────────────

export interface GameStoreState {
  board: (string | null)[];
  winner: string | null;
  isDraw: boolean;
}

type GameStoreAction =
  | { type: 'PLACE_PIECE'; index: number; symbol: string }
  | { type: 'RESET'; board?: (string | null)[] }
  | { type: 'RESTORE'; state: GameStoreState };

const INITIAL_STATE: GameStoreState = {
  board: Array(9).fill(null),
  winner: null,
  isDraw: false,
};

function checkWinner(board: (string | null)[]): string | null {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

function gameStoreReducer(state: GameStoreState, action: GameStoreAction): GameStoreState {
  switch (action.type) {
    case 'PLACE_PIECE': {
      if (state.board[action.index] !== null || state.winner) return state;
      const board = [...state.board];
      board[action.index] = action.symbol;
      const winner = checkWinner(board);
      const isDraw = !winner && board.every((c) => c !== null);
      return { board, winner, isDraw };
    }
    case 'RESET':
      return { ...INITIAL_STATE, board: action.board ?? Array(9).fill(null) };
    case 'RESTORE':
      return action.state;
    default:
      return state;
  }
}

// ── Hook ─────────────────────────────────────────────────────

export function useGameStore() {
  const [state, localDispatch] = useReducer(gameStoreReducer, INITIAL_STATE);
  const { lastAction, sharedGameState, isHost, mySocketId } = useMultiplayerState();
  const { sendAction, setState: mpSetState, endTurn, endGame } = useMultiplayerActions();

  // ── React to incoming actions from ALL players ─────────────
  useEffect(() => {
    if (!lastAction) return;

    switch (lastAction.action) {
      case 'PLACE_PIECE':
        localDispatch({
          type: 'PLACE_PIECE',
          index: lastAction.data.index as number,
          symbol: lastAction.data.symbol as string,
        });
        break;
      case 'RESET':
        localDispatch({ type: 'RESET' });
        break;
    }
  }, [lastAction]);

  // ── Restore from shared state on reconnect ─────────────────
  useEffect(() => {
    if (sharedGameState?.board) {
      localDispatch({
        type: 'RESTORE',
        state: sharedGameState as unknown as GameStoreState,
      });
    }
  }, [sharedGameState]);

  // ── Convenience methods for the game component ─────────────

  /** Make a move — sends it to ALL players (including yourself). */
  const makeMove = useCallback(
    (index: number, symbol: string) => {
      sendAction('PLACE_PIECE', { index, symbol });

      // End turn automatically
      endTurn();

      // Host syncs authoritative state
      if (isHost) {
        const next = [...state.board];
        next[index] = symbol;
        const winner = checkWinner(next);
        const isDraw = !winner && next.every((c) => c !== null);
        mpSetState({ board: next, winner, isDraw });

        if (winner || isDraw) {
          endGame();
        }
      }
    },
    [sendAction, endTurn, mpSetState, endGame, isHost, state.board],
  );

  const resetBoard = useCallback(() => {
    sendAction('RESET', {});
  }, [sendAction]);

  return {
    ...state,
    makeMove,
    resetBoard,
    mySocketId,
    isHost,
  };
}
