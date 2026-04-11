/**
 * useTestMode — Local-only dev mode that simulates multiplayer.
 *
 * Activated by VITE_TEST_MODE=true in .env.local (which is gitignored).
 * Creates a fake 2-player room so you can test the full gameplay loop
 * without the CloudArcade platform. Includes a simple AI opponent.
 *
 * How it works:
 *   1. On mount, dispatches a fake MP_SET_ROOM with 2 players into context.
 *   2. Intercepts outgoing postMessages (MP_SEND_ACTION, MP_END_TURN, MP_SET_STATE)
 *      and re-dispatches them as the corresponding incoming context actions.
 *   3. When it's the AI opponent's turn, computes a move via engine functions
 *      after a realistic delay and dispatches the result.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useMultiplayerContext } from '../context/MultiplayerContext';
import {
  playCards,
  pickUpPile,
  endPlayerTurn,
  canPlayOnPile,
  getRankValue,
  serializeState,
  deserializeState,
} from '../game/engine';
import type { ShitheadGameState, SerializedGameState, Card } from '../game/types';
import type { RoomSnapshot, RoomPlayer } from '../types';

// ── Constants ───────────────────────────────────────────────

export const TEST_MODE_ENABLED = import.meta.env.VITE_TEST_MODE === 'true';

const MY_SOCKET = 'test-player-me';
const AI_SOCKET = 'test-player-ai';

const MY_PLAYER: RoomPlayer = {
  socketId: MY_SOCKET,
  userId: 'test-user-1',
  displayName: 'You',
  playerNumber: 1,
  status: 'playing',
  isHost: true,
  meta: {},
};

const AI_PLAYER: RoomPlayer = {
  socketId: AI_SOCKET,
  userId: 'test-user-2',
  displayName: 'CPU Opponent',
  playerNumber: 2,
  status: 'playing',
  isHost: false,
  meta: {},
};

function createFakeRoom(status: RoomSnapshot['status'] = 'in_progress'): RoomSnapshot {
  return {
    roomId: 'test-room-local',
    inviteCode: 'TEST',
    gameId: 'shithead',
    gameName: 'Shithead',
    status,
    hostSocketId: MY_SOCKET,
    players: [MY_PLAYER, AI_PLAYER],
    turnOrder: [MY_SOCKET, AI_SOCKET],
    currentTurn: MY_SOCKET,
    gameState: {},
    minPlayers: 2,
    maxPlayers: 4,
  };
}

// ── AI Logic ────────────────────────────────────────────────

/**
 * Simple AI strategy:
 *  1. Find playable zone (hand > faceUp > faceDown)
 *  2. Gather all playable cards for the current pile
 *  3. Group by rank, pick the lowest group, play all of that rank
 *  4. If nothing is playable, pick up the pile
 */
function computeAIPlay(
  state: ShitheadGameState,
): { action: 'PLAY_CARDS'; cardIds: string[] } | { action: 'PICK_UP_PILE' } {
  const player = state.players.find((p) => p.socketId === AI_SOCKET);
  if (!player) return { action: 'PICK_UP_PILE' };

  // Determine zone
  const zones: Array<{ type: 'hand' | 'faceUp' | 'faceDown'; cards: Card[] }> = [];
  if (player.cards.hand.length > 0) zones.push({ type: 'hand', cards: player.cards.hand });
  else if (player.cards.faceUp.length > 0) zones.push({ type: 'faceUp', cards: player.cards.faceUp });
  else if (player.cards.faceDown.length > 0) zones.push({ type: 'faceDown', cards: player.cards.faceDown });

  if (zones.length === 0) return { action: 'PICK_UP_PILE' };

  const zone = zones[0];

  // Face-down: play random card (we can't see it)
  if (zone.type === 'faceDown') {
    const randIdx = Math.floor(Math.random() * zone.cards.length);
    return { action: 'PLAY_CARDS', cardIds: [zone.cards[randIdx].id] };
  }

  // Find playable cards sorted by value ascending
  const playable = zone.cards
    .filter((c) => canPlayOnPile(c, state.pile))
    .sort((a, b) => getRankValue(a.rank) - getRankValue(b.rank));

  if (playable.length === 0) return { action: 'PICK_UP_PILE' };

  // Play all playable cards of the lowest rank (multi-play)
  const lowestRank = playable[0].rank;
  const group = playable.filter((c) => c.rank === lowestRank);
  return { action: 'PLAY_CARDS', cardIds: group.map((c) => c.id) };
}

// ── Hook ────────────────────────────────────────────────────

