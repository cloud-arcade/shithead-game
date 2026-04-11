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
const RESET_RANK: Rank = '2';   // Can play on anything, resets pile — any card can be played next
const GLASS_RANK: Rank = '3';   // Invisible/glass card — acts as if it wasn't played
const GO_AGAIN_RANK: Rank = '5'; // Your go again after playing
const LOWER_RANK: Rank = '7';   // Next card must be 7 or lower (except 2, 10)
const SKIP_RANK: Rank = '8';    // Skips the next player (2+ players)
const BURN_RANK: Rank = '10';   // Burns the pile — player goes again (cannot be played on 7)

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

/**
 * Get the effective top card of the pile, looking through glass (3) cards.
 * Returns null if pile is empty or all glass cards.
 */
export function getEffectiveTopCard(pile: Card[]): Card | null {
  if (pile.length === 0) return null;
  
  // Walk backwards through pile, skipping glass cards
  for (let i = pile.length - 1; i >= 0; i--) {
    if (pile[i].rank !== GLASS_RANK) {
      return pile[i];
    }
  }
  // All cards are glass — treat as empty pile
  return null;
}

export function canPlayOnPile(card: Card, pile: Card[]): boolean {
  // Empty pile — anything goes
  if (pile.length === 0) return true;

  // 2 (reset) can always be played on anything
  if (card.rank === RESET_RANK) return true;
  
  // 3 (glass) can always be played — it's invisible  
  if (card.rank === GLASS_RANK) return true;

  // Get the effective top card (looking through glass cards)
  const effectiveTop = getEffectiveTopCard(pile);
  
  // If pile is all glass cards, treat as empty — anything goes
  if (!effectiveTop) return true;
  
  // 7 rule: if effective top is 7, next card must be 7 or lower
  // Exception: 2 (reset) and 3 (glass) can still be played (handled above)
  // Note: 10 (burn) CANNOT be played on 7 either
  if (effectiveTop.rank === LOWER_RANK) {
    return getRankValue(card.rank) <= getRankValue(LOWER_RANK);
  }

  // 10 (burn) can be played on anything (except 7 - handled above)
  if (card.rank === BURN_RANK) return true;

  // Normal rule: card must be >= top card value
  return getRankValue(card.rank) >= getRankValue(effectiveTop.rank);
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
    turnStartTime: Date.now(),
    consecutiveTimeouts: {},
    turnPlayedRank: null,
    goAgain: false,
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
    turnStartTime: Date.now(),
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

  const playedRank = cards[0].rank;

  // Check if player can play this turn:
  // 1. If goAgain is true, any valid card is OK
  // 2. If turnPlayedRank is null (first play this turn), any valid card is OK
  // 3. Otherwise, must match turnPlayedRank (adding more of same rank)
  if (!state.goAgain && state.turnPlayedRank !== null && playedRank !== state.turnPlayedRank) {
    return { 
      state, 
      success: false, 
      message: `You can only play more ${state.turnPlayedRank}s or end your turn.` 
    };
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

  // Check for special cards
  const isBurn = playedRank === BURN_RANK || shouldBurnPile(newState.pile);
  const isGoAgain = playedRank === GO_AGAIN_RANK;  // 5 = go again
  const isReset = playedRank === RESET_RANK;       // 2 = reset
  const isGlass = playedRank === GLASS_RANK;       // 3 = glass (check effective top for go-again)
  const isSkip = playedRank === SKIP_RANK;         // 8 = skip next player
  
  // Check if playing glass on a go-again (5) means go-again
  let effectiveGoAgain = isGoAgain;
  if (isGlass && !isBurn) {
    const effectiveTop = getEffectiveTopCard(newState.pile);
    if (effectiveTop && effectiveTop.rank === GO_AGAIN_RANK) {
      effectiveGoAgain = true;
    }
  }

  const playerName = getPlayerName(newState, socketId);

  if (isBurn) {
    newState = {
      ...newState,
      burned: [...newState.burned, ...newState.pile],
      pile: [],
      lastMessage: `${playerName} burned the pile! 🔥 Goes again.`,
      goAgain: true,
      turnPlayedRank: null, // Reset - can play any card now
    };
  } else if (effectiveGoAgain) {
    newState = {
      ...newState,
      lastMessage: `${playerName} played a 5 — goes again! 🔄`,
      goAgain: true,
      turnPlayedRank: null, // Reset - can play any card now
    };
  } else if (isReset) {
    newState = {
      ...newState,
      lastMessage: `${playerName} played a 2 — pile reset!`,
      goAgain: false,
      turnPlayedRank: playedRank,
    };
  } else if (isGlass) {
    newState = {
      ...newState,
      lastMessage: `${playerName} played a 3 — invisible card! 👻`,
      goAgain: false,
      turnPlayedRank: playedRank,
    };
  } else if (isSkip) {
    newState = {
      ...newState,
      lastMessage: `${playerName} played an 8 — skip! ⏭️`,
      goAgain: false,
      turnPlayedRank: playedRank,
    };
  } else {
    newState = {
      ...newState,
      lastMessage: `${playerName} played ${cards.length}x ${playedRank}.`,
      goAgain: false,
      turnPlayedRank: playedRank,
    };
  }

  // Draw cards back up to 3 (if draw pile exists and playing from hand)
  newState = drawToThree(newState, socketId);

  // Check if player is finished
  newState = checkPlayerFinished(newState, socketId);

  // If burn or go-again and player is finished, advance turn
  if (isBurn || effectiveGoAgain) {
    const p = newState.players.find((pl) => pl.socketId === socketId);
    if (p?.isFinished) {
      newState = advanceTurn(newState);
      newState = { ...newState, goAgain: false, turnPlayedRank: null };
    }
  }

  // Check if game is over
  newState = checkGameOver(newState);
  newState = { ...newState, lastActionTime: Date.now() };

  // Reset consecutive timeout counter (player acted manually)
  const timeouts = { ...newState.consecutiveTimeouts };
  timeouts[socketId] = 0;
  newState = { ...newState, consecutiveTimeouts: timeouts };

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
    turnPlayedRank: null,
    goAgain: false,
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
    turnPlayedRank: null,
    goAgain: false,
  };

  newState = advanceTurn(newState);
  newState = { ...newState, lastActionTime: Date.now() };

  // Reset consecutive timeout counter (player acted manually)
  const timeouts = { ...newState.consecutiveTimeouts };
  timeouts[socketId] = 0;
  newState = { ...newState, consecutiveTimeouts: timeouts };

  return { state: newState, success: true, message: newState.lastMessage || '' };
}

