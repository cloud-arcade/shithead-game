import { memo, useMemo, useRef, useCallback, useState } from 'react';
import type { Card } from '../../game/types';

/* ═══════════════════════════════════════════════════════
   HAND DOCK — Minimal player hand display
   
   Features:
   - Transparent background (cards float at bottom of screen)
   - Shows top portion of cards for compact display
   - Horizontal touch/drag scrolling
   - Drag & drop cards to play them
   - Floating action buttons
   ═══════════════════════════════════════════════════════ */

interface HandDockProps {
  cards: Card[];
  selectedIds: Set<string>;
  disabledIds: Set<string>;
  onCardClick: (card: Card) => void;
  isMyTurn: boolean;
}

// Sort cards by rank: 2, 3, 4, ... Q, K, A
const RANK_ORDER: Record<string, number> = {
  '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 7,
  '9': 8, '10': 9, 'J': 10, 'Q': 11, 'K': 12, 'A': 13,
};

function sortCardsByRank(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => (RANK_ORDER[a.rank] ?? 0) - (RANK_ORDER[b.rank] ?? 0));
}

function getCardImagePath(card: Card): string {
  const suitFolder = card.suit.toLowerCase();
  const rankFile = card.rank; // Keep rank as-is (files are uppercase for face cards)
  return `/assets/game-assets/cards/${suitFolder}/${rankFile}.png`;
}

export const HandDock = memo(function HandDock({
  cards,
  selectedIds,
  disabledIds,
  onCardClick,
  isMyTurn,
}: HandDockProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isScrollDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const [draggedCard, setDraggedCard] = useState<Card | null>(null);

  // Sort cards by rank
  const sortedCards = useMemo(() => sortCardsByRank(cards), [cards]);

  // Touch/mouse drag scrolling
  const handleScrollMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    // Only start scroll drag if not clicking on a card
    if ((e.target as HTMLElement).closest('.hand-dock__card')) return;
    isScrollDragging.current = true;
    startX.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeft.current = scrollRef.current.scrollLeft;
    scrollRef.current.style.cursor = 'grabbing';
  }, []);

  const handleScrollMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isScrollDragging.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft.current - walk;
  }, []);

  const handleScrollMouseUp = useCallback(() => {
    isScrollDragging.current = false;
    if (scrollRef.current) {
      scrollRef.current.style.cursor = 'grab';
    }
  }, []);

  // Card drag and drop
  const handleCardDragStart = useCallback((e: React.DragEvent, card: Card) => {
    if (!isMyTurn || disabledIds.has(card.id)) {
      e.preventDefault();
      return;
    }
    setDraggedCard(card);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.id);
    // Make the drag image semi-transparent
    if (e.dataTransfer.setDragImage && e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, 30, 50);
    }
  }, [isMyTurn, disabledIds]);

  const handleCardDragEnd = useCallback(() => {
    setDraggedCard(null);
  }, []);

  const handleCardClick = useCallback((card: Card) => {
    // Don't trigger click if we were scrolling or card is disabled
    if (isScrollDragging.current) return;
    if (disabledIds.has(card.id)) return;
    onCardClick(card);
  }, [onCardClick, disabledIds]);

  if (cards.length === 0) {
    return null;
  }

  return (
    <div className="hand-dock">
      {/* Cards container with horizontal scroll */}
      <div
        ref={scrollRef}
        className="hand-dock__cards"
        onMouseDown={handleScrollMouseDown}
        onMouseMove={handleScrollMouseMove}
        onMouseUp={handleScrollMouseUp}
        onMouseLeave={handleScrollMouseUp}
      >
        <div className="hand-dock__cards-inner">
          {sortedCards.map((card) => {
            const isDisabled = disabledIds.has(card.id);
            const isSelected = selectedIds.has(card.id);
            const isDragging = draggedCard?.id === card.id;
            return (
              <button
                key={card.id}
                className={`hand-dock__card ${isSelected ? 'hand-dock__card--selected' : ''} ${isDragging ? 'hand-dock__card--dragging' : ''} ${isDisabled ? 'hand-dock__card--disabled' : ''}`}
                onClick={() => handleCardClick(card)}
                onDragStart={(e) => handleCardDragStart(e, card)}
                onDragEnd={handleCardDragEnd}
                draggable={isMyTurn && !isDisabled}
                type="button"
              >
                <img
                  src={getCardImagePath(card)}
                  alt={`${card.rank} of ${card.suit}`}
                  draggable={false}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default HandDock;
