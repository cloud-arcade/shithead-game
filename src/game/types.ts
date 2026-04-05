/**
 * Shithead Card Game — Type Definitions
 */

// ── Card Types ──────────────────────────────────────────────

export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  /** Unique id for React keys, e.g. "hearts-7" */
  id: string;
}

// ── Player Types ────────────────────────────────────────────

export interface PlayerHand {
  /** Cards in the player's hand (visible only to them) */
  hand: Card[];
  /** Face-up cards on the table (visible to all) */
  faceUp: Card[];
  /** Face-down cards on the table (hidden from all, even the player) */
  faceDown: Card[];
}

export interface Player {
  socketId: string;
  displayName: string;
  playerNumber: number;
  isHost: boolean;
  /** Card state for this player */
  cards: PlayerHand;
  /** Has this player finished (no cards left)? */
  isFinished: boolean;
  /** Finishing position (1 = first out, etc.) — null if still playing */
  finishPosition: number | null;
}

// ── Game State ──────────────────────────────────────────────

export type GamePhase =
  | 'waiting'       // Waiting for players / lobby
  | 'swapping'      // Pre-game: players can swap hand ↔ face-up cards
  | 'playing'       // Main gameplay
  | 'finished';     // Game over — shithead determined

export interface ShitheadGameState {
  phase: GamePhase;
  players: Player[];
  /** The draw pile */
  drawPile: Card[];
  /** The discard/play pile (last card is on top) */
  pile: Card[];
  /** The burn pile (removed from game via 10 or four-of-a-kind) */
  burned: Card[];
  /** Socket ID of whose turn it is */
  currentTurn: string | null;
  /** Turn order (socket IDs) — only active (non-finished) players */
  turnOrder: string[];
  /** Direction: 1 = clockwise, -1 = counter-clockwise (for skip logic) */
  direction: 1 | -1;
  /** The socket ID of the player who is the "Shithead" (last player) */
  shithead: string | null;
  /** Winner (first to finish) */
  winner: string | null;
  /** Finishing order of socket IDs */
  finishOrder: string[];
  /** Message to show (e.g. "Player X picked up the pile!") */
  lastMessage: string | null;
  /** Timestamp of last action for animation timing */
  lastActionTime: number;
}

// ── Game Actions (sent via multiplayer) ─────────────────────

export type ShitheadAction =
  | { action: 'DEAL'; data: { gameState: SerializedGameState } }
  | { action: 'SWAP_CARDS'; data: { handIndex: number; faceUpIndex: number } }
  | { action: 'REDRAW_HAND'; data: { socketId: string } }
  | { action: 'READY_TO_PLAY'; data: Record<string, never> }
  | { action: 'PLAY_CARDS'; data: { cardIds: string[] } }
  | { action: 'PLAY_FACE_DOWN'; data: { cardIndex: number } }
  | { action: 'PICK_UP_PILE'; data: Record<string, never> }
  | { action: 'SYNC_STATE'; data: { gameState: SerializedGameState } };

// ── Serialized state (for multiplayer sync) ─────────────────

export interface SerializedCard {
  suit: Suit;
  rank: Rank;
  id: string;
}

export interface SerializedPlayerHand {
  hand: SerializedCard[];
  faceUp: SerializedCard[];
  faceDown: SerializedCard[];
}

export interface SerializedPlayer {
  socketId: string;
  displayName: string;
  playerNumber: number;
  isHost: boolean;
  cards: SerializedPlayerHand;
  isFinished: boolean;
  finishPosition: number | null;
}

export interface SerializedGameState {
  phase: GamePhase;
  players: SerializedPlayer[];
  drawPile: SerializedCard[];
  pile: SerializedCard[];
  burned: SerializedCard[];
  currentTurn: string | null;
  turnOrder: string[];
  direction: 1 | -1;
  shithead: string | null;
  winner: string | null;
  finishOrder: string[];
  lastMessage: string | null;
  lastActionTime: number;
}
