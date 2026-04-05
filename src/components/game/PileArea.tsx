/**
 * PileArea — Shows the discard pile and draw pile
 */

import { memo } from 'react';
import type { Card } from '../../game/types';
import { CardComponent } from './CardComponent';

interface PileAreaProps {
  pile: Card[];
  drawPileCount: number;
  burnedCount: number;
}

export const PileArea = memo(function PileArea({ pile, drawPileCount, burnedCount }: PileAreaProps) {
  const topCard = pile.length > 0 ? pile[pile.length - 1] : null;
  const secondCard = pile.length > 1 ? pile[pile.length - 2] : null;

  return (
    <div className="flex items-center justify-center gap-6 sm:gap-10">
      {/* Draw pile */}
      <div className="flex flex-col items-center gap-1">
        <div className="relative w-16 h-[5.6rem] sm:w-20 sm:h-[7rem]">
          {drawPileCount > 0 ? (
            <>
              {/* Stack effect */}
              {drawPileCount > 2 && (
                <div className="absolute top-0.5 left-0.5 w-full h-full rounded-lg bg-blue-900/60 border border-blue-700/30" />
              )}
              {drawPileCount > 1 && (
                <div className="absolute top-[1px] left-[1px] w-full h-full rounded-lg bg-blue-800/60 border border-blue-700/30" />
              )}
              <div className="absolute inset-0 rounded-lg overflow-hidden">
                <img
                  src="/assets/game-assets/cards/spades/S.png"
                  alt="Draw pile"
                  className="w-full h-full object-cover rounded-lg"
                  draggable={false}
                />
              </div>
            </>
          ) : (
            <div className="w-full h-full rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center">
              <span className="text-zinc-600 text-xs">Empty</span>
            </div>
          )}
        </div>
        <span className="text-[0.6rem] text-zinc-500 uppercase tracking-wider">
          Draw ({drawPileCount})
        </span>
      </div>

      {/* Discard pile */}
      <div className="flex flex-col items-center gap-1">
        <div className="relative w-16 h-[5.6rem] sm:w-20 sm:h-[7rem]">
          {topCard ? (
            <>
              {/* Second card peeking underneath */}
              {secondCard && (
                <div className="absolute -rotate-6 top-0 left-0 w-full h-full opacity-40">
                  <CardComponent card={secondCard} disabled />
                </div>
              )}
              <div className="absolute inset-0">
                <CardComponent card={topCard} disabled />
              </div>
              {/* Pile count badge */}
              <div className="absolute -top-1 -right-1 bg-zinc-800 border border-zinc-600 text-white text-[0.55rem] font-bold rounded-full w-5 h-5 flex items-center justify-center z-10">
                {pile.length}
              </div>
            </>
          ) : (
            <div className="w-full h-full rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center">
              <span className="text-zinc-600 text-xs">Empty</span>
            </div>
          )}
        </div>
        <span className="text-[0.6rem] text-zinc-500 uppercase tracking-wider">
          Pile ({pile.length})
        </span>
      </div>

      {/* Burned count indicator */}
      {burnedCount > 0 && (
        <div className="flex flex-col items-center gap-1">
          <div className="w-16 h-[5.6rem] sm:w-20 sm:h-[7rem] rounded-lg bg-orange-900/20 border border-orange-600/20 flex items-center justify-center">
            <span className="text-2xl">🔥</span>
          </div>
          <span className="text-[0.6rem] text-zinc-500 uppercase tracking-wider">
            Burned ({burnedCount})
          </span>
        </div>
      )}
    </div>
  );
});