// ── End Turn Explicitly ─────────────────────────────────────

export function endPlayerTurn(state: ShitheadGameState, socketId: string): PlayResult {
  if (state.phase !== 'playing') {
    return { state, success: false, message: 'Game is not in playing phase.' };
  }
  if (state.currentTurn !== socketId) {
    return { state, success: false, message: 'Not your turn!' };
  }

  // Check if 8 (skip) was the effective top card - skip extra player
  // But only if there are 3+ players (with 2 players, 8 is just a normal 8)
  const effectiveTop = getEffectiveTopCard(state.pile);
  const shouldSkip = effectiveTop && effectiveTop.rank === SKIP_RANK && state.players.length >= 3;

  // Advance to next player (skip twice if 8 was played with 3+ players)
  let newState = advanceTurn(state);
  if (shouldSkip) {
    // Skip one more player (8 skips)
    newState = advanceTurn(newState);
  }
  
  // Clear turn tracking flags
  newState = { 
    ...newState, 
    lastActionTime: Date.now(),
    turnPlayedRank: null,
    goAgain: false,
  };

  // Reset consecutive timeout counter
  const timeouts = { ...newState.consecutiveTimeouts };
  timeouts[socketId] = 0;
  newState = { ...newState, consecutiveTimeouts: timeouts };

  return { state: newState, success: true, message: '' };
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

  return { ...state, currentTurn: nextTurn, turnStartTime: Date.now() };
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

  // Check if cards can be played on the pile
  let playable = zone.cards.filter((c) => canPlayOnPile(c, state.pile));

  // If turnPlayedRank is set and goAgain is false, only cards matching that rank are playable
  if (!state.goAgain && state.turnPlayedRank !== null) {
    playable = playable.filter((c) => c.rank === state.turnPlayedRank);
  }

  return playable.length > 0;
}

// ── Auto-Play for Timeout ───────────────────────────────────

/**
 * Auto-play the lowest playable card when time runs out.
 * If no card can be played, picks up the pile.
 */
