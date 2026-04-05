/**
 * CardComponent — Renders a single playing card
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

  const sizeClass = small
    ? 'w-8 h-[2.8rem] sm:w-10 sm:h-[3.5rem] md:w-12 md:h-[4.2rem] lg:w-14 lg:h-[4.9rem]'
    : 'w-11 h-[3.85rem] sm:w-14 sm:h-[4.9rem] md:w-16 md:h-[5.6rem] lg:w-20 lg:h-[7rem]';

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`
        relative rounded-lg overflow-hidden transition-all duration-200 ease-out
        ${sizeClass}
        ${!disabled && onClick ? 'cursor-pointer hover:brightness-110 active:scale-95' : 'cursor-default'}
        ${selected ? '-translate-y-2 ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/30' : ''}
        ${disabled ? 'opacity-60' : ''}
        ${className}
      `}
    >
      {imgError ? (
        <div className={`w-full h-full flex items-center justify-center bg-white rounded-lg border-2 ${
          faceDown ? 'border-blue-600 bg-blue-900' : 'border-gray-300'
        }`}>
          {faceDown ? (
            <span className="text-xs text-blue-200 font-bold">?</span>
          ) : (
            <div className="flex flex-col items-center">
              <span className={`text-xs font-bold ${
                card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-gray-900'
              }`}>
                {card.rank}
              </span>
              <span className="text-[0.6rem]">
                {card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠'}
              </span>
            </div>
          )}
        </div>
      ) : (
        <img
          src={src}
          alt={faceDown ? 'Card back' : `${card.rank} of ${card.suit}`}
          className="w-full h-full object-cover rounded-lg"
          draggable={false}
          onError={() => setImgError(true)}
        />
      )}
    </button>
  );
});
