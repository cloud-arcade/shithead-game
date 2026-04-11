/**
 * GameBoard — Professional 4-seat card table.
 *
 * CSS Grid 3×3:
 * ┌─────────────────────────────────────────────────┐
 * │   .        [TOP: hand → slots → badge]       .  │
 * │                                                  │
 * │  [LEFT     ┌──────────────────┐      RIGHT]      │
 * │  rotated   │  Draw  ─  Pile   │    rotated       │
 * │  -90°      └──────────────────┘      90°         │
 * │                                                  │
 * │   .        [BOTTOM: badge → slots]           .  │
 * │           [════ My Hand (scrollable) ════]       │
 * │               [▶ Play]  [✋ Pick Up]             │
 * └─────────────────────────────────────────────────┘
 *
 * - All 4 seats ALWAYS render (empty = placeholder).
 * - Left/right players rotated so cards face center.
 * - Badges always closest to center.
 * - Compact game-log overlay on the right side.
 */

import { useState, useCallback, useMemo, useEffect, useRef, memo } from 'react';
import type { ShitheadGameState, Card, Player } from '../../game/types';
import {
  canPlayOnPile,
  getPlayerPlayableZone,
  hasPlayableCard,
  getCardBackImagePath,
} from '../../game/engine';
import { CardComponent } from './CardComponent';
import { TurnTimer, GameHeader, TableCorners } from '../ui';
import { HandDock } from './HandDock';

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

type Position = 'bottom' | 'left' | 'top' | 'right';

interface LogEntry {
  message: string;
  time: number;
}

interface GameBoardProps {
  gameState: ShitheadGameState;
  mySocketId: string | null;
  isMyTurn: boolean;
  onPlayCards: (cardIds: string[]) => void;
  onPickUpPile: () => void;
  onEndTurn: () => void;
  onLogUpdate?: (entries: LogEntry[]) => void;
  turnTimer: {
    timeRemaining: number;
    totalDuration: number;
    progress: number;
    isUrgent: boolean;
    isCritical: boolean;
  };
}

interface SeatedPlayer {
  player: Player;
  position: Position;
}

interface LogEntry {
  message: string;
  time: number;
}

/* ═══════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════ */