export function autoPlayForTimeout(
  state: ShitheadGameState,
  socketId: string
): PlayResult {
  if (state.phase !== 'playing' || state.currentTurn !== socketId) {
    return { state, success: false, message: 'Cannot auto-play.' };
  }

  const player = state.players.find((p) => p.socketId === socketId);
  if (!player) return { state, success: false, message: 'Player not found.' };

  const zone = getPlayableZone(player);
  if (!zone) return pickUpPile(state, socketId);

  // Face-down: just play the first one (random anyway)
  if (zone.type === 'faceDown') {
    const result = playCards(state, socketId, [zone.cards[0].id]);
    if (!result.success) return result;
    // Check if go-again is active (burn or 5)
    if (result.state.goAgain) {
      return result; // Don't end turn - player goes again
    }
    return endPlayerTurn(result.state, socketId);
  }

  // Filter playable cards:
  // 1. Must be playable on the pile
  // 2. If turnPlayedRank is set and goAgain is false, must match that rank
  let playable = zone.cards.filter((c) => canPlayOnPile(c, state.pile));
  
  if (!state.goAgain && state.turnPlayedRank !== null) {
    // Must match the rank already played this turn
    playable = playable.filter((c) => c.rank === state.turnPlayedRank);
  }

  // Sort by value (ascending) — play the weakest
  playable.sort((a, b) => getRankValue(a.rank) - getRankValue(b.rank));

  if (playable.length > 0) {
    const result = playCards(state, socketId, [playable[0].id]);
    if (!result.success) return result;
    // Check if go-again is active (burn or 5)
    if (result.state.goAgain) {
      return result; // Don't end turn - player goes again
    }
    return endPlayerTurn(result.state, socketId);
  }

  // No playable card — pick up
  return pickUpPile(state, socketId);
}

// ── Forfeit Player ──────────────────────────────────────────

/**
 * Force a player to forfeit (AFK 3x or disconnected too long).
 * In a 2-player game the forfeiter becomes the shithead.
 * In N-player games the game continues without them.
 */
export function forfeitPlayer(
  state: ShitheadGameState,
  socketId: string
): ShitheadGameState {
  const player = state.players.find((p) => p.socketId === socketId);
  if (!player || player.isFinished) return state;

  const playerName = player.displayName;

  // Remove from turn order
  const turnOrder = state.turnOrder.filter((s) => s !== socketId);

  // Count remaining active players (excluding the forfeiter)
  const activeAfterForfeit = state.players.filter(
    (p) => !p.isFinished && p.socketId !== socketId
  );

  if (activeAfterForfeit.length <= 1) {
    // Game is effectively over — forfeiter is the shithead
    const winnerId = activeAfterForfeit[0]?.socketId ?? null;
    const finishOrder = [...state.finishOrder];
    if (winnerId && !finishOrder.includes(winnerId)) finishOrder.push(winnerId);
    if (!finishOrder.includes(socketId)) finishOrder.push(socketId);

    const players = state.players.map((p) => {
      const pos = finishOrder.indexOf(p.socketId);
      if (pos === -1) return p;
      return { ...p, isFinished: true, finishPosition: pos + 1 };
    });

    return {
      ...state,
      phase: 'finished',
      players,
      turnOrder,
      finishOrder,
      shithead: socketId,
      winner: winnerId ?? state.winner,
      currentTurn: null,
      lastMessage: `${playerName} forfeited! They're the Shithead! 💩`,
      lastActionTime: Date.now(),
      turnStartTime: Date.now(),
    };
  }

  // Multiple players remain — just remove the forfeiter
  const finishOrder = [...state.finishOrder, socketId];
  const position = finishOrder.length;
  const players = state.players.map((p) => {
    if (p.socketId !== socketId) return p;
    return { ...p, isFinished: true, finishPosition: position };
  });

  let newState: ShitheadGameState = {
    ...state,
    players,
    turnOrder,
    finishOrder,
    lastMessage: `${playerName} forfeited (AFK). Game continues!`,
    lastActionTime: Date.now(),
  };

  // If it was their turn, advance
  if (state.currentTurn === socketId) {
    newState = advanceTurn(newState);
  }

  return newState;
}

// ── Serialization ───────────────────────────────────────────

export function serializeState(state: ShitheadGameState): SerializedGameState {
  return JSON.parse(JSON.stringify(state));
}

export function deserializeState(data: SerializedGameState): ShitheadGameState {
  return data as unknown as ShitheadGameState;
}

// ── Asset Path Helpers ──────────────────────────────────

/**
 * Get properly prefixed asset path accounting for Vite base URL
 */
export function getAssetPath(path: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${base}${cleanPath}`;
}

export function getCardImagePath(card: Card): string {
  return getAssetPath(`assets/game-assets/cards/${card.suit}/${card.rank}.png`);
}

export function getCardBackImagePath(): string {
  // Use the 'S' image (spades back) as card back
  return getAssetPath(`assets/game-assets/cards/spades/S.png`);
}
