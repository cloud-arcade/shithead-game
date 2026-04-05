/**
 * Shithead Card Game — Core Engine
 *
 * Pure functions that implement the game rules.
 * No side-effects, no React, no DOM — just logic.
 */

import type {
  Card,
  Suit,
  Rank,
  Player,
  ShitheadGameState,
  SerializedGameState,
} from './types';

// ── Constants ───────────────────────────────────────────────

const SUITS: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

/** Numeric value for comparing cards. 2 is special (reset) so it's highest playable. */
const RANK_VALUE: Record<Rank, number> = {
  '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15,
};

/** Special cards */
const RESET_RANK: Rank = '2';   // Resets pile — next player can play anything
const BURN_RANK: Rank = '10';   // Burns the pile — player goes again

// ── Deck Creation & Shuffling ───────────────────────────────

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, id: `${suit}-${rank}` });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ── Card Helpers ────────────────────────────────────────────

export function getRankValue(rank: Rank): number {
  return RANK_VALUE[rank];
}

export function canPlayOnPile(card: Card, pile: Card[]): boolean {
  // 2 and 10 can always be played
  if (card.rank === RESET_RANK || card.rank === BURN_RANK) return true;

  // Empty pile — anything goes
  if (pile.length === 0) return true;

  // Find the effective top card (skip transparent 9s — house rule NOT enabled for simplicity)
  const topCard = pile[pile.length - 1];

  return getRankValue(card.rank) >= getRankValue(topCard.rank);
}

/** Check if the top 4 cards of the pile are the same rank → burn */
export function shouldBurnPile(pile: Card[]): boolean {
  if (pile.length < 4) return false;
  const top4 = pile.slice(-4);
  return top4.every((c) => c.rank === top4[0].rank);
}

/** Check if a set of cards are all the same rank (for multi-play) */
export function areAllSameRank(cards: Card[]): boolean {
  if (cards.length === 0) return false;
  return cards.every((c) => c.rank === cards[0].rank);
}

// ── Dealing ─────────────────────────────────────────────────

export function dealCards(
  playerInfos: { socketId: string; displayName: string; playerNumber: number; isHost: boolean }[]
): ShitheadGameState {
  const deck = shuffleDeck(createDeck());
  let cardIndex = 0;

  const players: Player[] = playerInfos.map((info) => {
    const faceDown = deck.slice(cardIndex, cardIndex + 3);
    cardIndex += 3;
    const faceUp = deck.slice(cardIndex, cardIndex + 3);
    cardIndex += 3;
    const hand = deck.slice(cardIndex, cardIndex + 3);
    cardIndex += 3;

    return {
      ...info,
      cards: { hand, faceUp, faceDown },
      isFinished: false,
      finishPosition: null,
    };
  });

  const drawPile = deck.slice(cardIndex);
  const turnOrder = players.map((p) => p.socketId);

  return {
    phase: 'swapping',
    players,
    drawPile,
    pile: [],
    burned: [],
    currentTurn: turnOrder[0],
    turnOrder,
    direction: 1,
    shithead: null,
    winner: null,
    finishOrder: [],
    lastMessage: 'Swap cards between your hand and face-up cards, then click Ready!',
    lastActionTime: Date.now(),
  };
}

// ── Swap Cards (pre-game) ───────────────────────────────────

export function swapCards(
  state: ShitheadGameState,
  socketId: string,
  handIndex: number,
  faceUpIndex: number
): ShitheadGameState {
  if (state.phase !== 'swapping') return state;

  const players = state.players.map((p) => {
    if (p.socketId !== socketId) return p;
    const newHand = [...p.cards.hand];
    const newFaceUp = [...p.cards.faceUp];

    if (handIndex < 0 || handIndex >= newHand.length) return p;
    if (faceUpIndex < 0 || faceUpIndex >= newFaceUp.length) return p;

    // Swap
    [newHand[handIndex], newFaceUp[faceUpIndex]] = [newFaceUp[faceUpIndex], newHand[handIndex]];
    return { ...p, cards: { ...p.cards, hand: newHand, faceUp: newFaceUp } };
  });

  return { ...state, players, lastActionTime: Date.now() };
}

// ── Redraw Hand (pre-game) ──────────────────────────────────