function arrangeAroundTable(
  players: Player[],
  mySocketId: string | null,
): SeatedPlayer[] {
  const positions: Position[] = ['bottom', 'left', 'top', 'right'];
  const myIdx = players.findIndex((p) => p.socketId === mySocketId);
  if (myIdx === -1) {
    return players.map((p, i) => ({ player: p, position: positions[i % 4] }));
  }
  const reordered = [...players.slice(myIdx), ...players.slice(0, myIdx)];
  return reordered.map((p, i) => ({ player: p, position: positions[i] }));
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/* ═══════════════════════════════════════════════════════
   TABLE CARD SLOTS — 3 pairs (face-down behind face-up)
   ═══════════════════════════════════════════════════════ */

function TableCardSlots({
  player,
  isMe,
  myZone,
  selectedIds,
  onCardClick,
  revealingCardId,
}: {
  player: Player | null;
  isMe: boolean;
  myZone?: 'hand' | 'faceUp' | 'faceDown' | null;
  selectedIds: Set<string>;
  onCardClick?: (card: Card) => void;
  revealingCardId?: string;
}) {
  return (
    <div className="q-slots">
      {[0, 1, 2].map((i) => {
        const fd = player?.cards.faceDown[i];
        const fu = player?.cards.faceUp[i];
        const canClickFU = isMe && myZone === 'faceUp' && !!fu;
        const canClickFD = isMe && myZone === 'faceDown' && !!fd && !revealingCardId;
        const isRevealing = fd && fd.id === revealingCardId;

        if (!fd && !fu) {
          return (
            <div key={i} className="q-slot q-slot--empty">
              <div className="q-slot__placeholder" />
            </div>
          );
        }

        return (
          <div key={i} className="q-slot">
            {/* face-down (behind) — show face-up if revealing */}
            <div className="q-slot__back">
              {fd ? (
                <CardComponent
                  card={fd}
                  faceDown={!isRevealing}
                  size="table"
                  onClick={canClickFD ? () => onCardClick?.(fd) : undefined}
                  disabled={!canClickFD}
                  selected={selectedIds.has(fd.id) || isRevealing}
                  className={isRevealing ? 'card--revealing' : ''}
                />
              ) : (
                <div className="q-slot__placeholder" />
              )}
            </div>
            {/* face-up (offset in front) */}
            <div className="q-slot__front">
              {fu ? (
                <CardComponent
                  card={fu}
                  size="table"
                  onClick={canClickFU ? () => onCardClick?.(fu) : undefined}
                  disabled={!canClickFU}
                  selected={selectedIds.has(fu.id)}
                />
              ) : (
                <div className="q-slot__placeholder" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PLAYER BADGE
   ═══════════════════════════════════════════════════════ */

function PlayerBadge({
  player,
  isActive,
  isMe,
  timer,
  onEndTurn,
  onPickUp,
  canEndTurn,
  showPickUp,
  turnProgress,
}: {
  player: Player | null;
  isActive: boolean;
  isMe: boolean;
  timer?: React.ReactNode;
  onEndTurn?: () => void;
  onPickUp?: () => void;
  canEndTurn?: boolean;
  showPickUp?: boolean;
  turnProgress?: number;
}) {
  const isEmpty = !player;
  const name = isMe ? 'YOU' : player?.displayName || `P${player?.playerNumber || '?'}`;
  const initial = isEmpty ? '?' : (name[0]?.toUpperCase() || '?');
  const isWinner = player?.isFinished && player.finishPosition === 1;

  // If it's me and my turn, show pickup button if no cards played and can't play
  if (isMe && isActive && showPickUp && onPickUp) {
    const circumference = 2 * Math.PI * 18; // radius = 18
    const strokeDashoffset = circumference * (1 - (turnProgress || 0));
    
    return (
      <button
        className="player-end-turn player-end-turn--pickup"
        onClick={onPickUp}
        title="Pick up pile"
      >
        <svg className="player-end-turn__timer" viewBox="0 0 44 44">
          <circle
            className="player-end-turn__timer-bg"
            cx="22"
            cy="22"
            r="18"
          />
          <circle
            className="player-end-turn__timer-progress"
            cx="22"
            cy="22"
            r="18"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <span className="player-end-turn__icon">↑</span>
      </button>
    );
  }

  // If it's me and my turn, show end turn button with circular timer
  if (isMe && isActive && onEndTurn) {
    const circumference = 2 * Math.PI * 18; // radius = 18
    const strokeDashoffset = circumference * (1 - (turnProgress || 0));
    
    return (
      <button
        className={`player-end-turn ${!canEndTurn ? 'player-end-turn--disabled' : ''}`}
        onClick={onEndTurn}
        disabled={!canEndTurn}
        title={canEndTurn ? "End turn" : "Play cards first"}
      >
        <svg className="player-end-turn__timer" viewBox="0 0 44 44">
          <circle
            className="player-end-turn__timer-bg"
            cx="22"
            cy="22"
            r="18"
          />
          <circle
            className="player-end-turn__timer-progress"
            cx="22"
            cy="22"
            r="18"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <span className="player-end-turn__icon">✓</span>
      </button>
    );
  }

  return (
    <div className={`player-tag ${isActive ? 'player-tag--active' : ''} ${isMe ? 'player-tag--me' : ''} ${isEmpty ? 'player-tag--empty' : ''}`}>
      <div className="player-tag__avatar">
        {isWinner ? '👑' : initial}
      </div>
      <span className="player-tag__name">{isEmpty ? '...' : name}</span>
      {timer && <div className="player-tag__timer">{timer}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   OPPONENT HAND — Overlapping card backs
   ═══════════════════════════════════════════════════════ */

function OpponentHand({ count, showPlaceholders = false }: { count: number; showPlaceholders?: boolean }) {
  const src = getCardBackImagePath();
  
  // Show 3 placeholders when no cards and showPlaceholders is true
  if (count === 0 && showPlaceholders) {
    return (
      <div className="q-opp-hand q-opp-hand--placeholder">
        {[0, 1, 2].map((i) => (
          <div key={i} className="q-opp-hand__card q-opp-hand__card--placeholder" style={{ zIndex: i }} />
        ))}
      </div>
    );
  }
  
  if (count === 0) return null;

  return (
    <div className="q-opp-hand">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="q-opp-hand__card" style={{ zIndex: i }}>
          <img src={src} alt="card" draggable={false} />
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PLAYER QUADRANT — All 4 seats use this.

   Opponent order (top to bottom in DOM):
     [OpponentHand] ← farthest from center
     [TableCardSlots]
     [PlayerBadge]   ← closest to center

   Bottom (me) order:
     [PlayerBadge]   ← closest to center (top side)
     [TableCardSlots]

   CSS rotation for left/right makes the column face center.
   ═══════════════════════════════════════════════════════ */

function PlayerQuadrant({
  player,
  position,
  isActive,
  isMe,
  myZone,
  selectedIds,
  onCardClick,
  onEndTurn,
  onPickUp,
  canEndTurn,
  showPickUp,
  turnTimer,
  revealingCardId,
}: {
  player: Player | null;
  position: Position;
  isActive: boolean;
  isMe: boolean;
  myZone?: 'hand' | 'faceUp' | 'faceDown' | null;
  selectedIds: Set<string>;
  onCardClick?: (card: Card) => void;
  onEndTurn?: () => void;
  onPickUp?: () => void;
  canEndTurn?: boolean;
  showPickUp?: boolean;
  turnTimer: GameBoardProps['turnTimer'];
  revealingCardId?: string;
}) {
  const isEmpty = !player;
  const isFinished = player?.isFinished ?? false;
  const handCount = player?.cards.hand.length ?? 0;

  const timer = isActive ? <TurnTimer {...turnTimer} size={14} /> : undefined;

  const badge = (
    <div className="q-quad__badge">
      <PlayerBadge 
        player={player} 
        isActive={isActive} 
        isMe={isMe} 
        timer={timer}
        onEndTurn={onEndTurn}
        onPickUp={onPickUp}
        canEndTurn={canEndTurn}
        showPickUp={showPickUp}
        turnProgress={isActive ? turnTimer.progress : undefined}
      />
    </div>
  );

  const slots = (
    <div className="q-quad__slots">
      <TableCardSlots
        player={player}
        isMe={isMe}
        myZone={myZone}
        selectedIds={selectedIds}
        onCardClick={onCardClick}
        revealingCardId={revealingCardId}
      />
    </div>
  );

  const oppHand = !isMe ? (
    <div className="q-quad__hand">
      <OpponentHand count={handCount} showPlaceholders={isEmpty || handCount === 0} />
    </div>
  ) : null;

  const cls = [
    'q-quad',
    `q-quad--${position}`,
    isEmpty && 'q-quad--empty',
    isFinished && 'q-quad--finished',
  ].filter(Boolean).join(' ');

  /* Bottom (me): badge → slots (badge on top = closest to center)
     Others:      hand → slots → badge (badge on bottom = closest to center) */
  if (isMe) {
    return (
      <div className={cls}>
        {badge}
        {slots}
      </div>
    );
  }

  return (
    <div className={cls}>
      {oppHand}
      {slots}
      {badge}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   CENTER — Draw deck + Discard pile
   ═══════════════════════════════════════════════════════ */

function CenterPiles({ pile, drawPile, onPickUp, canPickUp }: { pile: Card[]; drawPile: Card[]; onPickUp?: () => void; canPickUp?: boolean }) {
  const topCard = pile[pile.length - 1];
  const secondCard = pile.length >= 2 ? pile[pile.length - 2] : undefined;

  return (
    <div className="center-area">
      <div className="center-area__inner">
        {/* Draw pile */}
        <div className="pile-stack">
          <div className="pile-stack__cards">
            {drawPile.length > 0 ? (
              <>
                {drawPile.length > 1 && (
                  <div className="pile-stack__card pile-stack__card--offset">
                    <CardComponent faceDown size="pile" />
                  </div>
                )}
                <div className="pile-stack__card">
                  <CardComponent faceDown size="pile" />
                </div>
              </>
            ) : (
              <CardComponent empty size="pile" />
            )}
          </div>
          <span className="pile-stack__label">
            Draw <span className="pile-stack__count">{drawPile.length}</span>
          </span>
        </div>

        {/* Separator */}
        <div className="center-area__sep" />

        {/* Discard pile */}
        <div className="pile-stack pile-stack--discard">
          <div className="pile-stack__cards">
            {topCard ? (
              <>
                {secondCard && (
                  <div className="pile-stack__card pile-stack__card--offset">
                    <CardComponent card={secondCard} size="pile" />
                  </div>
                )}
                <div className="pile-stack__card">
                  <CardComponent card={topCard} size="pile" />
                </div>
              </>
            ) : (
              <CardComponent empty size="pile" />
            )}
            {/* Pickup button */}
            {onPickUp && pile.length > 0 && (
              <button
                className="pile-pickup-btn"
                onClick={onPickUp}
                disabled={!canPickUp}
                title="Pick up pile"
              >
                <span className="pile-pickup-btn__icon">↑</span>
              </button>
            )}
          </div>
          <span className="pile-stack__label">
            Pile <span className="pile-stack__count">{pile.length}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   GAME LOG — Floating history panel
   ═══════════════════════════════════════════════════════ */

function GameLog({
  entries,
  visible,
  onClose,
}: {
  entries: LogEntry[];
  visible: boolean;
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible) {
      scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
    }
  }, [entries.length, visible]);

  if (!visible) return null;

  return (
    <div className="game-log">
      <div className="game-log__header">
        <span className="game-log__title">Game Log</span>
        <button className="game-log__close" onClick={onClose}>✕</button>
      </div>
      <div className="game-log__body" ref={scrollRef}>
        {entries.length === 0 ? (
          <div className="game-log__empty">No activity yet</div>
        ) : (
          entries.map((e, i) => (
            <div key={i} className="game-log__entry">
              <span className="game-log__time">{formatTime(e.time)}</span>
              <span className="game-log__text">{e.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN GAME BOARD
   ═══════════════════════════════════════════════════════ */

export const GameBoard = memo(function GameBoard({
  gameState,
  mySocketId,
  isMyTurn,
  onPlayCards,
  onPickUpPile,
  onEndTurn,
  onLogUpdate,
  turnTimer,
}: GameBoardProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showLog, setShowLog] = useState(false);
  const [gameLog, setGameLog] = useState<LogEntry[]>([]);
  const lastTracked = useRef<{ msg: string | null; time: number }>({ msg: null, time: 0 });

  // Face-down card reveal state
  const [revealingCard, setRevealingCard] = useState<{ card: Card; canPlay: boolean } | null>(null);

  /* ── Accumulate game history ────────────────────── */
  useEffect(() => {
    const msg = gameState.lastMessage;
    const time = gameState.lastActionTime;
    if (msg && (msg !== lastTracked.current.msg || time !== lastTracked.current.time)) {
      lastTracked.current = { msg, time };
      const newLog = [...gameLog.slice(-29), { message: msg, time }];
      setGameLog(newLog);
      onLogUpdate?.(newLog);
    }
  }, [gameState.lastMessage, gameState.lastActionTime]);

  /* ── Seat arrangement ───────────────────────────── */
  const seated = useMemo(
    () => arrangeAroundTable(gameState.players, mySocketId),
    [gameState.players, mySocketId],
  );

  const seatMap = useMemo(() => {
    const map: Record<Position, Player | null> = {
      bottom: null, left: null, top: null, right: null,
    };
    for (const s of seated) map[s.position] = s.player;
    return map;
  }, [seated]);

  const me = seatMap.bottom;
  const myZone = me ? getPlayerPlayableZone(me) : null;
  const currentTurnId = gameState.currentTurn;

  /* ── Reset selection on turn change ─────────────── */
  useEffect(() => setSelectedIds(new Set()), [currentTurnId]);

  /* ── Rank of first selected card (multi-select) ── */
  const selectedRank = useMemo(() => {
    if (selectedIds.size === 0 || !me) return null;
    const zone =
      myZone === 'hand' ? me.cards.hand
      : myZone === 'faceUp' ? me.cards.faceUp
      : [];
    const firstId = Array.from(selectedIds)[0];
    return zone.find((c) => c.id === firstId)?.rank ?? null;
  }, [selectedIds, me, myZone]);

  /* ── Calculate disabled (unplayable) cards ─────── */
  const disabledIds = useMemo(() => {
    const disabled = new Set<string>();
    if (!me || myZone !== 'hand') return disabled;
    
    for (const card of me.cards.hand) {
      // Check if card can be played on pile
      if (!canPlayOnPile(card, gameState.pile)) {
        disabled.add(card.id);
        continue;
      }
      // If cards have been played this turn and goAgain is false, only same rank is playable
      if (!gameState.goAgain && gameState.turnPlayedRank !== null) {
        if (card.rank !== gameState.turnPlayedRank) {
          disabled.add(card.id);
        }
      }
    }
    return disabled;
  }, [me, myZone, gameState.pile, gameState.goAgain, gameState.turnPlayedRank]);

  /* ── Card click handler ─────────────────────────── */
  const handleCardClick = useCallback(
    (card: Card) => {
      if (!isMyTurn || !me || !myZone) return;
      
      // Face-down card: reveal first, then play/pickup after delay
      if (myZone === 'faceDown') {
        const canPlay = canPlayOnPile(card, gameState.pile);
        setRevealingCard({ card, canPlay });
        
        // Delay before action to show the card
        const delay = canPlay ? 800 : 1500;
        setTimeout(() => {
          setRevealingCard(null);
          onPlayCards([card.id]);
        }, delay);
        return;
      }
      
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(card.id)) {
          next.delete(card.id);
        } else {
          if (next.size > 0 && card.rank !== selectedRank) return new Set([card.id]);
          next.add(card.id);
        }
        return next;
      });
    },
    [isMyTurn, me, myZone, selectedRank, onPlayCards, gameState.pile],
  );

  const handlePickUp = useCallback(() => {
    onPickUpPile();
    setSelectedIds(new Set());
  }, [onPickUpPile]);

  /* ── Drag and Drop handlers ─────────────────────── */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!isMyTurn) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, [isMyTurn]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!isMyTurn) return;
    
    const cardId = e.dataTransfer.getData('text/plain');
    if (!cardId) return;
    
    // Find the card in the player's hand
    const card = me?.cards.hand.find(c => c.id === cardId);
    if (!card) return;
    
    // Check if we can play this card (or selected cards if card is selected)
    if (selectedIds.has(cardId) && selectedIds.size > 0) {
      // Play all selected cards
      onPlayCards(Array.from(selectedIds));
      setSelectedIds(new Set());
    } else {
      // Play just this card
      onPlayCards([cardId]);
    }
  }, [isMyTurn, me, selectedIds, onPlayCards]);

  /* ── Render one quadrant for any position ───────── */
  const renderQuadrant = (pos: Position) => {
    const player = seatMap[pos];
    const isMe = pos === 'bottom';
    const isActive = !!player && player.socketId === currentTurnId;

    // Check if cards have been played this turn and if player can play
    const hasPlayedCards = gameState.turnPlayedRank !== null;
    const hasSelection = selectedIds.size > 0;
    const canPlay = isMe && player ? hasPlayableCard(gameState, player.socketId) : false;
    
    // Show pickup button when: no selection AND no cards played this turn AND can't play any cards
    const shouldShowPickUp = isMe && isActive && !hasSelection && !hasPlayedCards && !canPlay && gameState.pile.length > 0;
    
    // Can end turn if: cards are selected OR cards have been played this turn
    const canEnd = isMe && isActive && (hasSelection || hasPlayedCards);

    return (
      <PlayerQuadrant
        key={pos}
        player={player}
        position={pos}
        isActive={isActive}
        isMe={isMe}
        myZone={isMe ? myZone : undefined}
        selectedIds={isMe ? selectedIds : new Set()}
        onCardClick={isMe ? handleCardClick : undefined}
        turnTimer={turnTimer}
        revealingCardId={isMe ? revealingCard?.card.id : undefined}
        onEndTurn={isMe && isActive ? onEndTurn : undefined}
        onPickUp={isMe && isActive ? handlePickUp : undefined}
        canEndTurn={canEnd}
        showPickUp={shouldShowPickUp}
      />
    );
  };

  return (
    <div className="game-table">
      {/* ═══ HEADER ═══ */}
      <GameHeader
        playerCount={gameState.players.length}
        onShowLog={() => setShowLog((v) => !v)}
        showLog={showLog}
      />

      {/* ═══ DECORATIVE CORNERS ═══ */}
      <TableCorners />

      {/* ═══ GRID LAYOUT ═══ */}
      <div 
        className="gt-grid"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="gt-top">{renderQuadrant('top')}</div>
        <div className="gt-left">{renderQuadrant('left')}</div>
        <div className="gt-center">
          <CenterPiles 
            pile={gameState.pile} 
            drawPile={gameState.drawPile}
            onPickUp={isMyTurn ? handlePickUp : undefined}
            canPickUp={isMyTurn}
          />
        </div>
        <div className="gt-right">{renderQuadrant('right')}</div>
        <div className="gt-bottom">{renderQuadrant('bottom')}</div>
      </div>

      {/* ═══ MY HAND DOCK ═══ */}
      {me && !me.isFinished && myZone === 'hand' && (
        <HandDock
          cards={me.cards.hand}
          selectedIds={selectedIds}
          disabledIds={disabledIds}
          onCardClick={handleCardClick}
          isMyTurn={isMyTurn}
        />
      )}

      {/* ═══ GAME LOG OVERLAY ═══ */}
      <GameLog entries={gameLog} visible={showLog} onClose={() => setShowLog(false)} />

      {/* ═══ FACE-DOWN REVEAL NOTIFICATION ═══ */}
      {revealingCard && (
        <div className="reveal-notification">
          <div className="reveal-notification__content">
            <span className="reveal-notification__card">
              {revealingCard.card.rank} of {revealingCard.card.suit}
            </span>
            <span className={`reveal-notification__status ${revealingCard.canPlay ? 'reveal-notification__status--success' : 'reveal-notification__status--fail'}`}>
              {revealingCard.canPlay ? '✓ Playing...' : '✗ Can\'t play — picking up pile!'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});