export function useTestMode() {
  const { dispatch } = useMultiplayerContext();

  // Store the latest serialized game state so the AI can read it
  const latestStateRef = useRef<Record<string, unknown> | null>(null);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // ── Cleanup ─────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, []);

  // ── 1. Seed fake room on mount ──────────────────────────

  useEffect(() => {
    if (!TEST_MODE_ENABLED) return;

    console.log(
      '%c[TEST MODE] %cActive — fake multiplayer room injected',
      'color: #facc15; font-weight: bold;',
      'color: #a3a3a3;',
    );

    const room = createFakeRoom();

    dispatch({
      type: 'MP_SET_ROOM',
      payload: {
        room,
        mySocketId: MY_SOCKET,
        isHost: true,
        isMyTurn: true,
      },
    });
  }, [dispatch]);

  // ── AI play helper ──────────────────────────────────────

  const scheduleAIPlay = useCallback(() => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);

    // Random delay 1–3s so it feels like a real opponent thinking
    const delay = 1000 + Math.random() * 2000;

    aiTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;

      const stored = latestStateRef.current;
      if (!stored) return;

      const gs = deserializeState(stored as unknown as SerializedGameState);

      // Verify it's actually the AI's turn and we're in playing phase
      if (gs.phase !== 'playing' || gs.currentTurn !== AI_SOCKET) return;

      const decision = computeAIPlay(gs);
      let resultState: ShitheadGameState;
      let success: boolean;

      if (decision.action === 'PLAY_CARDS') {
        const result = playCards(gs, AI_SOCKET, decision.cardIds);
        resultState = result.state;
        success = result.success;
        if (!success) {
          // Fallback: pick up pile (pickUpPile already ends turn)
          const fallback = pickUpPile(gs, AI_SOCKET);
          resultState = fallback.state;
          success = fallback.success;
        } else {
          // Check if goAgain is active (5, 10/burn) — AI gets another go
          if (!resultState.goAgain) {
            // Normal play: end the turn
            const endResult = endPlayerTurn(resultState, AI_SOCKET);
            if (endResult.success) {
              resultState = endResult.state;
            }
          }
        }
      } else {
        // Pick up pile (already ends turn)
        const result = pickUpPile(gs, AI_SOCKET);
        resultState = result.state;
        success = result.success;
      }

      if (!success || !mountedRef.current) return;

      const serialized = serializeState(resultState);
      latestStateRef.current = serialized as unknown as Record<string, unknown>;

      // Dispatch the action as if it came from the AI player
      dispatch({
        type: 'MP_ACTION',
        payload: {
          action: decision.action === 'PLAY_CARDS' ? 'PLAY_CARDS' : 'PICK_UP_PILE',
          data: {
            socketId: AI_SOCKET,
            gameState: serialized as unknown as Record<string, unknown>,
          },
          senderSocketId: AI_SOCKET,
        },
      });

      // Update shared game state
      dispatch({
        type: 'MP_STATE_UPDATE',
        payload: { gameState: serialized as unknown as Record<string, unknown> },
      });

      // Update turn
      if (resultState.currentTurn) {
        dispatch({
          type: 'MP_TURN_CHANGED',
          payload: {
            currentTurn: resultState.currentTurn,
            isMyTurn: resultState.currentTurn === MY_SOCKET,
            turnOrder: resultState.turnOrder,
          },
        });
      }

      // If it's still the AI's turn (burn gives another turn), play again
      if (resultState.currentTurn === AI_SOCKET && resultState.phase === 'playing') {
        scheduleAIPlay();
      }
    }, delay);
  }, [dispatch]);

  // ── 2. Intercept outgoing postMessages ──────────────────

  useEffect(() => {
    if (!TEST_MODE_ENABLED) return;

    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') return;

      switch (msg.type) {
        // ── MP_SEND_ACTION → re-dispatch as MP_ACTION from me ─
        case 'MP_SEND_ACTION': {
          const { action, data } = msg.payload as { action: string; data: Record<string, unknown> };

          dispatch({
            type: 'MP_ACTION',
            payload: {
              action,
              data,
              senderSocketId: MY_SOCKET,
            },
          });
          break;
        }

        // ── MP_SET_STATE → re-dispatch as MP_STATE_UPDATE ─────
        case 'MP_SET_STATE': {
          const gameState = (msg.payload as { state: Record<string, unknown> }).state;
          latestStateRef.current = gameState;

          dispatch({
            type: 'MP_STATE_UPDATE',
            payload: { gameState },
          });
          break;
        }

        // ── MP_END_TURN → re-dispatch as MP_TURN_CHANGED ─────
        case 'MP_END_TURN': {
          const nextPlayer =
            (msg.payload as { nextPlayerSocketId?: string }).nextPlayerSocketId ?? AI_SOCKET;
          const isMyTurn = nextPlayer === MY_SOCKET;

          dispatch({
            type: 'MP_TURN_CHANGED',
            payload: {
              currentTurn: nextPlayer,
              isMyTurn,
              turnOrder: [MY_SOCKET, AI_SOCKET],
            },
          });

          // If it's the AI's turn, schedule a play
          if (nextPlayer === AI_SOCKET) {
            scheduleAIPlay();
          }
          break;
        }

        // ── MP_END_GAME → re-dispatch as MP_GAME_ENDED ───────
        case 'MP_END_GAME': {
          const stored = latestStateRef.current;
          const room = createFakeRoom('ended');
          if (stored) {
            room.gameState = stored;
          }

          dispatch({
            type: 'MP_GAME_ENDED',
            payload: { room },
          });
          break;
        }

        // Ignore others (MP_REQUEST_STATE, MP_UPDATE_META, etc.)
        default:
          break;
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [dispatch, scheduleAIPlay]);

  return { isTestMode: TEST_MODE_ENABLED, mySocketId: MY_SOCKET, aiSocketId: AI_SOCKET };
}