/**
 * Drop all 3 hand cards back into the draw pile and draw 3 fresh ones.
 * Can only be used once during the swapping phase.
 */
export function redrawHand(
  state: ShitheadGameState,
  socketId: string
): ShitheadGameState {
  if (state.phase !== 'swapping') return state;

  const player = state.players.find((p) => p.socketId === socketId);
  if (!player) return state;

  const handCards = player.cards.hand;
  if (handCards.length === 0) return state;

  // Put hand cards back into draw pile and shuffle
  const newDrawPile = shuffleDeck([...state.drawPile, ...handCards]);

  // Draw fresh cards
  const newHand = newDrawPile.slice(0, Math.min(3, newDrawPile.length));
  const remainingDraw = newDrawPile.slice(newHand.length);

  const players = state.players.map((p) => {
    if (p.socketId !== socketId) return p;
    return { ...p, cards: { ...p.cards, hand: newHand } };
  });

  return {
    ...state,
    players,
    drawPile: remainingDraw,
    lastMessage: `${player.displayName} redrew their hand!`,
    lastActionTime: Date.now(),
  };
}

// ── Start Playing ───────────────────────────────────────────

export function startPlaying(state: ShitheadGameState): ShitheadGameState {
  return {
    ...state,
    phase: 'playing',
    lastMessage: `Game started! ${getPlayerName(state, state.currentTurn)}'s turn.`,
    lastActionTime: Date.now(),
  };
}

// ── Play Cards ──────────────────────────────────────────────

export interface PlayResult {
  state: ShitheadGameState;
  success: boolean;
  message: string;
}

export function playCards(
  state: ShitheadGameState,
  socketId: string,
  cardIds: string[]
): PlayResult {
  if (state.phase !== 'playing') {
    return { state, success: false, message: 'Game is not in playing phase.' };
  }
  if (state.currentTurn !== socketId) {
    return { state, success: false, message: 'Not your turn!' };
  }
  if (cardIds.length === 0) {
    return { state, success: false, message: 'No cards selected.' };
  }

  const player = state.players.find((p) => p.socketId === socketId);
  if (!player) return { state, success: false, message: 'Player not found.' };

  // Determine which zone we're playing from
  const zone = getPlayableZone(player);
  if (!zone) return { state, success: false, message: 'No cards to play.' };

  const cards = cardIds
    .map((id) => zone.cards.find((c) => c.id === id))
    .filter(Boolean) as Card[];

  if (cards.length !== cardIds.length) {
    return { state, success: false, message: 'Invalid card selection.' };
  }

  // All cards must be the same rank
  if (!areAllSameRank(cards)) {
    return { state, success: false, message: 'All played cards must be the same rank.' };
  }

  // Check if cards can be played on the pile
  if (!canPlayOnPile(cards[0], state.pile)) {
    // If playing face-down cards, they must pick up the pile + the card
    if (zone.type === 'faceDown') {
      return playFaceDownFail(state, socketId, cards[0]);
    }
    return { state, success: false, message: `Can't play ${cards[0].rank} on the pile.` };
  }

  // Remove cards from the player's zone
  let newState = removeCardsFromPlayer(state, socketId, zone.type, cardIds);

  // Add cards to the pile
  newState = { ...newState, pile: [...newState.pile, ...cards] };

  // Check for burn (10 played or 4-of-a-kind)
  const isBurn = cards[0].rank === BURN_RANK || shouldBurnPile(newState.pile);
  const isReset = cards[0].rank === RESET_RANK;
  const playerName = getPlayerName(newState, socketId);

  if (isBurn) {
    newState = {
      ...newState,
      burned: [...newState.burned, ...newState.pile],
      pile: [],
      lastMessage: `${playerName} burned the pile! 🔥 Goes again.`,
    };
  } else if (isReset) {
    newState = {
      ...newState,
      lastMessage: `${playerName} played a 2 — pile reset! Next player can play anything.`,
    };
  } else {
    newState = {
      ...newState,
      lastMessage: `${playerName} played ${cards.length}x ${cards[0].rank}.`,
    };
  }

  // Draw cards back up to 3 (if draw pile exists and playing from hand)
  newState = drawToThree(newState, socketId);

  // Check if player is finished
  newState = checkPlayerFinished(newState, socketId);

  // Advance turn (unless burn = same player goes again)
  if (!isBurn) {
    newState = advanceTurn(newState);
  } else {
    // If the player who burned is now finished, advance anyway
    const p = newState.players.find((pl) => pl.socketId === socketId);
    if (p?.isFinished) {
      newState = advanceTurn(newState);
    }
  }

  // Check if game is over
  newState = checkGameOver(newState);
  newState = { ...newState, lastActionTime: Date.now() };

  return { state: newState, success: true, message: newState.lastMessage || '' };
}

