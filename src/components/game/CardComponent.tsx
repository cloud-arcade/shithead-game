/**
 * CardComponent — Casino-style playing card
 */

import { memo, useState } from 'react';
import type { Card } from '../../game/types';
import { getCardImagePath, getCardBackImagePath } from '../../game/engine';

interface CardProps {
  card: Card;
  faceDown?: boolean;
  selected?: boolean;
  disabled?: boolean;
  small?: boolean;
  onClick?: () => void;
  className?: string;
}

export const CardComponent = memo(function CardComponent({
  card,
  faceDown = false,
  selected = false,
  disabled = false,
  small = false,
  onClick,
  className = '',
}: CardProps) {
  const [imgError, setImgError] = useState(false);
  const src = faceDown ? getCardBackImagePath() : getCardImagePath(card);

  // Landscape-first sizing: small for opponents/compact, normal for player hand
  const sizeClass = small
    ? 'w-7 h-[2.45rem] sm:w-8 sm:h-[2.8rem] md:w-10 md:h-[3.5rem]'
    : 'w-10 h-[3.5rem] sm:w-12 sm:h-[4.2rem] md:w-14 md:h-[4.9rem]';

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`
        relative rounded-md overflow-hidden transition-all duration-200 ease-out card-shadow
        ${sizeClass}
        ${!disabled && onClick ? 'cursor-pointer hover:brightness-110 hover:-translate-y-1 active:scale-95' : 'cursor-default'}
        ${selected ? '-translate-y-2 ring-2 ring-gold-light shadow-[0_0_12px_rgba(240,208,96,0.5)]' : ''}
        ${disabled ? 'opacity-70' : ''}
        ${className}
      `}
    >
      {imgError ? (
        <div className={`w-full h-full flex items-center justify-center rounded-md border ${
          faceDown ? 'border-blue-700 bg-blue-950' : 'border-gray-400 bg-white'
        }`}>
          {faceDown ? (
            <span className="text-[0.5rem] text-blue-300 font-bold">?</span>
          ) : (
            <div className="flex flex-col items-center">
              <span className={`text-[0.55rem] font-bold ${
                card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-gray-900'
              }`}>
                {card.rank}
              </span>
              <span className="text-[0.45rem]">
                {card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠'}
              </span>
            </div>
          )}
        </div>
      ) : (
        <img
          src={src}
          alt={faceDown ? 'Card back' : `${card.rank} of ${card.suit}`}
          className="w-full h-full object-cover rounded-md"
          draggable={false}
          onError={() => setImgError(true)}
        />
      )}
    </button>
  );
});
