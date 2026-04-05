/**
 * PileArea — Draw pile and discard pile, displayed on the table surface
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
    <div className="flex items-center justify-center gap-6 sm:gap-8">
      {/* Draw pile */}
      <div className="flex flex-col items-center gap-0.5">
        <div className="relative w-10 h-[3.5rem] sm:w-12 sm:h-[4.2rem] md:w-14 md:h-[4.9rem]">
          {drawPileCount > 0 ? (
            <>
              {drawPileCount > 2 && (
                <div className="absolute top-[2px] left-[2px] w-full h-full rounded-md bg-blue-950/70" />
              )}
              {drawPileCount > 1 && (
                <div className="absolute top-[1px] left-[1px] w-full h-full rounded-md bg-blue-900/70" />
              )}
              <div className="absolute inset-0 rounded-md overflow-hidden card-shadow">
                <img
                  src="/assets/game-assets/cards/spades/S.png"
                  alt="Draw pile"
                  className="w-full h-full object-cover rounded-md"
                  draggable={false}
                />
              </div>
            </>
          ) : (
            <div className="w-full h-full rounded-md border border-dashed border-white/20 flex items-center justify-center">
              <span className="text-white/20 text-[0.45rem] font-medium">EMPTY</span>
            </div>
          )}
        </div>
        <span className="text-[0.45rem] text-white/40 font-bold uppercase tracking-wider drop-shadow">
          Draw ({drawPileCount})
        </span>
      </div>

      {/* Discard pile */}
      <div className="flex flex-col items-center gap-0.5">
        <div className="relative w-10 h-[3.5rem] sm:w-12 sm:h-[4.2rem] md:w-14 md:h-[4.9rem]">
          {topCard ? (
            <>
              {secondCard && (
                <div className="absolute -rotate-6 top-0 left-0 w-full h-full opacity-30">
                  <CardComponent card={secondCard} disabled />
                </div>
              )}
              <div className="absolute inset-0">
                <CardComponent card={topCard} disabled />
              </div>
              <div className="absolute -top-1.5 -right-1.5 bg-red-700 text-white text-[0.45rem] font-bold rounded-full w-4 h-4 flex items-center justify-center z-10 shadow-md border border-red-500">
                {pile.length}
              </div>
            </>
          ) : (
            <div className="w-full h-full rounded-md border border-dashed border-white/20 flex items-center justify-center">
              <span className="text-white/20 text-[0.45rem] font-medium">EMPTY</span>
            </div>
          )}
        </div>
        <span className="text-[0.45rem] text-white/40 font-bold uppercase tracking-wider drop-shadow">
          Pile ({pile.length})
        </span>
      </div>

      {/* Burned indicator */}
      {burnedCount > 0 && (
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-10 h-[3.5rem] sm:w-12 sm:h-[4.2rem] md:w-14 md:h-[4.9rem] rounded-md bg-orange-900/20 border border-orange-500/20 flex items-center justify-center">
            <span className="text-sm drop-shadow">🔥</span>
          </div>
          <span className="text-[0.45rem] text-white/40 font-bold uppercase tracking-wider drop-shadow">
            Burned ({burnedCount})
          </span>
        </div>
      )}
    </div>
  );
});