/** When a face-down card can't be played, player picks up the pile + that card */
function playFaceDownFail(
  state: ShitheadGameState,
  socketId: string,
  card: Card
): PlayResult {
  // Remove the face-down card from the player
  let newState = removeCardsFromPlayer(state, socketId, 'faceDown', [card.id]);

  // Player picks up entire pile + the failed card
  const pickedUp = [...newState.pile, card];
  newState = addCardsToHand(newState, socketId, pickedUp);
  newState = { ...newState, pile: [] };

  const playerName = getPlayerName(newState, socketId);
  newState = {
    ...newState,
    lastMessage: `${playerName} flipped a ${card.rank} — can't play it! Picked up the pile. 😬`,
  };

  // Advance turn
  newState = advanceTurn(newState);
  newState = { ...newState, lastActionTime: Date.now() };

  return { state: newState, success: true, message: newState.lastMessage || '' };
}

// ── Pick Up Pile ────────────────────────────────────────────

export function pickUpPile(state: ShitheadGameState, socketId: string): PlayResult {
  if (state.phase !== 'playing') {
    return { state, success: false, message: 'Game is not in playing phase.' };
  }
  if (state.currentTurn !== socketId) {
    return { state, success: false, message: 'Not your turn!' };
  }
  if (state.pile.length === 0) {
    return { state, success: false, message: 'Pile is empty!' };
  }

  let newState = addCardsToHand(state, socketId, state.pile);
  const playerName = getPlayerName(newState, socketId);
  newState = {
    ...newState,
    pile: [],
    lastMessage: `${playerName} picked up the pile! (${state.pile.length} cards) 😬`,
  };

  newState = advanceTurn(newState);
  newState = { ...newState, lastActionTime: Date.now() };

  return { state: newState, success: true, message: newState.lastMessage || '' };
}

// ── Helper Functions ────────────────────────────────────────

interface PlayableZone {
  type: 'hand' | 'faceUp' | 'faceDown';
  cards: Card[];
}

function getPlayableZone(player: Player): PlayableZone | null {
  if (player.cards.hand.length > 0) return { type: 'hand', cards: player.cards.hand };
  if (player.cards.faceUp.length > 0) return { type: 'faceUp', cards: player.cards.faceUp };
  if (player.cards.faceDown.length > 0) return { type: 'faceDown', cards: player.cards.faceDown };
  return null;
}

export function getPlayerPlayableZone(player: Player): 'hand' | 'faceUp' | 'faceDown' | null {
  const zone = getPlayableZone(player);
  return zone?.type ?? null;
}

function removeCardsFromPlayer(
  state: ShitheadGameState,
  socketId: string,
  zone: 'hand' | 'faceUp' | 'faceDown',
  cardIds: string[]
): ShitheadGameState {
  const idSet = new Set(cardIds);
  const players = state.players.map((p) => {
    if (p.socketId !== socketId) return p;
    const newCards = { ...p.cards };
    newCards[zone] = newCards[zone].filter((c) => !idSet.has(c.id));
    return { ...p, cards: newCards };
  });
  return { ...state, players };
}

function addCardsToHand(state: ShitheadGameState, socketId: string, cards: Card[]): ShitheadGameState {
  const players = state.players.map((p) => {
    if (p.socketId !== socketId) return p;
    return { ...p, cards: { ...p.cards, hand: [...p.cards.hand, ...cards] } };
  });
  return { ...state, players };
}

