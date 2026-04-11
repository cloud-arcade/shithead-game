/**
 * CardComponent — Shared playing card renderer.
 *
 * Displays card face images from assets, card backs, or empty slot placeholders.
 * Used by GameBoard, SwapPhase, and any other component that renders cards.
 */

import { useState, memo } from 'react';
import type { Card } from '../../game/types';
import { getCardImagePath, getCardBackImagePath } from '../../game/engine';

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const SUIT_COLORS: Record<string, string> = {
  hearts: '#dc2626',
  diamonds: '#dc2626',
  clubs: '#1a1a1a',
  spades: '#1a1a1a',
};

interface CardComponentProps {
  card?: Card;
  faceDown?: boolean;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  empty?: boolean;
  size?: 'small' | 'table' | 'hand' | 'pile';
  className?: string;
}

export const CardComponent = memo(function CardComponent({
  card,
  faceDown,
  selected,
  onClick,
  disabled,
  empty,
  size = 'table',
  className = '',
}: CardComponentProps) {
  const [imgErr, setImgErr] = useState(false);

  if (empty) {
    return <div className={`card card--${size} card--empty ${className}`} />;
  }

  const src = faceDown
    ? getCardBackImagePath()
    : card
    ? getCardImagePath(card)
    : '';

  const isClickable = !!onClick && !disabled;

  const cls = [
    'card',
    `card--${size}`,
    selected && 'card--selected',
    disabled && 'card--disabled',
    isClickable && 'card--clickable',
    faceDown && 'card--facedown',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls} onClick={isClickable ? onClick : undefined}>
      {(card || faceDown) && !imgErr ? (
        <img
          src={src}
          alt={!faceDown && card ? `${card.rank} of ${card.suit}` : 'Card back'}
          onError={() => setImgErr(true)}
          draggable={false}
        />
      ) : card && imgErr ? (
        <div className="card__fallback">
          <span className="card__rank" style={{ color: SUIT_COLORS[card.suit] || '#1a1a1a' }}>
            {card.rank}
          </span>
          <span className="card__suit" style={{ color: SUIT_COLORS[card.suit] || '#1a1a1a' }}>
            {SUIT_SYMBOLS[card.suit] || '?'}
          </span>
        </div>
      ) : null}
    </div>
  );
});