function drawToThree(state: ShitheadGameState, socketId: string): ShitheadGameState {
  const player = state.players.find((p) => p.socketId === socketId);
  if (!player) return state;

  const needed = Math.max(0, 3 - player.cards.hand.length);
  const available = Math.min(needed, state.drawPile.length);
  if (available === 0) return state;

  const drawn = state.drawPile.slice(0, available);
  const remaining = state.drawPile.slice(available);

  const players = state.players.map((p) => {
    if (p.socketId !== socketId) return p;
    return { ...p, cards: { ...p.cards, hand: [...p.cards.hand, ...drawn] } };
  });

  return { ...state, players, drawPile: remaining };
}

function checkPlayerFinished(state: ShitheadGameState, socketId: string): ShitheadGameState {
  const player = state.players.find((p) => p.socketId === socketId);
  if (!player) return state;

  const totalCards =
    player.cards.hand.length + player.cards.faceUp.length + player.cards.faceDown.length;

  if (totalCards === 0 && !player.isFinished) {
    const position = state.finishOrder.length + 1;
    const finishOrder = [...state.finishOrder, socketId];
    const players = state.players.map((p) => {
      if (p.socketId !== socketId) return p;
      return { ...p, isFinished: true, finishPosition: position };
    });

    const winner = state.winner ?? socketId;
    return { ...state, players, finishOrder, winner };
  }

  return state;
}

function advanceTurn(state: ShitheadGameState): ShitheadGameState {
  // Get active (non-finished) players in turn order
  const activePlayers = state.turnOrder.filter((sid) => {
    const p = state.players.find((pl) => pl.socketId === sid);
    return p && !p.isFinished;
  });

  if (activePlayers.length <= 1) return state;

  const currentIdx = activePlayers.indexOf(state.currentTurn!);
  const nextIdx = (currentIdx + state.direction + activePlayers.length) % activePlayers.length;
  const nextTurn = activePlayers[nextIdx];

  return { ...state, currentTurn: nextTurn };
}

function checkGameOver(state: ShitheadGameState): ShitheadGameState {
  const activePlayers = state.players.filter((p) => !p.isFinished);

  if (activePlayers.length <= 1) {
    // Last player standing is the SHITHEAD
    const shithead = activePlayers.length === 1 ? activePlayers[0].socketId : null;
    const shitheadName = shithead ? getPlayerName(state, shithead) : 'Nobody';

    // Add the shithead to finish order if not there
    let finishOrder = [...state.finishOrder];
    if (shithead && !finishOrder.includes(shithead)) {
      finishOrder = [...finishOrder, shithead];
    }

    // Mark shithead as finished
    const players = state.players.map((p) => {
      if (p.socketId === shithead && !p.isFinished) {
        return { ...p, isFinished: true, finishPosition: finishOrder.length };
      }
      return p;
    });

    return {
      ...state,
      phase: 'finished',
      shithead,
      players,
      finishOrder,
      currentTurn: null,
      lastMessage: `🏆 Game Over! ${shitheadName} is the SHITHEAD! 💩`,
    };
  }

  return state;
}

export function getPlayerName(state: ShitheadGameState, socketId: string | null): string {
  if (!socketId) return 'Unknown';
  return state.players.find((p) => p.socketId === socketId)?.displayName ?? 'Unknown';
}

export function getTotalCards(player: Player): number {
  return player.cards.hand.length + player.cards.faceUp.length + player.cards.faceDown.length;
}

/** Can the current player play any card from their playable zone? */
export function hasPlayableCard(state: ShitheadGameState, socketId: string): boolean {
  const player = state.players.find((p) => p.socketId === socketId);
  if (!player) return false;

  const zone = getPlayableZone(player);
  if (!zone) return false;

  // Face-down cards are always "playable" (you just might fail)
  if (zone.type === 'faceDown') return true;

  return zone.cards.some((c) => canPlayOnPile(c, state.pile));
}

// ── Serialization ───────────────────────────────────────────

export function serializeState(state: ShitheadGameState): SerializedGameState {
  return JSON.parse(JSON.stringify(state));
}

export function deserializeState(data: SerializedGameState): ShitheadGameState {
  return data as unknown as ShitheadGameState;
}

// ── Card Image Path Helper ──────────────────────────────────

export function getCardImagePath(card: Card): string {
  return `/assets/game-assets/cards/${card.suit}/${card.rank}.png`;
}

export function getCardBackImagePath(): string {
  // Use the 'S' image (spades back) as card back
  return `/assets/game-assets/cards/spades/S.png`;
}
